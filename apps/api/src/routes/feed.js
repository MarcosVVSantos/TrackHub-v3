const express = require("express");
const authenticate = require("../middleware/auth");
const controller = require("../controllers/feedController");

const router = express.Router();

router.get("/", authenticate, controller.listFeed);
router.get("/productions", authenticate, controller.listProductions);
router.get("/projects", authenticate, controller.listProjectPosts);
router.get("/social", authenticate, controller.listSocial);
router.post("/social", authenticate, controller.createSocial);
router.post("/social/:id/like", authenticate, controller.likeSocial);
router.get("/social/:id/comments", authenticate, controller.listSocialComments);
router.post("/social/:id/comment", authenticate, controller.commentSocial);
router.post("/social/:id/save", authenticate, controller.saveSocial);
router.delete("/social/:id/save", authenticate, controller.unsaveSocial);
router.get("/playlists", authenticate, controller.listPlaylists);
router.post("/playlists/:id/save", authenticate, controller.savePlaylist);
router.delete("/playlists/:id/save", authenticate, controller.unsavePlaylist);

module.exports = router;
