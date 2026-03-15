const { WebSocketServer } = require("ws");
const jwt = require("jsonwebtoken");

const clients = new Map(); // userId -> WebSocket

function attachWebSocket(server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url, "http://localhost");
    const token = url.searchParams.get("token");

    if (!token) {
      ws.close(4001, "Unauthorized");
      return;
    }

    let userId;
    try {
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      userId = payload.sub;
    } catch {
      ws.close(4001, "Unauthorized");
      return;
    }

    clients.set(userId, ws);

    ws.on("close", () => {
      if (clients.get(userId) === ws) clients.delete(userId);
    });

    ws.on("error", () => {
      if (clients.get(userId) === ws) clients.delete(userId);
    });
  });
}

function sendToUser(userId, payload) {
  const ws = clients.get(userId);
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify(payload));
  }
}

module.exports = { attachWebSocket, sendToUser };
