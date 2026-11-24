const { randomUUID } = require("crypto");
const logger = require("../utils/logger");

const SKIP_PATHS = new Set(["/health"]);
const VALID_ID = /^[A-Za-z0-9-]{8,64}$/;

// Dá a cada requisição um ID (devolvido no cabeçalho X-Request-Id e nas respostas de erro)
// e registra uma linha de log quando ela termina: método, rota, status e duração.
function requestContext(req, res, next) {
  const incoming = req.headers["x-request-id"];
  req.id = typeof incoming === "string" && VALID_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader("X-Request-Id", req.id);

  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    if (SKIP_PATHS.has(req.path)) return;
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
    logger[level]("request", {
      requestId: req.id,
      method: req.method,
      // Só o caminho, sem query string (que pode conter dados do usuário).
      path: req.originalUrl.split("?")[0],
      route: req.route?.path ? `${req.baseUrl}${req.route.path}` : undefined,
      status: res.statusCode,
      durationMs: Math.round(durationMs),
      userId: req.user?.sub,
      ip: req.ip,
      cfRay: req.headers["cf-ray"],
    });
  });

  next();
}

module.exports = requestContext;
