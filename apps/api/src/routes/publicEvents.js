const express = require("express");
const authenticate = require("../middleware/auth");
const optionalAuth = require("../middleware/optionalAuth");
const { rateLimit } = require("../middleware/rateLimit");
const controller = require("../controllers/eventController");

// Rotas abertas da página pública do evento (/e/<slug> no site).
const router = express.Router();

// Leitura sem login: limite por IP para segurar robôs varrendo endereços.
const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => `public-event:${req.ip}`,
  message: "Muitas visitas em pouco tempo. Espere um minuto.",
});

// Inscrição exige login e tem limite por pessoa (cada uma só se inscreve uma vez por evento,
// mas o limite também segura quem tenta em dezenas de eventos de uma vez).
const applyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => `apply:${req.user?.sub || req.ip}`,
  message: "Muitas inscrições em pouco tempo. Tente mais tarde.",
});

router.get("/:slug", readLimiter, optionalAuth, controller.getPublicEvent);
router.post("/:slug/apply", authenticate, applyLimiter, controller.apply);

module.exports = router;
