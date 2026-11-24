import { createContext, useContext, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import { getFreshAccessToken, API_URL } from "../api/client";

const SocketContext = createContext(null);

const WS_URL = `${API_URL.replace(/^https/, "wss").replace(/^http/, "ws")}/ws`;
const MAX_RETRY_DELAY_MS = 30000;

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const wsRef = useRef(null);
  const handlersRef = useRef(new Map()); // type -> Set<handler>

  function on(type, handler) {
    if (!handlersRef.current.has(type)) {
      handlersRef.current.set(type, new Set());
    }
    handlersRef.current.get(type).add(handler);
    return () => {
      handlersRef.current.get(type)?.delete(handler);
    };
  }

  useEffect(() => {
    if (!user) {
      wsRef.current?.close();
      wsRef.current = null;
      return undefined;
    }

    let stopped = false;
    let retries = 0;
    let retryTimer = null;

    async function connect() {
      const token = await getFreshAccessToken();
      if (stopped || !token) return;

      // O token vai na primeira mensagem, não na URL (URLs aparecem em logs).
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "auth", token }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "auth_ok") {
            retries = 0;
            return;
          }
          const handlers = handlersRef.current.get(msg.type);
          if (handlers) {
            handlers.forEach((h) => h(msg.data));
          }
        } catch {}
      };

      ws.onerror = () => {};

      ws.onclose = (event) => {
        if (wsRef.current === ws) wsRef.current = null;
        if (stopped) return;
        // Token expirou: reconecta já, com token renovado. Outras quedas: espera crescente.
        const delay =
          event.code === 4002 ? 0 : Math.min(1000 * 2 ** retries, MAX_RETRY_DELAY_MS);
        retries += 1;
        retryTimer = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      stopped = true;
      clearTimeout(retryTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ on }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
