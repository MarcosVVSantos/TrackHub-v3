const express = require("express");
const cors = require("cors");
const config = require("./config");
const errorHandler = require("./middleware/errorHandler");
const securityHeaders = require("./middleware/securityHeaders");
const requestContext = require("./middleware/requestContext");
const healthRoutes = require("./routes/health");
const { limitWrites } = require("./middleware/rateLimit");

// O Prisma devolve colunas BigInt (ex.: sizeBytes); sem isto o res.json quebra.
if (!BigInt.prototype.toJSON) {
  BigInt.prototype.toJSON = function toJSON() {
    return Number(this);
  };
}

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const projectRoutes = require("./routes/projects");
const feedRoutes = require("./routes/feed");
const trackRoutes = require("./routes/tracks");
const dashboardRoutes = require("./routes/dashboard");
const notificationRoutes = require("./routes/notifications");
const followRoutes = require("./routes/follows");
const profileRoutes = require("./routes/profiles");
const calendarRoutes = require("./routes/calendar");
const commentRoutes = require("./routes/comments");
const chatRoutes = require("./routes/chat");
const playlistRoutes = require("./routes/playlists");
const planRoutes = require("./routes/plan");

const app = express();

// Em produção a API fica atrás do proxy da hospedagem; isso faz o req.ip
// ser o IP real do usuário (usado pelo limitador de requisições).
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.disable("x-powered-by");
app.use(requestContext);
app.use(securityHeaders);
app.use(cors({ origin: config.webUrl, credentials: true, exposedHeaders: ["X-Request-Id"] }));
app.use(express.json({ limit: "1mb" }));
app.use(limitWrites);

app.use(healthRoutes);

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/projects", projectRoutes);
app.use("/feed", feedRoutes);
app.use("/tracks", trackRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/notifications", notificationRoutes);
app.use("/follows", followRoutes);
app.use("/profiles", profileRoutes);
app.use("/calendar", calendarRoutes);
app.use("/comments", commentRoutes);
app.use("/chat", chatRoutes);
app.use("/playlists", playlistRoutes);
app.use("/plan", planRoutes);

app.use(errorHandler);

module.exports = app;
