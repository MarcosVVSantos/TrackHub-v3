const prisma = require("../lib/prisma");
const { ensureProjectMember, ensureProjectRole, httpError } = require("./accessService");

const FLAGS = ["none", "attention", "blocked"];

async function listTasks(userId, projectId) {
  await ensureProjectMember(userId, projectId);
  return prisma.taskCard.findMany({
    where: { projectId },
    orderBy: { updatedAt: "desc" },
  });
}

async function addTask(userId, projectId, data = {}) {
  await ensureProjectRole(userId, projectId, "editor");
  const { title, description, flag = "none" } = data;
  if (typeof title !== "string" || !title.trim() || title.trim().length > 200) {
    throw httpError(400, "Título da tarefa obrigatório, com até 200 caracteres");
  }
  if (description != null && (typeof description !== "string" || description.length > 2000)) {
    throw httpError(400, "Descrição com no máximo 2000 caracteres");
  }
  if (!FLAGS.includes(flag)) throw httpError(400, "Marcação inválida");

  return prisma.taskCard.create({
    data: {
      projectId,
      title: title.trim(),
      description: description || null,
      flag,
    },
  });
}

module.exports = {
  listTasks,
  addTask,
};
