const express = require("express");
const authenticate = require("../middleware/auth");
const planGate = require("../middleware/planGate");
const controller = require("../controllers/eventController");

const router = express.Router();

router.use(authenticate);

// Lado do artista convidado (precisa vir antes de "/:id").
router.get("/lineup-invites", controller.listMyLineupInvites);
router.post("/lineup-invites/:slotId/respond", controller.respondToLineup);

// Eventos contam no mesmo limite de projetos do plano.
router.get("/", controller.listEvents);
router.post("/", planGate("project"), controller.createEvent);
router.get("/:id", controller.getEvent);
router.put("/:id", controller.updateEvent);
router.delete("/:id", controller.archiveEvent);

// Line-up. Checklist, cronograma, arquivos e equipe usam as rotas de projeto que já existem
// (/projects/:id/tasks, /calendar, /projects/:id/files, /projects/:id/invite).
router.post("/:id/lineup", controller.addSlot);
router.put("/:id/lineup/order", controller.reorderLineup);
router.patch("/:id/lineup/:slotId", controller.updateSlot);
router.delete("/:id/lineup/:slotId", controller.removeSlot);

module.exports = router;
