const express = require("express");
const controller = require("../controllers/feedController");

const router = express.Router();

router.get("/", controller.listFeed);

module.exports = router;
