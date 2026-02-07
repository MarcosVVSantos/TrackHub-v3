const express = require("express");
const authenticate = require("../middleware/auth");
const controller = require("../controllers/feedController");

const router = express.Router();

router.get("/:id", controller.getTrack);
router.post("/:id/like", authenticate, controller.likeTrack);
router.post("/:id/comment", authenticate, controller.commentTrack);
router.post("/:id/play", authenticate, controller.playTrack);

module.exports = router;
