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
      bio: true,
      isActive: true,
      theme: true,
      createdAt: true,
    },
  });
}

async function updateMe(userId, data) {
  const payload = {
    name: data.name?.trim(),
    username: data.username?.trim(),
    bio: data.bio,
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

  if (payload.bio && payload.bio.length > 280) {
    const error = new Error("A bio deve ter no máximo 280 caracteres");
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
      bio: true,
      isActive: true,
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
      bio: true,
      isActive: true,
      theme: true,
    },
  });
}

async function listExplore(userId, query) {
  const where = {
    id: { not: userId },
    isActive: true,
    ...(query
      ? {
          OR: [
            { name: { contains: query } },
            { username: { contains: query } },
          ],
        }
      : {}),
  };

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      username: true,
      avatarUrl: true,
    },
  });

  const userIds = users.map((item) => item.id);
  if (!userIds.length) return [];

  const [followers, projects, following] = await Promise.all([
    prisma.follow.groupBy({
      by: ["followingId"],
      where: { followingId: { in: userIds } },
      _count: { _all: true },
    }),
    prisma.project.groupBy({
      by: ["ownerId"],
      where: {
        ownerId: { in: userIds },
        archivedAt: null,
        tracks: { some: { isPublic: true } },
      },
      _count: { _all: true },
    }),
    prisma.follow.findMany({
      where: { followerId: userId, followingId: { in: userIds } },
      select: { followingId: true },
    }),
  ]);

  const followersMap = new Map(followers.map((item) => [item.followingId, item._count._all]));
  const projectsMap = new Map(projects.map((item) => [item.ownerId, item._count._all]));
  const followingSet = new Set(following.map((item) => item.followingId));

  return users
    .map((item) => ({
      ...item,
      followersCount: followersMap.get(item.id) || 0,
      projectsCount: projectsMap.get(item.id) || 0,
      isFollowing: followingSet.has(item.id),
    }))
    .sort((a, b) => b.projectsCount - a.projectsCount);
}

module.exports = {
  getMe,
  updateMe,
  updateAvatar,
  listExplore,
};
