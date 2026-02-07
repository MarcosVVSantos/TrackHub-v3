const prisma = require("../lib/prisma");

async function listFollowing(userId) {
  return prisma.follow.findMany({
    where: { followerId: userId },
    include: { following: { select: { id: true, name: true, username: true, avatarUrl: true } } },
    orderBy: { createdAt: "desc" },
  });
}

async function followUser(userId, targetId) {
  if (userId === targetId) {
    const error = new Error("Não é possível seguir a si mesmo.");
    error.status = 400;
    throw error;
  }

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: userId, followingId: targetId } },
  });
  if (existing) return existing;

  return prisma.follow.create({
    data: { followerId: userId, followingId: targetId },
  });
}

async function unfollowUser(userId, targetId) {
  return prisma.follow.delete({
    where: { followerId_followingId: { followerId: userId, followingId: targetId } },
  });
}

module.exports = {
  listFollowing,
  followUser,
  unfollowUser,
};