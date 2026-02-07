const { getDashboardMetrics } = require("../services/dashboardService");

async function metrics(req, res, next) {
  try {
    const period = req.query.period || "6m";
    const data = await getDashboardMetrics(req.user.sub, period);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

module.exports = { metrics };
