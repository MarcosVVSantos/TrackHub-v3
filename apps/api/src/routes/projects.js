const express = require("express");
const multer = require("multer");
const authenticate = require("../middleware/auth");
const planGate = require("../middleware/planGate");
const controller = require("../controllers/projectController");

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post("/", authenticate, planGate("projects"), controller.createProject);
router.get("/tags", authenticate, controller.listTags);
router.get("/invites", authenticate, controller.listInvites);
router.post("/invites/:inviteId/accept", authenticate, controller.acceptInvite);
router.post("/invites/:inviteId/decline", authenticate, controller.declineInvite);
router.get("/", authenticate, controller.listProjects);
router.get("/invites", authenticate, controller.listInvites);
router.get("/:id", authenticate, controller.getProject);
router.put("/:id", authenticate, controller.updateProject);
router.delete("/:id", authenticate, controller.archiveProject);
router.put("/:id/order", authenticate, controller.updateOrder);
router.get("/:id/history", authenticate, controller.statusHistory);
router.get("/:id/audio", authenticate, controller.streamAudio);

router.post(
  "/:id/invite",
  authenticate,
  planGate("collaborators", (req) => ({ projectId: req.params.id })),
  controller.invitePartner
);
router.post("/invites/:inviteId/accept", authenticate, controller.acceptInvite);
router.post("/invites/:inviteId/decline", authenticate, controller.declineInvite);
router.put("/:id/roles", authenticate, controller.updateRole);
router.delete("/:id/partner/:userId", authenticate, controller.removePartner);

router.post("/:id/cover", authenticate, upload.single("cover"), controller.uploadCover);

router.post(
  "/:id/files",
  authenticate,
  upload.single("file"),
  planGate("storage", (req) => ({ sizeBytes: req.file?.size ?? 0 })),
  controller.addFile
);
router.get("/:id/files", authenticate, controller.listFiles);
router.post("/:id/cover", authenticate, upload.single("cover"), controller.uploadCover);

router.post("/:id/comments", authenticate, controller.addComment);
router.get("/:id/comments", authenticate, controller.listComments);

router.get("/:id/tasks", authenticate, controller.listTasks);
router.post("/:id/tasks", authenticate, controller.addTask);

module.exports = router;
