const prisma = require("../lib/prisma");

async function getMe(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      avatarUrl: true,
      theme: true,
      createdAt: true,
    },
  });
}

async function updateMe(userId, data) {
  const payload = {
    name: data.name?.trim(),
    username: data.username?.trim(),
    theme: data.theme,
  };

  if (payload.username) {
    const existing = await prisma.user.findFirst({
      where: {
        username: payload.username,
        NOT: { id: userId },
      },
    });

    if (existing) {
      const error = new Error("Username já em uso");
      error.status = 400;
      throw error;
    }
  }

  if (payload.theme && !["light", "dark"].includes(payload.theme)) {
    const error = new Error("Tema inválido. Use light ou dark.");
    error.status = 400;
    throw error;
  }

  if (payload.name && payload.name.length < 2) {
    const error = new Error("O nome deve ter pelo menos 2 caracteres");
    error.status = 400;
    throw error;
  }

  if (payload.username && payload.username.length < 3) {
    const error = new Error("O username deve ter pelo menos 3 caracteres");
    error.status = 400;
    throw error;
  }

  return prisma.user.update({
    where: { id: userId },
    data: payload,
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      avatarUrl: true,
      theme: true,
      createdAt: true,
    },
  });
}

async function updateAvatar(userId, avatarUrl) {
  return prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      avatarUrl: true,
      theme: true,
    },
  });
}

module.exports = {
  getMe,
  updateMe,
  updateAvatar,
};
