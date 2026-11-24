import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Send, MessageCircle, ArrowLeft, Loader2 } from "lucide-react";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { useSocket } from "../context/SocketContext";

function Avatar({ user, size = "md" }) {
  const initials = user?.name
    ? user.name.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase()
    : "?";
  const cls = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  return user?.avatarUrl ? (
    <img src={user.avatarUrl} alt={user.name} className={`${cls} rounded-full object-cover shrink-0`} />
  ) : (
    <div className={`${cls} rounded-full bg-th-accent/30 flex items-center justify-center font-semibold text-th-lilac shrink-0`}>
      {initials}
    </div>
  );
}

function ConversationItem({ conv, isActive, onClick }) {
  const hasUnread = conv.lastMessage && !conv.lastMessage.readAt && conv.lastMessage.sender?.id !== conv.other?.id;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition hover:bg-th-raised  ${
        isActive ? "bg-th-raised " : ""
      }`}
    >
      <Avatar user={conv.other} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm text-th-text truncate">
            {conv.other?.name}
          </span>
          {conv.lastMessage && (
            <span className="text-xs text-th-muted shrink-0">
              {new Date(conv.lastMessage.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
        <p className={`text-xs truncate mt-0.5 ${hasUnread ? "font-semibold text-th-text " : "text-th-muted "}`}>
          {conv.lastMessage?.content || "Iniciar conversa"}
        </p>
      </div>
    </button>
  );
}

function MessageBubble({ message, isOwn }) {
  return (
    <div className={`flex items-end gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
      {!isOwn && <Avatar user={message.sender} size="sm" />}
      <div
        className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
          isOwn
            ? "bg-th-lilac text-th-bg rounded-br-sm"
            : "bg-th-raised  text-th-text  rounded-bl-sm"
        }`}
      >
        {message.content}
        <span className={`block text-xs mt-1 ${isOwn ? "text-th-lilac" : "text-th-muted"}`}>
          {new Date(message.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

export default function Chat() {
  const { user } = useAuth();
  const { conversations, loadConversations, decrementUnread } = useChat();
  const { on } = useSocket();
  const [searchParams, setSearchParams] = useSearchParams();
  const [chatableUsers, setChatableUsers] = useState([]);
  const [activeUserId, setActiveUserId] = useState(searchParams.get("with") || null);
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [mobileShowConv, setMobileShowConv] = useState(!activeUserId);
  const bottomRef = useRef(null);

  useEffect(() => {
    apiRequest("/chat/users")
      .then(setChatableUsers)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeUserId) return;
    loadMessages(activeUserId);
    const found = chatableUsers.find((u) => u.id === activeUserId);
    if (found) setActiveUser(found);
  }, [activeUserId]);

  // Recebe mensagens em tempo real dentro da conversa aberta
  useEffect(() => {
    const unsubscribe = on("chat", ({ conversationId: incomingConvId, message }) => {
      if (incomingConvId === conversationId) {
        setMessages((prev) => [...prev, message]);
        // Marca como lida automaticamente se a conversa está aberta
        if (activeUserId) {
          apiRequest(`/chat/conversations/${activeUserId}/read`, { method: "PUT" }).catch(() => {});
        }
      }
    });
    return unsubscribe;
  }, [on, conversationId, activeUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadMessages(targetId) {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest(`/chat/conversations/${targetId}`);
      setMessages(data.messages || []);
      setConversationId(data.conversationId);
      // Marca como lido ao abrir
      await apiRequest(`/chat/conversations/${targetId}/read`, { method: "PUT" }).catch(() => {});
      decrementUnread(data.messages.filter((m) => m.senderId !== user?.id && !m.readAt).length);
      loadConversations();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function openConversation(targetUser) {
    setActiveUserId(targetUser.id);
    setActiveUser(targetUser);
    setSearchParams({ with: targetUser.id });
    setMobileShowConv(false);
    setMessages([]);
    setConversationId(null);
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || !activeUserId || sending) return;

    const content = input.trim();
    setInput("");
    setSending(true);
    try {
      const message = await apiRequest(`/chat/conversations/${activeUserId}`, {
        method: "POST",
        body: { content },
      });
      setMessages((prev) => [...prev, message]);
      loadConversations();
    } catch (err) {
      setError(err.message);
      setInput(content);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  }

  const allContacts = [
    ...conversations.map((c) => c.other),
    ...chatableUsers.filter((u) => !conversations.find((c) => c.other?.id === u.id)),
  ].filter(Boolean);

  return (
    <div className="mx-4 mt-6 flex h-[calc(100vh-200px)] overflow-hidden rounded-2xl border border-th-line bg-th-surface sm:mx-6 lg:mx-10 lg:h-[calc(100vh-140px)] xl:mx-auto xl:max-w-[1240px]">

      {/* Sidebar de conversas */}
      <div className={`w-full md:w-72 shrink-0 border-r border-th-line  flex flex-col ${!mobileShowConv ? "hidden md:flex" : "flex"}`}>
        <div className="px-4 py-4 border-b border-th-line">
          <h2 className="font-semibold text-th-text">Mensagens</h2>
          <p className="text-xs text-th-muted mt-0.5">Seguidores mútuos</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {allContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
              <MessageCircle size={32} className="text-th-muted" />
              <p className="text-sm text-th-muted">
                Nenhum contato ainda. Siga alguém e espere ser seguido de volta para iniciar uma conversa.
              </p>
            </div>
          ) : (
            allContacts.map((contact) => {
              const conv = conversations.find((c) => c.other?.id === contact.id);
              return (
                <ConversationItem
                  key={contact.id}
                  conv={conv || { other: contact, lastMessage: null }}
                  isActive={activeUserId === contact.id}
                  onClick={() => openConversation(contact)}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Área de mensagens */}
      <div className={`flex-1 flex flex-col ${mobileShowConv ? "hidden md:flex" : "flex"}`}>
        {!activeUserId ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
            <MessageCircle size={40} className="text-th-muted" />
            <p className="text-th-muted text-sm">
              Selecione uma conversa para começar
            </p>
          </div>
        ) : (
          <>
            {/* Header da conversa */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-th-line shrink-0">
              <button
                className="md:hidden text-th-muted"
                onClick={() => setMobileShowConv(true)}
              >
                <ArrowLeft size={20} />
              </button>
              {activeUser && <Avatar user={activeUser} />}
              <div>
                <p className="font-semibold text-sm text-th-text">
                  {activeUser?.name}
                </p>
                <p className="text-xs text-th-muted">@{activeUser?.username}</p>
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {loading && (
                <div className="flex justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-th-muted" />
                </div>
              )}
              {error && (
                <p className="text-center text-sm text-th-danger">{error}</p>
              )}
              {!loading && messages.length === 0 && (
                <p className="text-center text-sm text-th-muted py-8">
                  Nenhuma mensagem ainda. Diga oi!
                </p>
              )}
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={msg.senderId === user?.id}
                />
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={handleSend}
              className="flex items-end gap-2 px-4 py-3 border-t border-th-line shrink-0"
            >
              <textarea
                className="flex-1 resize-none rounded-xl border border-th-line bg-th-raised px-4 py-2.5 text-sm text-th-text placeholder-th-muted focus:outline-none focus:ring-2 focus:ring-th-accent max-h-32"
                placeholder="Escreva uma mensagem..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                maxLength={1000}
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-th-surface hover:bg-th-text2 disabled:opacity-40 disabled:cursor-not-allowed text-th-bg transition shrink-0"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
