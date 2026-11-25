const express = require("express");
const controller = require("../controllers/authController");
const { authLimiter, refreshLimiter, rateLimit } = require("../middleware/rateLimit");

// Pedido de link: no máximo 5 a cada 15 min por IP (cada pedido pode gerar um e-mail).
const forgotLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: "Muitas tentativas. Aguarde alguns minutos e tente de novo." });

const router = express.Router();

router.post("/register", authLimiter, controller.register);
router.post("/login", authLimiter, controller.login);
router.post("/forgot-password", forgotLimiter, controller.forgotPassword);
router.post("/reset-password", authLimiter, controller.resetPassword);
router.post("/refresh", refreshLimiter, controller.refresh);
router.post("/logout", refreshLimiter, controller.logout);

module.exports = router;
