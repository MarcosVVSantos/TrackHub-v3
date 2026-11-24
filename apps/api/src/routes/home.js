const express = require("express");
const authenticate = require("../middleware/auth");
const homeService = require("../services/homeService");

const router = express.Router();

router.get("/", authenticate, async (req, res, next) => {
  try {
    res.json(await homeService.getHome(req.user.sub));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
