const express = require("express");
const authenticate = require("../middleware/auth");
const controller = require("../controllers/notificationController");

const router = express.Router();

router.get("/", authenticate, controller.list);
router.put("/:id/read", authenticate, controller.markRead);

module.exports = router;
