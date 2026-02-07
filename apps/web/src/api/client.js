export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export async function apiRequest(path, { method = "GET", body, token } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Erro" }));
    throw new Error(error.message || "Erro inesperado");
  }

  return response.json();
}

export function getAccessToken() {
  return localStorage.getItem("trackhub_access");
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
