require("dotenv").config();
const http = require("http");
const app = require("./app");
const config = require("./config");

const server = http.createServer(app);

server.listen(config.port, () => {
  console.log(`TrackHub API running on port ${config.port}`);
});
