const express = require("express");
const authenticate = require("../middleware/auth");
const controller = require("../controllers/feedController");

const router = express.Router();

router.get("/:id", controller.getTrack);
router.patch("/:id", authenticate, controller.updateTrack);
router.post("/:id/like", authenticate, controller.likeTrack);
router.post("/:id/save", authenticate, controller.saveTrack);
router.delete("/:id/save", authenticate, controller.unsaveTrack);
router.post("/:id/comment", authenticate, controller.commentTrack);
router.post("/:id/play", authenticate, controller.playTrack);

module.exports = router;
