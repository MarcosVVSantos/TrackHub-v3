require("dotenv").config();
const { captureException, flush } = require("./instrument");
const http = require("http");
const app = require("./app");
const config = require("./config");
const logger = require("./utils/logger");
const prisma = require("./lib/prisma");
const { attachWebSocket } = require("./services/socketService");

const server = http.createServer(app);
attachWebSocket(server);

server.listen(config.port, () => {
  logger.info("server_started", {
    port: Number(config.port),
    env: process.env.NODE_ENV || "development",
    commit: process.env.RENDER_GIT_COMMIT,
  });
});

// Erros que escapam de tudo: registra, manda pro Sentry e, no caso de exceção, encerra
// para o Render reiniciar o processo num estado limpo.
process.on("unhandledRejection", (reason) => {
  logger.error("unhandled_rejection", { error: reason });
  captureException(reason instanceof Error ? reason : new Error(String(reason)));
});

process.on("uncaughtException", async (error) => {
  logger.error("uncaught_exception", { error });
  captureException(error);
  await flush();
  process.exit(1);
});

// O Render manda SIGTERM antes de trocar a versão no deploy: fecha conexões com calma.
process.on("SIGTERM", () => {
  logger.info("server_stopping", { reason: "SIGTERM" });
  server.close(async () => {
    await prisma.$disconnect().catch(() => null);
    await flush();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 10000).unref();
});
