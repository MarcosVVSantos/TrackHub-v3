const express = require("express");
const authenticate = require("../middleware/auth");
const planGate = require("../middleware/planGate");
const controller = require("../controllers/eventController");
const { rateLimit } = require("../middleware/rateLimit");

const router = express.Router();

// Cada atração adicionada pode gerar uma notificação para outra pessoa.
// Este limite por usuário evita usar o line-up para mandar avisos em massa.
const lineupAddLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  keyGenerator: (req) => `lineup:${req.user?.sub || req.ip}`,
  message: "Muitas atrações adicionadas em pouco tempo. Espere alguns minutos.",
});

// Criar evento também tem limite (além do limite do plano), contra criação automatizada.
const createEventLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => `event-create:${req.user?.sub || req.ip}`,
  message: "Muitos eventos criados em pouco tempo. Tente mais tarde.",
});

router.use(authenticate);

// Lado do artista convidado (precisa vir antes de "/:id").
router.get("/lineup-invites", controller.listMyLineupInvites);
router.post("/lineup-invites/:slotId/respond", controller.respondToLineup);

// Eventos contam no mesmo limite de projetos do plano.
router.get("/", controller.listEvents);
router.post("/", createEventLimiter, planGate("project"), controller.createEvent);
router.get("/:id", controller.getEvent);
router.put("/:id", controller.updateEvent);
router.delete("/:id", controller.archiveEvent);

// Line-up. Checklist, cronograma, arquivos e equipe usam as rotas de projeto que já existem
// (/projects/:id/tasks, /calendar, /projects/:id/files, /projects/:id/invite).
router.post("/:id/lineup", lineupAddLimiter, controller.addSlot);
router.put("/:id/lineup/order", controller.reorderLineup);
router.patch("/:id/lineup/:slotId", controller.updateSlot);
router.delete("/:id/lineup/:slotId", controller.removeSlot);

module.exports = router;
