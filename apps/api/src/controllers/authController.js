const config = require("../config");
const authService = require("../services/authService");
const { registerSchema, loginSchema } = require("../utils/validators");

async function register(req, res, next) {
  try {
    const payload = registerSchema.parse(req.body);
    const result = await authService.register(payload);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const payload = loginSchema.parse(req.body);
    const result = await authService.login(payload);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refresh(refreshToken, config.jwtRefreshExpires);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  refresh,
};
