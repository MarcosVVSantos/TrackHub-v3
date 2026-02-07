const express = require("express");
const authenticate = require("../middleware/auth");
const controller = require("../controllers/followController");

const router = express.Router();

router.get("/following", authenticate, controller.listFollowing);
router.post("/:id", authenticate, controller.follow);
router.delete("/:id", authenticate, controller.unfollow);

module.exports = router;