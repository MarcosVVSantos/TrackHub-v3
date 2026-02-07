import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest, clearTokens, getAccessToken, setAccessToken, setRefreshToken } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadUser() {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await apiRequest("/users/me", { token });
      setUser(data);
    } catch (error) {
      clearTokens();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUser();
  }, []);

  async function login(payload) {
    const data = await apiRequest("/auth/login", { method: "POST", body: payload });
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    setUser(data.user);
  }

  async function register(payload) {
    const data = await apiRequest("/auth/register", { method: "POST", body: payload });
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    setUser(data.user);
  }

  function logout() {
    clearTokens();
    setUser(null);
  }

  const value = useMemo(() => ({ user, loading, login, register, logout, setUser }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
