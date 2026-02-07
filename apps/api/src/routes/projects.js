const express = require("express");
const multer = require("multer");
const path = require("path");
const authenticate = require("../middleware/auth");
const controller = require("../controllers/projectController");
const config = require("../config");

const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(config.rootDir, config.uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${file.originalname}`;
    cb(null, unique);
  },
});

const upload = multer({ storage });

router.post("/", authenticate, controller.createProject);
router.get("/tags", authenticate, controller.listTags);
router.get("/", authenticate, controller.listProjects);
router.get("/:id", authenticate, controller.getProject);
router.put("/:id", authenticate, controller.updateProject);
router.delete("/:id", authenticate, controller.archiveProject);
router.put("/:id/order", authenticate, controller.updateOrder);
router.get("/:id/history", authenticate, controller.statusHistory);
router.get("/:id/audio", authenticate, controller.streamAudio);

router.post("/:id/invite", authenticate, controller.invitePartner);
router.put("/:id/roles", authenticate, controller.updateRole);
router.delete("/:id/partner/:userId", authenticate, controller.removePartner);

router.post("/:id/files", authenticate, upload.single("file"), controller.addFile);
router.get("/:id/files", authenticate, controller.listFiles);

router.post("/:id/comments", authenticate, controller.addComment);
router.get("/:id/comments", authenticate, controller.listComments);

router.get("/:id/tasks", authenticate, controller.listTasks);
router.post("/:id/tasks", authenticate, controller.addTask);

module.exports = router;
