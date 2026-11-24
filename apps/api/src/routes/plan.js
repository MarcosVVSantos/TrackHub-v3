const express = require("express");
const authenticate = require("../middleware/auth");
const planService = require("../services/planService");

const router = express.Router();

router.get("/me", authenticate, async (req, res, next) => {
  try {
    res.json(await planService.getPlanSummary(req.user.sub));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
