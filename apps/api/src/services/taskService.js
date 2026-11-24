const prisma = require("../lib/prisma");
const { ensureProjectMember, ensureProjectRole, httpError } = require("./accessService");
const { PUBLIC_USER_SELECT } = require("../utils/publicUser");

const FLAGS = ["none", "attention", "blocked"];
const TASK_INCLUDE = { assignee: { select: PUBLIC_USER_SELECT } };

// Responsável precisa ser o dono ou um membro aceito do projeto.
async function assertAssignable(projectId, assigneeId) {
  if (!assigneeId) return null;
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { ownerId: true } });
  if (project?.ownerId === assigneeId) return assigneeId;
  const member = await prisma.projectMember.findFirst({
    where: { projectId, userId: assigneeId, status: "accepted" },
    select: { id: true },
  });
  if (!member) throw httpError(400, "O responsável precisa fazer parte do projeto");
  return assigneeId;
}

function parseTaskInput(data = {}, { partial = false } = {}) {
  const result = {};
  if (data.title !== undefined || !partial) {
    if (typeof data.title !== "string" || !data.title.trim() || data.title.trim().length > 200) {
      throw httpError(400, "Título da tarefa obrigatório, com até 200 caracteres");
    }
    result.title = data.title.trim();
  }
  if (data.description !== undefined) {
    if (data.description !== null && (typeof data.description !== "string" || data.description.length > 2000)) {
      throw httpError(400, "Descrição com no máximo 2000 caracteres");
    }
    result.description = data.description || null;
  }
  if (data.flag !== undefined) {
    if (!FLAGS.includes(data.flag)) throw httpError(400, "Marcação inválida");
    result.flag = data.flag;
  }
  if (data.done !== undefined) result.done = Boolean(data.done);
  if (data.dueDate !== undefined) {
    if (data.dueDate === null || data.dueDate === "") {
      result.dueDate = null;
    } else {
      const due = new Date(data.dueDate);
      if (Number.isNaN(due.getTime())) throw httpError(400, "Prazo inválido");
      result.dueDate = due;
    }
  }
  return result;
}

async function listTasks(userId, projectId) {
  await ensureProjectMember(userId, projectId);
  return prisma.taskCard.findMany({
    where: { projectId },
    include: TASK_INCLUDE,
    orderBy: [{ done: "asc" }, { dueDate: "asc" }, { updatedAt: "desc" }],
  });
}

async function addTask(userId, projectId, data = {}) {
  await ensureProjectRole(userId, projectId, "editor");
  const input = parseTaskInput(data);
  const assigneeId = await assertAssignable(projectId, data.assigneeId || null);
  return prisma.taskCard.create({
    data: { projectId, flag: "none", ...input, assigneeId },
    include: TASK_INCLUDE,
  });
}

async function updateTask(userId, projectId, taskId, data = {}) {
  await ensureProjectRole(userId, projectId, "editor");
  const task = await prisma.taskCard.findFirst({ where: { id: taskId, projectId } });
  if (!task) throw httpError(404, "Tarefa não encontrada");
  const input = parseTaskInput(data, { partial: true });
  if (data.assigneeId !== undefined) input.assigneeId = await assertAssignable(projectId, data.assigneeId || null);
  return prisma.taskCard.update({ where: { id: task.id }, data: input, include: TASK_INCLUDE });
}

async function deleteTask(userId, projectId, taskId) {
  await ensureProjectRole(userId, projectId, "editor");
  const task = await prisma.taskCard.findFirst({ where: { id: taskId, projectId } });
  if (!task) throw httpError(404, "Tarefa não encontrada");
  await prisma.taskCard.delete({ where: { id: task.id } });
  return { deleted: true };
}

module.exports = {
  listTasks,
  addTask,
  updateTask,
  deleteTask,
};
