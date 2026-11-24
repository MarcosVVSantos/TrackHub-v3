/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  // O app agora é só tema escuro: a classe "dark" fica sempre ligada no <html>.
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter Variable", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        // Paleta do redesign
        th: {
          bg: "#141217",
          sidebar: "#0E0D11",
          surface: "#1D1A22",
          raised: "#2C2833",
          line: "#2C2833",
          line2: "#3D3746",
          hover: "#4A4058",
          text: "#F4F2F6",
          text2: "#CFCAD6",
          muted: "#A39DAD",
          link: "#AEB9DE",
          linkHover: "#D3DAF0",
          lilac: "#D9B8E3",
          accent: "#8796C4",
          warn: "#E0A458",
          danger: "#F08A8A",
        },
        // Etapas da faixa
        stage: {
          idea: "#AEB9DE",
          progress: "#E9B872",
          production: "#D49AE6",
          finished: "#7ED6A2",
        },
        // Mantidos para telas antigas: agora apontam para a paleta escura nova.
        brand: {
          primary: "#8E6BB8",
          accent: "#8796C4",
          dark: "#141217",
          darkSecondary: "#1D1A22",
          darkOutline: "#2C2833",
          text: "#F4F2F6",
          textMuted: "#CFCAD6",
        },
      },
    },
  },
  plugins: [],
};
