const express = require("express");
const cors = require("cors");
const path = require("path");
const config = require("./config");
const errorHandler = require("./middleware/errorHandler");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const projectRoutes = require("./routes/projects");
const feedRoutes = require("./routes/feed");
const trackRoutes = require("./routes/tracks");
const dashboardRoutes = require("./routes/dashboard");
const notificationRoutes = require("./routes/notifications");
const followRoutes = require("./routes/follows");

const app = express();

app.use(cors({ origin: config.webUrl, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(`/uploads`, express.static(path.join(config.rootDir, config.uploadDir)));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/projects", projectRoutes);
app.use("/feed", feedRoutes);
app.use("/tracks", trackRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/notifications", notificationRoutes);
app.use("/follows", followRoutes);

app.use(errorHandler);

module.exports = app;
