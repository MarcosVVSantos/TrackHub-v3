const express = require("express");
const controller = require("../controllers/authController");
const { authLimiter, refreshLimiter } = require("../middleware/rateLimit");

const router = express.Router();

router.post("/register", authLimiter, controller.register);
router.post("/login", authLimiter, controller.login);
router.post("/refresh", refreshLimiter, controller.refresh);
router.post("/logout", refreshLimiter, controller.logout);

module.exports = router;
