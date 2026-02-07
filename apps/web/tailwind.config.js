/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#5B1669",
          accent: "#8796C4",
          dark: "#230B38",
          darkSecondary: "#2E134A",
          darkOutline: "#3B1B5A",
          text: "#F3EDF7",
          textMuted: "#CBBFD6",
        },
      },
    },
  },
  plugins: [],
};
