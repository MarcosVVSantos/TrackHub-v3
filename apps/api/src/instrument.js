// Monitoramento de erros com Sentry. Só liga quando SENTRY_DSN estiver definido.
const logger = require("./utils/logger");

let Sentry = null;

// Erros que o errorHandler transforma em 400 com mensagem amigável.
const EXPECTED_ERROR_NAMES = new Set(["ZodError", "MulterError"]);

if (process.env.SENTRY_DSN) {
  try {
    Sentry = require("@sentry/node");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || "development",
      // O Render informa o commit do deploy; assim o Sentry mostra em qual versão o erro apareceu.
      release: process.env.RENDER_GIT_COMMIT || undefined,
      tracesSampleRate: 0.1,
      sendDefaultPii: false,
      // A integração do Express manda para o Sentry todo erro que passa por next(),
      // inclusive os que já viram resposta 4xx (validação, upload inválido, sem permissão).
      // Esses são "uso normal", não bugs: só poluem o painel. Ficam no log do Render.
      beforeSend(event, hint) {
        const error = hint?.originalException;
        if (error && typeof error === "object") {
          if (EXPECTED_ERROR_NAMES.has(error.name)) return null;
          if (Number.isInteger(error.status) && error.status < 500) return null;
          if (error.type === "entity.parse.failed" || error.type === "entity.too.large") return null;
        }
        return event;
      },
    });
  } catch (error) {
    logger.warn("sentry_unavailable", { reason: "SENTRY_DSN definido, mas @sentry/node não está instalado" });
    Sentry = null;
  }
}

// context: { requestId, userId, method, path, ...extras }
function captureException(error, context = {}) {
  if (!Sentry) return;
  const { requestId, userId, ...extra } = context;
  Sentry.withScope((scope) => {
    if (requestId) scope.setTag("request_id", requestId);
    if (userId) scope.setUser({ id: userId });
    scope.setExtras(extra);
    Sentry.captureException(error);
  });
}

async function flush(timeoutMs = 2000) {
  if (Sentry) await Sentry.flush(timeoutMs).catch(() => null);
}

module.exports = { captureException, flush };
