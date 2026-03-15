const prisma = require("../lib/prisma");
const { createNotification } = require("./notificationService");

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

  const follow = await prisma.follow.create({
    data: { followerId: userId, followingId: targetId },
  });

  const follower = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, username: true },
  });

  await createNotification({
    userId: targetId,
    actorId: userId,
    type: "follow",
    message: `${follower?.name || "Alguém"} começou a te seguir`,
    link: `/profile/${follower?.username || userId}`,
  });

  return follow;
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