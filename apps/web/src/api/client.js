import { trackApiSuccess, track } from "../lib/analytics";
import { captureError } from "../lib/monitoring";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export function getAccessToken() {
  return localStorage.getItem("trackhub_access");
}

export function getRefreshToken() {
  return localStorage.getItem("trackhub_refresh");
}

export function setAccessToken(token) {
  localStorage.setItem("trackhub_access", token);
}

export function setRefreshToken(token) {
  localStorage.setItem("trackhub_refresh", token);
}

export function clearTokens() {
  localStorage.removeItem("trackhub_access");
  localStorage.removeItem("trackhub_refresh");
}

// Várias requisições podem receber 401 ao mesmo tempo. Todas esperam a MESMA renovação,
// porque o servidor troca o refresh token a cada uso e um token já trocado não vale mais.
let refreshInFlight = null;

function tryRefresh() {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export async function revokeSession() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return;
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // Mesmo sem rede, os tokens locais são apagados no logout.
  }
}

async function doRefresh() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    setAccessToken(data.accessToken);
    if (data.refreshToken) setRefreshToken(data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

function tokenExpiresSoon(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return !payload.exp || payload.exp * 1000 - Date.now() < 30000;
  } catch {
    return true;
  }
}

// Devolve um access token válido, renovando com o refresh token se estiver perto de vencer.
export async function getFreshAccessToken() {
  const token = getAccessToken();
  if (token && !tokenExpiresSoon(token)) return token;
  return tryRefresh();
}

export async function apiRequest(path, { method = "GET", body, token } = {}) {
  const accessToken = token || getAccessToken();

  const doFetch = (t) =>
    fetch(`${API_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

  let response = await doFetch(accessToken);

  // Login, cadastro e "esqueci a senha" respondem 401 por senha errada, não por sessão vencida:
  // nessas rotas o erro tem que chegar na tela (antes a página recarregava e a mensagem sumia).
  const isAuthRoute = path.startsWith("/auth/");

  if (response.status === 401 && !token && !isAuthRoute) {
    const newToken = await tryRefresh();
    if (newToken) {
      response = await doFetch(newToken);
    } else {
      clearTokens();
      window.location.href = "/login";
      throw new Error("Sessão expirada");
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Erro" }));
    if (error.code === "PLAN_LIMIT_REACHED") {
      track("limite_do_plano_atingido", error.details);
    }
    // Em erro 500 a API manda um requestId; mostramos um pedaço dele para o usuário
    // poder te informar, e você acha o caso no log do Render e no Sentry.
    const reference = error.requestId ? ` (código ${error.requestId.slice(0, 8)})` : "";
    const failure = new Error(`${error.message || "Erro inesperado"}${reference}`);
    failure.code = error.code;
    failure.details = error.details;
    failure.status = response.status;
    failure.requestId = error.requestId || response.headers.get("X-Request-Id");
    if (response.status >= 500) {
      captureError(failure, { requestId: failure.requestId, path, method, status: response.status });
    }
    throw failure;
  }

  trackApiSuccess(method, path);
  return response.json();
}

// Upload com FormData (arquivos). Usa o mesmo esquema de renovação de sessão do apiRequest.
export async function apiUpload(path, formData) {
  const send = (token) =>
    fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

  let response = await send(await getFreshAccessToken());
  if (response.status === 401) {
    const newToken = await tryRefresh();
    if (!newToken) {
      clearTokens();
      window.location.href = "/login";
      throw new Error("Sessão expirada");
    }
    response = await send(newToken);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (data.code === "PLAN_LIMIT_REACHED") track("limite_do_plano_atingido", data.details);
    const reference = data.requestId ? ` (código ${data.requestId.slice(0, 8)})` : "";
    const failure = new Error(`${data.message || "Erro no envio"}${reference}`);
    failure.code = data.code;
    failure.status = response.status;
    if (response.status >= 500) captureError(failure, { requestId: data.requestId, path });
    throw failure;
  }
  return data;
}
