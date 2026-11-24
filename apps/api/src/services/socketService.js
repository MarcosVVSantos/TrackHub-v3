const { WebSocketServer } = require("ws");
const jwt = require("jsonwebtoken");
const config = require("../config");
const { logSecurityEvent } = require("../utils/securityLog");

const AUTH_TIMEOUT_MS = 5000;
const MAX_TIMER_MS = 2 ** 31 - 1;

// Um usuário pode ter várias conexões abertas (abas, celular e PC).
const clients = new Map(); // userId -> Set<WebSocket>

function addClient(userId, ws) {
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId).add(ws);
}

function removeClient(userId, ws) {
  const sockets = clients.get(userId);
  if (!sockets) return;
  sockets.delete(ws);
  if (!sockets.size) clients.delete(userId);
}

// Fluxo: o navegador conecta em /ws sem token na URL e manda
// { type: "auth", token } como primeira mensagem. Sem isso em 5s, a conexão cai.
// Códigos de fechamento: 4001 token inválido, 4002 token expirou, 4003 não autenticou a tempo.
function attachWebSocket(server) {
  const wss = new WebSocketServer({ server, path: "/ws", maxPayload: 4 * 1024 });

  wss.on("connection", (ws, req) => {
    const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket.remoteAddress;
    let userId = null;
    let expiryTimer = null;

    const authTimer = setTimeout(() => ws.close(4003, "Auth timeout"), AUTH_TIMEOUT_MS);

    ws.on("message", (raw) => {
      if (userId) return; // depois de autenticado, o cliente não envia nada

      let message;
      try {
        message = JSON.parse(raw.toString());
      } catch {
        ws.close(4001, "Unauthorized");
        return;
      }

      if (message?.type !== "auth" || typeof message.token !== "string") {
        ws.close(4001, "Unauthorized");
        return;
      }

      let payload;
      try {
        payload = jwt.verify(message.token, config.jwtAccessSecret);
      } catch (error) {
        // Token só vencido é normal (o front reconecta); qualquer outra falha é suspeita.
        if (error.name !== "TokenExpiredError") logSecurityEvent("ws_auth_failed", { ip, reason: error.message });
        ws.close(4001, "Unauthorized");
        return;
      }

      clearTimeout(authTimer);
      userId = payload.sub;
      addClient(userId, ws);

      // Fecha a conexão quando o token vence; o front reconecta com um token novo.
      if (payload.exp) {
        const msUntilExpiry = Math.max(payload.exp * 1000 - Date.now(), 0);
        expiryTimer = setTimeout(() => ws.close(4002, "Token expired"), Math.min(msUntilExpiry, MAX_TIMER_MS));
      }

      ws.send(JSON.stringify({ type: "auth_ok" }));
    });

    const cleanup = () => {
      clearTimeout(authTimer);
      clearTimeout(expiryTimer);
      if (userId) removeClient(userId, ws);
    };

    ws.on("close", cleanup);
    ws.on("error", cleanup);
  });

  return wss;
}

function sendToUser(userId, payload) {
  const sockets = clients.get(userId);
  if (!sockets) return;
  const data = JSON.stringify(payload);
  for (const ws of sockets) {
    if (ws.readyState === 1) ws.send(data);
  }
}

module.exports = { attachWebSocket, sendToUser };
