const express = require("express");
const authenticate = require("../middleware/auth");
const controller = require("../controllers/profileController");

const router = express.Router();

router.get("/:id", authenticate, controller.getProfile);
router.get("/:id/productions", authenticate, controller.listProductions);
router.get("/:id/projects", authenticate, controller.listPublicProjects);
router.get("/:id/posts", authenticate, controller.listPosts);
router.get("/:id/playlists", authenticate, controller.listPlaylists);

module.exports = router;