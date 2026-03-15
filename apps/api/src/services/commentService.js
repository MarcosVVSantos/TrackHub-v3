const prisma = require("../lib/prisma");
const { createNotification } = require("./notificationService");
const { ensureProjectMember } = require("./accessService");

async function listProjectComments(userId, projectId) {
  await ensureProjectMember(userId, projectId);
  return prisma.projectComment.findMany({
    where: { projectId },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
}

async function addProjectComment(userId, projectId, content) {
  await ensureProjectMember(userId, projectId);
  const comment = await prisma.projectComment.create({
    data: { userId, projectId, content },
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
      data: { content },
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
      data: { content },
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
  listProjectComments,
  addProjectComment,
  updateComment,
  deleteComment,
};
