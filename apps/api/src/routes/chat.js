const express = require("express");
const authenticate = require("../middleware/auth");
const controller = require("../controllers/chatController");
const { chatSendLimiter } = require("../middleware/rateLimit");

const router = express.Router();

// Todas as rotas de chat exigem autenticação
router.use(authenticate);

router.get("/conversations", controller.listConversations);
router.get("/users", controller.listChatableUsers);
router.get("/unread", controller.getUnreadCount);
router.get("/conversations/:userId", controller.getMessages);
router.post("/conversations/:userId", chatSendLimiter, controller.sendMessage);
router.put("/conversations/:userId/read", controller.markAsRead);

module.exports = router;
