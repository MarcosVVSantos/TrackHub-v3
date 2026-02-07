const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require("../utils/jwt");

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

async function register({ email, username, name, password }) {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
  });

  if (existing) {
    const error = new Error("Email ou username já cadastrados");
    error.status = 400;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, username, name, passwordHash },
  });

  return createSession(user);
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const error = new Error("Credenciais inválidas");
    error.status = 401;
    throw error;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    const error = new Error("Credenciais inválidas");
    error.status = 401;
    throw error;
  }

  return createSession(user);
}

async function refresh(token, refreshExpires) {
  const payload = verifyRefreshToken(token);
  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (!stored) {
    const error = new Error("Refresh token inválido");
    error.status = 401;
    throw error;
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    const error = new Error("Usuário não encontrado");
    error.status = 404;
    throw error;
  }

  const accessToken = signAccessToken({ sub: user.id, email: user.email });
  const expiresAt = new Date(Date.now() + durationToMs(refreshExpires));
  await prisma.refreshToken.update({
    where: { token },
    data: { expiresAt },
  });

  return { accessToken, refreshToken: token };
}

async function createSession(user) {
  const accessToken = signAccessToken({ sub: user.id, email: user.email });
  const refreshToken = signRefreshToken({ sub: user.id });
  const expiresAt = new Date(Date.now() + durationToMs(process.env.JWT_REFRESH_EXPIRES || "7d"));

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt,
    },
  });

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
  register,
  login,
  refresh,
};
