const prisma = require("../lib/prisma");
const socketService = require("./socketService");

async function createNotification({ userId, type, message, link, actorId }) {
  if (actorId && actorId === userId) {
    return null;
  }
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      message,
      link,
      actorId: actorId || null,
    },
    include: {
      actor: { select: { id: true, name: true, username: true, avatarUrl: true } },
    },
  });
  socketService.sendToUser(userId, { type: "notification", data: notification });
  return notification;
}

async function listNotifications(userId) {
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      include: {
        actor: { select: { id: true, name: true, username: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);

  return { items, unreadCount };
}

async function markAsRead(notificationId, userId) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { readAt: new Date() },
  });
}

async function markAllRead(userId) {
  return prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

module.exports = {
  createNotification,
  listNotifications,
  markAsRead,
  markAllRead,
};
