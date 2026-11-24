import * as Sentry from "@sentry/react";

// Erros do navegador vão para o Sentry. Só liga com VITE_SENTRY_DSN definido,
// então em desenvolvimento (sem a chave) nada é enviado.
const DSN = import.meta.env.VITE_SENTRY_DSN;

export const monitoringEnabled = Boolean(DSN);

export function initMonitoring() {
  if (!DSN) return;
  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
    // A Vercel informa o commit do deploy no build.
    release: import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA || undefined,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    // Erros de extensões do navegador e de rede instável não são bugs do TrackHub.
    ignoreErrors: ["ResizeObserver loop", "Failed to fetch", "NetworkError", "Load failed"],
    denyUrls: [/extensions\//i, /^chrome:\/\//i, /^moz-extension:\/\//i],
  });
}

export function setMonitoringUser(user) {
  if (!DSN) return;
  Sentry.setUser(user?.id ? { id: user.id } : null);
}

export function captureError(error, context) {
  if (!DSN) return;
  Sentry.withScope((scope) => {
    if (context?.requestId) scope.setTag("request_id", context.requestId);
    if (context) scope.setExtras(context);
    Sentry.captureException(error);
  });
}

export const ErrorBoundary = Sentry.ErrorBoundary;
