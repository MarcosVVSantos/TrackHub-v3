const prisma = require("../lib/prisma");
const { createNotification } = require("./notificationService");
const { ensureProjectMember, httpError } = require("./accessService");
const { PUBLIC_USER_SELECT } = require("../utils/publicUser");

const MAX_COMMENT_LENGTH = 1000;

function validateContent(content) {
  if (typeof content !== "string" || !content.trim()) throw httpError(400, "Escreva um comentário");
  if (content.trim().length > MAX_COMMENT_LENGTH) {
    throw httpError(400, `Comentário com no máximo ${MAX_COMMENT_LENGTH} caracteres`);
  }
  return content.trim();
}

async function listProjectComments(userId, projectId) {
  await ensureProjectMember(userId, projectId);
  return prisma.projectComment.findMany({
    where: { projectId },
    include: { user: { select: PUBLIC_USER_SELECT } },
    orderBy: { createdAt: "desc" },
  });
}

async function addProjectComment(userId, projectId, content) {
  await ensureProjectMember(userId, projectId);
  const comment = await prisma.projectComment.create({
    data: { userId, projectId, content: validateContent(content) },
    include: { user: { select: PUBLIC_USER_SELECT } },
  });

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (project && project.ownerId !== userId) {
    await createNotification({
      userId: project.ownerId,
      type: "comment",
      message: `Novo comentário no projeto ${project.name}`,
      link: `/projects/${projectId}`,
    });
  }

  return comment;
}

async function updateComment(userId, commentId, content) {
  const trackComment = await prisma.trackComment.findUnique({ where: { id: commentId } });
  if (trackComment) {
    if (trackComment.userId !== userId) {
      const error = new Error("Sem permissão para editar este comentário");
      error.status = 403;
      throw error;
    }
    return prisma.trackComment.update({
      where: { id: commentId },
      data: { content: validateContent(content) },
    });
  }

  const socialComment = await prisma.socialPostComment.findUnique({ where: { id: commentId } });
  if (socialComment) {
    if (socialComment.userId !== userId) {
      const error = new Error("Sem permissão para editar este comentário");
      error.status = 403;
      throw error;
    }
    return prisma.socialPostComment.update({
      where: { id: commentId },
      data: { content: validateContent(content) },
    });
  }

  const error = new Error("Comentário não encontrado");
  error.status = 404;
  throw error;
}

async function deleteComment(userId, commentId) {
  const trackComment = await prisma.trackComment.findUnique({ where: { id: commentId } });
  if (trackComment) {
    if (trackComment.userId !== userId) {
      const error = new Error("Sem permissão para excluir este comentário");
      error.status = 403;
      throw error;
    }
    await prisma.trackComment.delete({ where: { id: commentId } });
    return { deleted: true };
  }

  const socialComment = await prisma.socialPostComment.findUnique({ where: { id: commentId } });
  if (socialComment) {
    if (socialComment.userId !== userId) {
      const error = new Error("Sem permissão para excluir este comentário");
      error.status = 403;
      throw error;
    }
    await prisma.socialPostComment.delete({ where: { id: commentId } });
    return { deleted: true };
  }

  const error = new Error("Comentário não encontrado");
  error.status = 404;
  throw error;
}

module.exports = {
  validateContent,
  listProjectComments,
  addProjectComment,
  updateComment,
  deleteComment,
};
