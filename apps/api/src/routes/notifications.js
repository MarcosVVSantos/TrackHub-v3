const express = require("express");
const authenticate = require("../middleware/auth");
const controller = require("../controllers/notificationController");

const router = express.Router();

router.get("/", authenticate, controller.list);
router.put("/:id/read", authenticate, controller.markRead);
router.put("/read-all", authenticate, controller.markAllRead);

module.exports = router;
