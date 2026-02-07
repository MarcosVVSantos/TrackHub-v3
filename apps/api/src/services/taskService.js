const prisma = require("../lib/prisma");
const { ensureProjectMember } = require("./accessService");

async function listTasks(userId, projectId) {
  await ensureProjectMember(userId, projectId);
  return prisma.taskCard.findMany({
    where: { projectId },
    orderBy: { updatedAt: "desc" },
  });
}

async function addTask(userId, projectId, data) {
  await ensureProjectMember(userId, projectId);
  return prisma.taskCard.create({
    data: {
      projectId,
      title: data.title,
      description: data.description,
      flag: data.flag || "none",
    },
  });
}

module.exports = {
  listTasks,
  addTask,
};
