const express = require("express");
const authenticate = require("../middleware/auth");
const controller = require("../controllers/commentController");

const router = express.Router();

router.patch("/:id", authenticate, controller.updateComment);
router.delete("/:id", authenticate, controller.deleteComment);

module.exports = router;
