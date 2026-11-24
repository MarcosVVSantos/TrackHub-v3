const authService = require("../services/authService");
const { logSecurityEvent } = require("../utils/securityLog");
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
    if (error.status === 401) {
      // Só o domínio do email vai para o log, para não guardar o email inteiro.
      const domain = String(req.body?.email || "").split("@")[1];
      logSecurityEvent("login_failed", { req, emailDomain: domain });
    }
    next(error);
  }
}

async function refresh(req, res, next) {
  try {
    const result = await authService.refresh(req.body?.refreshToken);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    await authService.logout(req.body?.refreshToken);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  refresh,
  logout,
};
