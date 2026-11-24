const { checkLimit } = require("../services/planService");

function planGate(resource, getContext) {
  return async (req, res, next) => {
    try {
      const context = getContext ? getContext(req) : {};
      await checkLimit(req.user.sub, resource, context);
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = planGate;
