import { createContext, useContext, useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import { useAuth } from "./AuthContext";
import { useSocket } from "./SocketContext";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const { on } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadNotifications() {
    if (!user) return;
    try {
      setLoading(true);
      setError("");
      const data = await apiRequest("/notifications");
      setNotifications(data.items || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleReadAll() {
    await apiRequest("/notifications/read-all", { method: "PUT" });
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() }))
    );
    setUnreadCount(0);
  }

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    loadNotifications();
  }, [user]);

  useEffect(() => {
    const unsubscribe = on("notification", (data) => {
      setNotifications((prev) => [data, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });
    return unsubscribe;
  }, [on]);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, loading, error, loadNotifications, handleReadAll, setUnreadCount, setNotifications }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
