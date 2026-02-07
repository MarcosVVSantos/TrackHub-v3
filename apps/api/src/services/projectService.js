const prisma = require("../lib/prisma");
const { createNotification } = require("./notificationService");
const { ensureProjectMember } = require("./accessService");

async function listProjects(userId, { tags, status } = {}) {
  const statusFilter = status?.length ? { in: status } : undefined;
  const tagClauses = tags?.length
    ? tags.map((tag) => ({ tags: { array_contains: [tag] } }))
    : [];

  const where = {
    OR: [
      { ownerId: userId },
      { members: { some: { userId, status: "accepted" } } },
    ],
    archivedAt: null,
    status: statusFilter,
    ...(tagClauses.length ? { AND: [{ OR: tagClauses }] } : {}),
  };

  return prisma.project.findMany({
    where,
    include: {
      members: true,
      tasks: true,
      files: {
        where: { type: { startsWith: "audio/" } },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, url: true, type: true, name: true, storageKey: true },
      },
    },
    orderBy: [{ status: "asc" }, { order: "asc" }, { updatedAt: "desc" }],
  });
}

async function getProjectAudio(userId, projectId) {
  await ensureProjectMember(userId, projectId);
  const file = await prisma.fileAsset.findFirst({
    where: {
      projectId,
      type: { startsWith: "audio/" },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!file) {
    const error = new Error("Nenhum arquivo de áudio encontrado");
    error.status = 404;
    throw error;
  }

  return file;
}

async function getProject(userId, projectId) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { ownerId: userId },
        { members: { some: { userId, status: "accepted" } } },
      ],
    },
    include: {
      members: { include: { user: true } },
      tasks: true,
      comments: { include: { user: true } },
      statusLog: true,
      files: { include: { versions: true } },
      tracks: true,
    },
  });
}

async function createProject(userId, data) {
  const count = await prisma.project.count({
    where: {
      ownerId: userId,
      status: data.status || "idea",
      archivedAt: null,
    },
  });

  const project = await prisma.project.create({
    data: {
      name: data.name,
      description: data.description,
      status: data.status || "idea",
      order: count + 1,
      tags: data.tags || [],
      ownerId: userId,
      members: {
        create: {
          inviteEmail: data.ownerEmail || "owner",
          role: "owner",
          status: "accepted",
          invitedById: userId,
          userId,
        },
      },
    },
  });

  await prisma.projectStatusLog.create({
    data: {
      projectId: project.id,
      fromStatus: project.status,
      toStatus: project.status,
      changedBy: userId,
    },
  });

  return project;
}

async function updateProject(userId, projectId, data) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    const error = new Error("Projeto não encontrado");
    error.status = 404;
    throw error;
  }

  if (project.ownerId !== userId) {
    const error = new Error("Sem permissão para editar o projeto");
    error.status = 403;
    throw error;
  }

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: {
      name: data.name ?? project.name,
      description: data.description ?? project.description,
      status: data.status ?? project.status,
      tags: data.tags ?? project.tags,
      order: Number.isInteger(data.order) ? data.order : project.order,
    },
  });

  if (data.status && data.status !== project.status) {
    await prisma.projectStatusLog.create({
      data: {
        projectId,
        fromStatus: project.status,
        toStatus: data.status,
        changedBy: userId,
      },
    });

    const members = await prisma.projectMember.findMany({
      where: { projectId, status: "accepted" },
    });

    await Promise.all(
      members
        .filter((member) => member.userId && member.userId !== userId)
        .map((member) =>
          createNotification({
            userId: member.userId,
            type: "status_change",
            message: `Status do projeto ${updated.name} alterado para ${data.status}`,
            link: `/projects/${projectId}`,
          })
        )
    );
  }

  return updated;
}

async function archiveProject(userId, projectId) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    const error = new Error("Projeto não encontrado");
    error.status = 404;
    throw error;
  }

  if (project.ownerId !== userId) {
    const error = new Error("Sem permissão para arquivar o projeto");
    error.status = 403;
    throw error;
  }

  return prisma.project.update({
    where: { id: projectId },
    data: { archivedAt: new Date() },
  });
}

async function updateProjectOrder(userId, projectId, { order, status }) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    const error = new Error("Projeto não encontrado");
    error.status = 404;
    throw error;
  }

  if (project.ownerId !== userId) {
    const error = new Error("Sem permissão para reordenar o projeto");
    error.status = 403;
    throw error;
  }

  return prisma.project.update({
    where: { id: projectId },
    data: {
      order: Number.isInteger(order) ? order : project.order,
      status: status ?? project.status,
    },
  });
}

async function listTags(userId) {
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId, status: "accepted" } } },
      ],
      archivedAt: null,
    },
    select: { tags: true },
  });

  const tagSet = new Set();
  projects.forEach((project) => {
    if (Array.isArray(project.tags)) {
      project.tags.forEach((tag) => tagSet.add(tag));
    }
  });

  return Array.from(tagSet).sort();
}

async function listStatusHistory(userId, projectId) {
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

  return prisma.projectStatusLog.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
}

async function invitePartner(userId, projectId, { email, username, role }) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.ownerId !== userId) {
    const error = new Error("Sem permissão para convidar parceiros");
    error.status = 403;
    throw error;
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }].filter(Boolean),
    },
  });

  const invite = await prisma.projectMember.create({
    data: {
      projectId,
      userId: user?.id,
      inviteEmail: email || user?.email || "convidado",
      role: role || "viewer",
      status: user ? "accepted" : "pending",
      invitedById: userId,
    },
  });

  if (user) {
    await createNotification({
      userId: user.id,
      type: "invite",
      message: `Você foi convidado para o projeto ${project.name}`,
      link: `/projects/${projectId}`,
    });
  }

  return invite;
}

async function updatePartnerRole(userId, projectId, { memberId, role }) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.ownerId !== userId) {
    const error = new Error("Sem permissão para atualizar parceiros");
    error.status = 403;
    throw error;
  }

  return prisma.projectMember.update({
    where: { id: memberId },
    data: { role },
  });
}

async function removePartner(userId, projectId, partnerUserId) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.ownerId !== userId) {
    const error = new Error("Sem permissão para remover parceiros");
    error.status = 403;
    throw error;
  }

  return prisma.projectMember.deleteMany({
    where: { projectId, userId: partnerUserId },
  });
}

module.exports = {
  listProjects,
  getProject,
  createProject,
  updateProject,
  archiveProject,
  updateProjectOrder,
  listTags,
  listStatusHistory,
  getProjectAudio,
  invitePartner,
  updatePartnerRole,
  removePartner,
};
