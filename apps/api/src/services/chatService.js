const prisma = require("../lib/prisma");
const { sendToUser } = require("./socketService");

const MAX_MESSAGE_LENGTH = 1000;

// Verifica se dois usuários se seguem mutuamente
async function assertMutualFollow(userId, targetId) {
  if (userId === targetId) {
    const err = new Error("Ação inválida.");
    err.status = 400;
    throw err;
  }

  const [aFollowsB, bFollowsA] = await Promise.all([
    prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: userId, followingId: targetId } },
    }),
    prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: targetId, followingId: userId } },
    }),
  ]);

  if (!aFollowsB || !bFollowsA) {
    const err = new Error("Você só pode conversar com quem te segue de volta.");
    err.status = 403;
    throw err;
  }
}

// Garante que o usuário é participante da conversa antes de qualquer acesso
async function assertConversationParticipant(userId, conversationId) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    const err = new Error("Conversa não encontrada.");
    err.status = 404;
    throw err;
  }

  if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
    const err = new Error("Sem acesso a esta conversa.");
    err.status = 403;
    throw err;
  }

  return conversation;
}

// Obtém ou cria conversa entre dois usuários
async function getOrCreateConversation(userId, targetId) {
  await assertMutualFollow(userId, targetId);

  // Normaliza os IDs para garantir uniqueness (user1Id < user2Id)
  const [user1Id, user2Id] = [userId, targetId].sort();

  const existing = await prisma.conversation.findUnique({
    where: { user1Id_user2Id: { user1Id, user2Id } },
    include: {
      user1: { select: { id: true, name: true, username: true, avatarUrl: true } },
      user2: { select: { id: true, name: true, username: true, avatarUrl: true } },
    },
  });

  if (existing) return existing;

  return prisma.conversation.create({
    data: { user1Id, user2Id },
    include: {
      user1: { select: { id: true, name: true, username: true, avatarUrl: true } },
      user2: { select: { id: true, name: true, username: true, avatarUrl: true } },
    },
  });
}

// Lista todas as conversas do usuário com última mensagem e unread count
async function listConversations(userId) {
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [{ user1Id: userId }, { user2Id: userId }],
    },
    include: {
      user1: { select: { id: true, name: true, username: true, avatarUrl: true } },
      user2: { select: { id: true, name: true, username: true, avatarUrl: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return conversations.map((conv) => {
    const other = conv.user1Id === userId ? conv.user2 : conv.user1;
    const lastMessage = conv.messages[0] || null;
    return {
      id: conv.id,
      other,
      lastMessage,
      updatedAt: conv.updatedAt,
    };
  });
}

// Retorna mensagens de uma conversa (paginado)
async function getMessages(userId, targetId, { cursor, limit = 30 } = {}) {
  await assertMutualFollow(userId, targetId);

  const [user1Id, user2Id] = [userId, targetId].sort();
  const conversation = await prisma.conversation.findUnique({
    where: { user1Id_user2Id: { user1Id, user2Id } },
  });

  if (!conversation) return { messages: [], conversationId: null };

  // Garante que o userId é realmente participante
  await assertConversationParticipant(userId, conversation.id);

  const messages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    include: {
      sender: { select: { id: true, name: true, username: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  return { messages: messages.reverse(), conversationId: conversation.id };
}

// Envia mensagem — com validação de conteúdo
async function sendMessage(userId, targetId, content) {
  // Valida mutual follow antes de qualquer coisa
  await assertMutualFollow(userId, targetId);

  if (!content || typeof content !== "string") {
    const err = new Error("Conteúdo inválido.");
    err.status = 400;
    throw err;
  }

  const sanitized = content.trim();

  if (!sanitized) {
    const err = new Error("Mensagem não pode ser vazia.");
    err.status = 400;
    throw err;
  }

  if (sanitized.length > MAX_MESSAGE_LENGTH) {
    const err = new Error(`Mensagem muito longa. Máximo de ${MAX_MESSAGE_LENGTH} caracteres.`);
    err.status = 400;
    throw err;
  }

  const [user1Id, user2Id] = [userId, targetId].sort();

  // Cria conversa se não existir
  const conversation = await prisma.conversation.upsert({
    where: { user1Id_user2Id: { user1Id, user2Id } },
    update: { updatedAt: new Date() },
    create: { user1Id, user2Id },
  });

  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: userId,
      content: sanitized,
    },
    include: {
      sender: { select: { id: true, name: true, username: true, avatarUrl: true } },
    },
  });

  // Entrega em tempo real ao destinatário via WebSocket
  sendToUser(targetId, {
    type: "chat",
    data: {
      conversationId: conversation.id,
      message,
    },
  });

  return message;
}

// Marca todas as mensagens não lidas do outro usuário como lidas
async function markAsRead(userId, targetId) {
  const [user1Id, user2Id] = [userId, targetId].sort();

  const conversation = await prisma.conversation.findUnique({
    where: { user1Id_user2Id: { user1Id, user2Id } },
  });

  if (!conversation) return;

  // Garante que o userId é participante antes de atualizar
  await assertConversationParticipant(userId, conversation.id);

  await prisma.message.updateMany({
    where: {
      conversationId: conversation.id,
      senderId: { not: userId },
      readAt: null,
    },
    data: { readAt: new Date() },
  });
}

// Conta mensagens não lidas em todas as conversas do usuário
async function getUnreadCount(userId) {
  return prisma.message.count({
    where: {
      conversation: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      senderId: { not: userId },
      readAt: null,
    },
  });
}

// Lista usuários com quem o usuário pode conversar (mutual follows)
async function listChatableUsers(userId) {
  const [following, followers] = await Promise.all([
    prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    }),
    prisma.follow.findMany({
      where: { followingId: userId },
      select: { followerId: true },
    }),
  ]);

  const followingSet = new Set(following.map((f) => f.followingId));
  const mutualIds = followers
    .map((f) => f.followerId)
    .filter((id) => followingSet.has(id));

  if (!mutualIds.length) return [];

  return prisma.user.findMany({
    where: { id: { in: mutualIds } },
    select: { id: true, name: true, username: true, avatarUrl: true },
    orderBy: { name: "asc" },
  });
}

module.exports = {
  listConversations,
  getMessages,
  sendMessage,
  markAsRead,
  getUnreadCount,
  getOrCreateConversation,
  listChatableUsers,
};
