const chatService = require("../services/chatService");

async function listConversations(req, res, next) {
  try {
    const conversations = await chatService.listConversations(req.user.sub);
    res.json(conversations);
  } catch (error) {
    next(error);
  }
}

async function listChatableUsers(req, res, next) {
  try {
    const users = await chatService.listChatableUsers(req.user.sub);
    res.json(users);
  } catch (error) {
    next(error);
  }
}

async function getMessages(req, res, next) {
  try {
    const { userId } = req.params;
    const cursor = req.query.cursor || null;
    const limit = Math.min(parseInt(req.query.limit) || 30, 50);
    const data = await chatService.getMessages(req.user.sub, userId, { cursor, limit });
    res.json(data);
  } catch (error) {
    next(error);
  }
}

async function sendMessage(req, res, next) {
  try {
    const { userId } = req.params;
    const message = await chatService.sendMessage(req.user.sub, userId, req.body.content);
    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
}

async function markAsRead(req, res, next) {
  try {
    const { userId } = req.params;
    await chatService.markAsRead(req.user.sub, userId);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

async function getUnreadCount(req, res, next) {
  try {
    const count = await chatService.getUnreadCount(req.user.sub);
    res.json({ count });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listConversations,
  listChatableUsers,
  getMessages,
  sendMessage,
  markAsRead,
  getUnreadCount,
};
