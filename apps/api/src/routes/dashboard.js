const express = require("express");
const authenticate = require("../middleware/auth");
const controller = require("../controllers/dashboardController");

const router = express.Router();

router.get("/metrics", authenticate, controller.metrics);

module.exports = router;
