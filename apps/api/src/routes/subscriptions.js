const express = require("express");
const authenticate = require("../middleware/auth");
const controller = require("../controllers/subscriptionController");

const router = express.Router();

router.get("/me", authenticate, controller.getMySubscription);

module.exports = router;
