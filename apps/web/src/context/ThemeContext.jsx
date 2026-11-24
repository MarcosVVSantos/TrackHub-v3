import { createContext, useContext, useEffect, useMemo } from "react";

// O TrackHub agora usa só o tema escuro. O contexto continua existindo para
// não quebrar quem ainda chama useTheme(), mas não troca mais nada.
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const value = useMemo(() => ({ theme: "dark", toggleTheme: () => {}, setTheme: () => {} }), []);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
