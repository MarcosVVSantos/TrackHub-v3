require("dotenv").config();
const http = require("http");
const app = require("./app");
const config = require("./config");
const { attachWebSocket } = require("./services/socketService");

const server = http.createServer(app);
attachWebSocket(server);

server.listen(config.port, () => {
  console.log(`TrackHub API running on port ${config.port}`);
});
