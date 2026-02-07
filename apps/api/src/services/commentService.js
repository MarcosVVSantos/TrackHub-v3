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

module.exports = {
  listProjectComments,
  addProjectComment,
};
