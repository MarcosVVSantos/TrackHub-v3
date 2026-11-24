const path = require("path");

const config = {
  port: process.env.PORT || 4000,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || "access_secret",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "refresh_secret",
  jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES || "15m",
  jwtRefreshExpires: process.env.JWT_REFRESH_EXPIRES || "7d",
  uploadDir: process.env.UPLOAD_DIR || "uploads",
  publicUrl: process.env.PUBLIC_URL || "http://localhost:4000",
  webUrl: process.env.WEB_URL || "http://localhost:5173",
  rootDir: path.resolve(__dirname, ".."),
};

if (process.env.NODE_ENV === "production") {
  const missing = ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "DATABASE_URL"].filter(
    (name) => !process.env[name]
  );
  if (missing.length) {
    throw new Error(`Variáveis de ambiente obrigatórias ausentes: ${missing.join(", ")}`);
  }
}

module.exports = config;
