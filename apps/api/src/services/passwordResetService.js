const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const prisma = require("../lib/prisma");
const config = require("../config");
const logger = require("../utils/logger");
const { sendEmail } = require("./emailService");

const TOKEN_TTL_MS = 30 * 60 * 1000; // o link vale 30 minutos
const MAX_REQUESTS_PER_HOUR = 5; // por conta, para ninguém lotar a caixa de alguém
const BCRYPT_ROUNDS = 12;

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function resetEmail(name, link) {
  const text = [
    `Oi, ${name}!`,
    "",
    "Recebemos um pedido para redefinir a senha da sua conta no TrackHub.",
    `Para criar uma senha nova, abra este link (vale por 30 minutos): ${link}`,
    "",
    "Se não foi você, é só ignorar este e-mail: sua senha continua a mesma.",
  ].join("\n");

  const html = `<!doctype html>
<html lang="pt-BR"><body style="margin:0;background:#141217;font-family:Arial,Helvetica,sans-serif;color:#F4F2F6">
  <div style="max-width:480px;margin:0 auto;padding:32px 24px">
    <p style="font-size:18px;font-weight:bold;margin:0 0 24px">TrackHub</p>
    <p style="margin:0 0 12px">Oi, ${escapeHtml(name)}!</p>
    <p style="margin:0 0 24px;color:#CFCAD6">Recebemos um pedido para redefinir a senha da sua conta. O link abaixo vale por 30 minutos.</p>
    <a href="${escapeHtml(link)}" style="display:inline-block;background:#ffffff;color:#141217;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:10px">Criar senha nova</a>
    <p style="margin:24px 0 0;font-size:13px;color:#A39DAD">Se não foi você, ignore este e-mail: sua senha continua a mesma.</p>
  </div>
</body></html>`;

  return { subject: "Redefinir sua senha do TrackHub", text, html };
}

// Sempre "dá certo" para quem chamou, exista a conta ou não.
// Assim ninguém usa esta tela para descobrir quais e-mails têm conta no TrackHub.
async function requestPasswordReset(rawEmail) {
  const email = rawEmail.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return { sent: false };

  const recent = await prisma.passwordResetToken.count({
    where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  if (recent >= MAX_REQUESTS_PER_HOUR) return { sent: false, limited: true };

  // Só o link mais novo vale.
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });

  const token = crypto.randomBytes(32).toString("base64url");
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
  });

  const link = `${config.webUrl}/redefinir-senha?token=${token}`;
  // Não esperamos o envio: a resposta demora o mesmo tanto com ou sem conta.
  sendEmail({ to: user.email, ...resetEmail(user.name, link) }).catch((error) => {
    logger.error("password_reset_email_failed", { userId: user.id, error: error.message });
  });
  return { sent: true, userId: user.id };
}

async function resetPassword(token, password) {
  const invalid = () => {
    const error = new Error("Este link é inválido ou já expirou. Peça um novo.");
    error.status = 400;
    return error;
  };

  const stored = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, isActive: true } } },
  });
  if (!stored || stored.usedAt || stored.expiresAt <= new Date() || !stored.user?.isActive) throw invalid();

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await prisma.$transaction([
    prisma.user.update({ where: { id: stored.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } }),
    prisma.passwordResetToken.deleteMany({ where: { userId: stored.userId, usedAt: null } }),
    // Senha nova = derruba todas as sessões abertas (se alguém tinha entrado na conta, sai).
    prisma.refreshToken.deleteMany({ where: { userId: stored.userId } }),
  ]);
  return { userId: stored.userId };
}

module.exports = { requestPasswordReset, resetPassword, hashToken };
