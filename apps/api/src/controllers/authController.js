const authService = require("../services/authService");
const { logSecurityEvent } = require("../utils/securityLog");
const passwordResetService = require("../services/passwordResetService");
const { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } = require("../utils/validators");

// Resposta igual exista a conta ou não (não revela quem tem cadastro).
async function forgotPassword(req, res, next) {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const result = await passwordResetService.requestPasswordReset(email);
    if (result.limited) logSecurityEvent("password_reset_limited", { req, targetUserId: result.userId });
    else if (result.sent) logSecurityEvent("password_reset_requested", { req, targetUserId: result.userId });
    res.json({ message: "Se existir uma conta com este e-mail, enviamos um link para redefinir a senha." });
  } catch (error) {
    next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);
    const result = await passwordResetService.resetPassword(token, password);
    logSecurityEvent("password_reset_completed", { req, targetUserId: result.userId });
    res.json({ message: "Senha alterada. Entre com a senha nova." });
  } catch (error) {
    next(error);
  }
}

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
  forgotPassword,
  resetPassword,
  register,
  login,
  refresh,
  logout,
};
