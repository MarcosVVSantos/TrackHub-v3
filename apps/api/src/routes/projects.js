const express = require("express");
const multer = require("multer");
const authenticate = require("../middleware/auth");
const controller = require("../controllers/projectController");
const planGate = require("../middleware/planGate");
const { requireProjectRole } = require("../services/accessService");

const router = express.Router();

const fileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024, files: 1 },
});

const coverUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

const projectFromParams = (req) => ({ projectId: req.params.id });
const incomingUpload = (req) => ({ projectId: req.params.id, incomingBytes: req.file?.size || 0 });

router.post("/", authenticate, planGate("project"), controller.createProject);
router.get("/tags", authenticate, controller.listTags);
router.get("/invites", authenticate, controller.listInvites);
router.post("/invites/:inviteId/accept", authenticate, controller.acceptInvite);
router.post("/invites/:inviteId/decline", authenticate, controller.declineInvite);
router.get("/", authenticate, controller.listProjects);
router.get("/:id", authenticate, controller.getProject);
router.put("/:id", authenticate, controller.updateProject);
router.delete("/:id", authenticate, controller.archiveProject);
router.put("/:id/order", authenticate, controller.updateOrder);
router.get("/:id/history", authenticate, controller.statusHistory);
router.get("/:id/audio", authenticate, controller.streamAudio);

router.post("/:id/invite", authenticate, planGate("collaborator", projectFromParams), controller.invitePartner);
router.put("/:id/roles", authenticate, controller.updateRole);
router.delete("/:id/partner/:userId", authenticate, controller.removePartner);

router.post("/:id/cover", authenticate, requireProjectRole("owner"), coverUpload.single("cover"), controller.uploadCover);

router.post(
  "/:id/files",
  authenticate,
  requireProjectRole("editor"),
  fileUpload.single("file"),
  planGate("storage", incomingUpload),
  controller.addFile
);
router.get("/:id/files", authenticate, controller.listFiles);

router.post("/:id/comments", authenticate, controller.addComment);
router.get("/:id/comments", authenticate, controller.listComments);

router.get("/:id/tasks", authenticate, controller.listTasks);
router.post("/:id/tasks", authenticate, controller.addTask);

module.exports = router;
