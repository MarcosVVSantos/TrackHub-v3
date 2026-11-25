import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        // Bibliotecas grandes em arquivos próprios: mudam pouco, então o navegador
        // guarda em cache entre um deploy e outro.
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          sentry: ["@sentry/react"],
          charts: ["recharts"],
        },
      },
    },
  },
});
