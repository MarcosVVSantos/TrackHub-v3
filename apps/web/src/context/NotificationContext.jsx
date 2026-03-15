import { createContext, useContext, useEffect, useRef, useState } from "react";
import { apiRequest, getAccessToken } from "../api/client";
import { useAuth } from "./AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const wsRef = useRef(null);

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
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    loadNotifications();

    const token = getAccessToken();
    if (!token) return;

    const wsUrl = API_URL.replace(/^https/, "wss").replace(/^http/, "ws");
    const ws = new WebSocket(`${wsUrl}/ws?token=${token}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "notification") {
          setNotifications((prev) => [msg.data, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      } catch {}
    };

    ws.onerror = () => {};

    return () => {
      ws.close();
    };
  }, [user]);

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
