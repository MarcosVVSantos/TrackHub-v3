import * as Sentry from "@sentry/react";

// Erros do navegador vão para o Sentry. Só liga com VITE_SENTRY_DSN definido,
// então em desenvolvimento (sem a chave) nada é enviado.
// No `npm run dev` fica desligado (o painel mostra só erros do site publicado).
// Para testar localmente, defina VITE_SENTRY_ENABLE_DEV=true no apps/web/.env.
const DSN =
  import.meta.env.PROD || import.meta.env.VITE_SENTRY_ENABLE_DEV === "true" ? import.meta.env.VITE_SENTRY_DSN : undefined;

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
    if (context?.feature) scope.setTag("feature", context.feature);
    if (context) scope.setExtras(context);
    Sentry.captureException(error);
  });
}

// Links assinados do R2 levam a "senha" temporária na query string: nunca mandamos isso ao Sentry.
export function safeUrl(url) {
  if (!url || typeof url !== "string") return url;
  if (url.startsWith("blob:")) return "blob:";
  try {
    const parsed = new URL(url, window.location.origin);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return "url-invalida";
  }
}

// Problemas que acontecem só no navegador e não viram erro na API: o áudio não toca,
// o upload cai no meio, etc. O "Failed to fetch" genérico é ignorado no Sentry (é ruído
// de rede ruim), então aqui embrulhamos num erro com nome próprio e uma tag "feature"
// (player, upload, feed...) para dar para filtrar no painel.
export function reportProblem(feature, message, extra = {}) {
  if (!DSN) {
    if (import.meta.env.DEV) console.warn(`[${feature}] ${message}`, extra);
    return;
  }
  const error = new Error(`[${feature}] ${message}`);
  error.name = "TrackHubProblem";
  captureError(error, { feature, ...extra });
}

export const ErrorBoundary = Sentry.ErrorBoundary;
