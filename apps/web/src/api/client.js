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

async function tryRefresh() {
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

  if (response.status === 401 && !token) {
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
    throw new Error(error.message || "Erro inesperado");
  }

  return response.json();
}
