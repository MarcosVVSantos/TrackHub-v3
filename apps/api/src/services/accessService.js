const prisma = require("../lib/prisma");

const ROLE_PRIORITY = { viewer: 1, editor: 2, owner: 3 };
const ASSIGNABLE_ROLES = ["editor", "viewer"];

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

// Retorna o papel do usuário no projeto: owner, editor, viewer ou null.
async function getProjectRole(userId, projectId) {
  if (!userId || !projectId) return { project: null, role: null };

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { project: null, role: null };
  if (project.ownerId === userId) return { project, role: "owner" };

  const member = await prisma.projectMember.findFirst({
    where: { projectId, userId, status: "accepted" },
    select: { role: true },
  });

  if (!member) return { project, role: null };
  // Um membro nunca é tratado como dono, mesmo que o banco diga "owner".
  const role = member.role === "owner" ? "editor" : member.role;
  return { project, role };
}

// viewer: ver e comentar. editor: também envia arquivos, tarefas e eventos. owner: tudo.
async function ensureProjectRole(userId, projectId, minRole = "viewer") {
  const { project, role } = await getProjectRole(userId, projectId);

  if (!project || !role) {
    throw httpError(403, "Sem acesso ao projeto");
  }

  if (ROLE_PRIORITY[role] < ROLE_PRIORITY[minRole]) {
    throw httpError(403, "Seu papel neste projeto não permite essa ação");
  }

  return project;
}

async function ensureProjectMember(userId, projectId) {
  return ensureProjectRole(userId, projectId, "viewer");
}

// Middleware para checar o papel antes de processar a requisição (inclusive antes de receber upload).
function requireProjectRole(minRole, paramName = "id") {
  return async (req, res, next) => {
    try {
      req.project = await ensureProjectRole(req.user.sub, req.params[paramName], minRole);
      next();
    } catch (error) {
      next(error);
    }
  };
}

// Uma faixa pode ser vista por qualquer pessoa se for pública e o projeto não estiver arquivado;
// caso contrário, só por quem participa do projeto.
async function ensureTrackVisible(trackId, userId) {
  const track = await prisma.track.findUnique({
    where: { id: trackId },
    select: { id: true, isPublic: true, project: { select: { id: true, ownerId: true, archivedAt: true } } },
  });

  if (!track) throw httpError(404, "Faixa não encontrada");

  if (track.isPublic && !track.project.archivedAt) return track;

  const { role } = await getProjectRole(userId, track.project.id);
  if (!role) throw httpError(404, "Faixa não encontrada");
  return track;
}

module.exports = {
  ASSIGNABLE_ROLES,
  getProjectRole,
  ensureProjectRole,
  ensureProjectMember,
  requireProjectRole,
  ensureTrackVisible,
  httpError,
};
