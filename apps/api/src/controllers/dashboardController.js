const { getDashboardMetrics } = require("../services/dashboardService");

async function metrics(req, res, next) {
  try {
    const data = await getDashboardMetrics(req.user.sub);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

module.exports = { metrics };
