const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const prisma = require("../lib/prisma");
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require("../utils/jwt");

// Depois de trocado, o refresh token antigo ainda vale por alguns segundos.
// Isso evita deslogar quem tem duas abas renovando a sessão ao mesmo tempo.
const ROTATION_GRACE_MS = 30 * 1000;
const BCRYPT_ROUNDS = 12;
// Hash fixo usado quando o email não existe, para o login demorar o mesmo tempo
// (assim ninguém descobre quais emails têm conta medindo o tempo de resposta).
const DUMMY_HASH = bcrypt.hashSync("trackhub-dummy-password", BCRYPT_ROUNDS);

function durationToMs(value) {
  const match = /^([0-9]+)([smhd])$/.exec(value);
  if (!match) {
    return 0;
  }
  const amount = Number(match[1]);
  const unit = match[2];
  const multiplier = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  }[unit];
  return amount * multiplier;
}

// No banco fica só o hash do refresh token: se o banco vazar, os tokens não servem para nada.
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function unauthorized(message = "Sessão inválida. Faça login novamente.") {
  const error = new Error(message);
  error.status = 401;
  return error;
}

async function register({ email, username, name, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: normalizedEmail }, { username }],
    },
  });

  if (existing) {
    const error = new Error("Email ou username já cadastrados");
    error.status = 400;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: { email: normalizedEmail, username, name, passwordHash },
  });

  return createSession(user);
}

async function login({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  const user =
    (await prisma.user.findUnique({ where: { email: normalizedEmail } })) ||
    (normalizedEmail !== email ? await prisma.user.findUnique({ where: { email } }) : null);

  const isValid = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);
  if (!user || !isValid || !user.isActive) {
    throw unauthorized("E-mail ou senha incorretos.");
  }

  return createSession(user);
}

async function refresh(token) {
  if (typeof token !== "string" || !token) throw unauthorized();

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw unauthorized();
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token: hashToken(token) } });

  if (!stored || stored.userId !== payload.sub) {
    // Token com assinatura válida mas que já não existe: alguém pode ter roubado
    // e usado antes. Por segurança, encerra todas as sessões desse usuário.
    await prisma.refreshToken.deleteMany({ where: { userId: payload.sub } });
    const error = unauthorized();
    error.code = "REFRESH_TOKEN_REUSE";
    error.userId = payload.sub;
    throw error;
  }

  if (stored.expiresAt <= new Date()) {
    await prisma.refreshToken.deleteMany({ where: { id: stored.id } });
    throw unauthorized();
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) {
    await prisma.refreshToken.deleteMany({ where: { userId: payload.sub } });
    throw unauthorized();
  }

  // Rotação: o token usado expira em 30s e um novo é emitido.
  const graceUntil = new Date(Date.now() + ROTATION_GRACE_MS);
  if (stored.expiresAt > graceUntil) {
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { expiresAt: graceUntil } });
  }

  return createSession(user);
}

async function logout(token) {
  if (typeof token !== "string" || !token) return;
  await prisma.refreshToken.deleteMany({ where: { token: hashToken(token) } });
}

async function createSession(user) {
  const accessToken = signAccessToken({ sub: user.id });
  const refreshToken = signRefreshToken({ sub: user.id, jti: crypto.randomUUID() });
  const expiresAt = new Date(Date.now() + durationToMs(process.env.JWT_REFRESH_EXPIRES || "7d"));

  await prisma.refreshToken.create({
    data: {
      token: hashToken(refreshToken),
      userId: user.id,
      expiresAt,
    },
  });

  // Limpeza: remove sessões vencidas deste usuário.
  await prisma.refreshToken.deleteMany({ where: { userId: user.id, expiresAt: { lt: new Date() } } });

  const safeUser = {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    avatarUrl: user.avatarUrl,
    theme: user.theme,
  };

  return { user: safeUser, accessToken, refreshToken };
}

module.exports = {
  createSession,
  register,
  login,
  refresh,
  logout,
  hashToken,
};
