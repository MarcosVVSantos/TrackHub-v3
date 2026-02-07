const prisma = require("../lib/prisma");

async function ensureProjectMember(userId, projectId) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: userId },
        { members: { some: { userId, status: "accepted" } } },
      ],
    },
  });

  if (!project) {
    const error = new Error("Sem acesso ao projeto");
    error.status = 403;
    throw error;
  }

  return project;
}

module.exports = { ensureProjectMember };
