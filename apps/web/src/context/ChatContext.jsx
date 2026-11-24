import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiRequest } from "../api/client";
import { useAuth } from "./AuthContext";
import { useSocket } from "./SocketContext";

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const { on } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  async function loadConversations() {
    if (!user) return;
    try {
      const data = await apiRequest("/chat/conversations");
      setConversations(data);
    } catch {}
  }

  async function loadUnreadCount() {
    if (!user) return;
    try {
      const data = await apiRequest("/chat/unread");
      setUnreadCount(data.count || 0);
    } catch {}
  }

  useEffect(() => {
    if (!user) {
      setConversations([]);
      setUnreadCount(0);
      return;
    }
    loadConversations();
    loadUnreadCount();
  }, [user]);

  // Recebe mensagens em tempo real
  useEffect(() => {
    const unsubscribe = on("chat", ({ conversationId, message }) => {
      setUnreadCount((prev) => prev + 1);
      setConversations((prev) => {
        const exists = prev.find((c) => c.id === conversationId);
        if (exists) {
          return prev.map((c) =>
            c.id === conversationId
              ? { ...c, lastMessage: message, updatedAt: message.createdAt }
              : c
          ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        }
        // Conversa nova — recarrega lista
        loadConversations();
        return prev;
      });
    });
    return unsubscribe;
  }, [on]);

  const decrementUnread = useCallback((amount = 1) => {
    setUnreadCount((prev) => Math.max(0, prev - amount));
  }, []);

  return (
    <ChatContext.Provider value={{ conversations, unreadCount, loadConversations, decrementUnread }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  return useContext(ChatContext);
}
