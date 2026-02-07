const prisma = require("../lib/prisma");

async function createNotification({ userId, type, message, link }) {
  return prisma.notification.create({
    data: {
      userId,
      type,
      message,
      link,
    },
  });
}

async function listNotifications(userId) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

async function markAsRead(notificationId, userId) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { readAt: new Date() },
  });
}

module.exports = {
  createNotification,
  listNotifications,
  markAsRead,
};
