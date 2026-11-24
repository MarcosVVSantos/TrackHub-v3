// Monitoramento de erros com Sentry. Só liga quando SENTRY_DSN estiver definido.
const logger = require("./utils/logger");

let Sentry = null;

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
