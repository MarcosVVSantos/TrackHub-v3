import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { apiRequest, getAccessToken } from "../api/client";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const { user, setUser } = useAuth() || {};
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    if (user?.theme) {
      setTheme(user.theme);
    }
  }, [user]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  async function applyTheme(next) {
    setTheme(next);

    const token = getAccessToken();
    if (token && setUser) {
      const updated = await apiRequest("/users/me", {
        method: "PUT",
        body: { theme: next },
        token,
      });
      setUser(updated);
    }
  }

  async function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    await applyTheme(next);
  }

  const value = useMemo(() => ({ theme, toggleTheme, setTheme: applyTheme }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
