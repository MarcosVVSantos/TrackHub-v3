const notificationService = require("../services/notificationService");

async function list(req, res, next) {
  try {
    const notifications = await notificationService.listNotifications(req.user.sub);
    res.json(notifications);
  } catch (error) {
    next(error);
  }
}

async function markRead(req, res, next) {
  try {
    const result = await notificationService.markAsRead(req.params.id, req.user.sub);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function markAllRead(req, res, next) {
  try {
    const result = await notificationService.markAllRead(req.user.sub);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  list,
  markRead,
  markAllRead,
};
