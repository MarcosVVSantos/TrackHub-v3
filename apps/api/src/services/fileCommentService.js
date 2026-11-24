const prisma = require("../lib/prisma");
const { ensureProjectRole, getProjectRole, httpError } = require("./accessService");
const { createNotification } = require("./notificationService");
const { validateContent } = require("./commentService");
const { PUBLIC_USER_SELECT } = require("../utils/publicUser");

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

async function getProjectFile(projectId, fileId) {
  const file = await prisma.fileAsset.findFirst({
    where: { id: fileId, projectId },
    select: { id: true, name: true, durationSec: true, versions: { select: { version: true }, take: 1 } },
  });
  if (!file) throw httpError(404, "Arquivo não encontrado");
  return file;
}

async function listFileComments(userId, projectId, fileId) {
  await ensureProjectRole(userId, projectId, "viewer");
  await getProjectFile(projectId, fileId);
  return prisma.fileComment.findMany({
    where: { fileId },
    include: { user: { select: PUBLIC_USER_SELECT } },
    orderBy: [{ atSeconds: "asc" }, { createdAt: "asc" }],
  });
}

async function addFileComment(userId, projectId, fileId, { content, atSeconds } = {}) {
  const project = await ensureProjectRole(userId, projectId, "viewer");
  const file = await getProjectFile(projectId, fileId);

  let at = null;
  if (atSeconds !== undefined && atSeconds !== null && atSeconds !== "") {
    at = Number(atSeconds);
    const max = file.durationSec ? file.durationSec + 1 : 60 * 60 * 3;
    if (!Number.isFinite(at) || at < 0 || at > max) throw httpError(400, "Momento do comentário inválido");
    at = Math.round(at * 10) / 10;
  }

  const comment = await prisma.fileComment.create({
    data: { fileId, userId, atSeconds: at, content: validateContent(content) },
    include: { user: { select: PUBLIC_USER_SELECT } },
  });

  // Avisa o dono e os membros do projeto (menos quem comentou).
  const members = await prisma.projectMember.findMany({
    where: { projectId, status: "accepted", userId: { not: null } },
    select: { userId: true },
  });
  const recipients = new Set([project.ownerId, ...members.map((m) => m.userId)]);
  recipients.delete(userId);
  const version = file.versions[0]?.version || "versão";
  const where = at !== null ? ` em ${formatTime(at)}` : "";
  await Promise.all(
    [...recipients].map((recipient) =>
      createNotification({
        userId: recipient,
        actorId: userId,
        type: "comment",
        message: `${comment.user.name} comentou na ${version} de ${project.name}${where}`,
        link: `/projects/${projectId}?file=${fileId}`,
      })
    )
  );

  return comment;
}

async function deleteFileComment(userId, projectId, fileId, commentId) {
  const { role } = await getProjectRole(userId, projectId);
  if (!role) throw httpError(403, "Sem acesso ao projeto");
  const comment = await prisma.fileComment.findFirst({ where: { id: commentId, fileId, file: { projectId } } });
  if (!comment) throw httpError(404, "Comentário não encontrado");
  if (comment.userId !== userId && role !== "owner") throw httpError(403, "Sem permissão para excluir este comentário");
  await prisma.fileComment.delete({ where: { id: comment.id } });
  return { deleted: true };
}

module.exports = { listFileComments, addFileComment, deleteFileComment, formatTime };
