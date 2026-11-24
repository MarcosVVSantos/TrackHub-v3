const express = require("express");
const authenticate = require("../middleware/auth");
const controller = require("../controllers/playlistController");
const planGate = require("../middleware/planGate");

const router = express.Router();

router.use(authenticate);

router.get("/mine", controller.listMyPlaylists);
router.get("/auto", controller.listAutoPlaylists);
router.get("/tracks/search", controller.searchPublicTracks);
router.post("/", planGate("playlist"), controller.createPlaylist);
router.get("/:id", controller.getPlaylist);
router.put("/:id", controller.updatePlaylist);
router.delete("/:id", controller.deletePlaylist);
router.post("/:id/tracks", controller.addTrack);
router.delete("/:id/tracks/:trackId", controller.removeTrack);
router.put("/:id/tracks/reorder", controller.reorderTracks);

module.exports = router;
