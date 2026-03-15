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
      events: {
        orderBy: { startsAt: "asc" },
        take: 3,
      },
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
      events: {
        include: { participants: { include: { user: true } }, createdBy: true },
        orderBy: { startsAt: "asc" },
      },
    },
  });
}

async function createProject(userId, data) {
  if (data.isPublic && !data.coverUrl) {
    const error = new Error("Projetos públicos precisam de capa");
    error.status = 400;
    throw error;
  }
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
      isPublic: Boolean(data.isPublic),
      coverUrl: data.coverUrl || null,
      ownerId: userId,
      members: {
        create: {
          inviteEmail: data.ownerEmail || "owner",
          role: "owner",
          roleLabel: data.ownerRoleLabel || "Criador",
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

  if (project.isPublic) {
    await prisma.socialPost.create({
      data: {
        authorId: userId,
        content: "Projeto publicado",
        projectId: project.id,
      },
    });
  }

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

  if (data.isPublic && !data.coverUrl && !project.coverUrl) {
    const error = new Error("Projetos públicos precisam de capa");
    error.status = 400;
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
      isPublic: data.isPublic ?? project.isPublic,
      coverUrl: data.coverUrl ?? project.coverUrl,
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

  if (data.isPublic === true && !project.isPublic) {
    const existingPost = await prisma.socialPost.findFirst({
      where: { projectId, authorId: userId, content: "Projeto publicado" },
    });
    if (!existingPost) {
      await prisma.socialPost.create({
        data: {
          authorId: userId,
          content: "Projeto publicado",
          projectId,
        },
      });
    }
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

async function invitePartner(userId, projectId, { email, username, role, roleLabel }) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.ownerId !== userId) {
    const error = new Error("Sem permissão para convidar parceiros");
    error.status = 403;
    throw error;
  }

  const inviter = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, username: true },
  });

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
      roleLabel: roleLabel || null,
      status: "pending",
      invitedById: userId,
    },
  });

  if (user) {
    await createNotification({
      userId: user.id,
      actorId: userId,
      type: "project_invite",
      message: `${inviter?.name || "Alguém"} convidou você para o projeto ${project.name}`,
      link: `/projects/${projectId}`,
    });
  }

  return invite;
}

async function listInvites(userId) {
  return prisma.projectMember.findMany({
    where: { userId, status: "pending" },
    include: {
      project: { select: { id: true, name: true, ownerId: true } },
      invitedBy: { select: { id: true, name: true, username: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function acceptInvite(userId, inviteId) {
  const invite = await prisma.projectMember.findFirst({
    where: { id: inviteId, userId, status: "pending" },
    include: { project: true },
  });
  if (!invite) {
    const error = new Error("Convite não encontrado");
    error.status = 404;
    throw error;
  }

  const updated = await prisma.projectMember.update({
    where: { id: inviteId },
    data: { status: "accepted" },
  });

  await createNotification({
    userId: invite.project.ownerId,
    actorId: userId,
    type: "project_invite_accept",
    message: `Convite aceito no projeto ${invite.project.name}`,
    link: `/projects/${invite.project.id}`,
  });

  return updated;
}

async function declineInvite(userId, inviteId) {
  const invite = await prisma.projectMember.findFirst({
    where: { id: inviteId, userId, status: "pending" },
    include: { project: true },
  });
  if (!invite) {
    const error = new Error("Convite não encontrado");
    error.status = 404;
    throw error;
  }

  const updated = await prisma.projectMember.update({
    where: { id: inviteId },
    data: { status: "declined" },
  });

  await createNotification({
    userId: invite.project.ownerId,
    actorId: userId,
    type: "project_invite_decline",
    message: `Convite recusado no projeto ${invite.project.name}`,
    link: `/projects/${invite.project.id}`,
  });

  return updated;
}

async function updatePartnerRole(userId, projectId, { memberId, role, roleLabel }) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.ownerId !== userId) {
    const error = new Error("Sem permissão para atualizar parceiros");
    error.status = 403;
    throw error;
  }

  return prisma.projectMember.update({
    where: { id: memberId },
    data: { role, roleLabel },
  });
}

async function removePartner(userId, projectId, partnerUserId) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.ownerId !== userId) {
    const error = new Error("Sem permissão para remover parceiros");
    error.status = 403;
    throw error;
  }

  const removed = await prisma.projectMember.deleteMany({
    where: { projectId, userId: partnerUserId },
  });

  if (partnerUserId) {
    await createNotification({
      userId: partnerUserId,
      actorId: userId,
      type: "project_removed",
      message: `Você foi removido do projeto ${project.name}`,
      link: "/projects",
    });
  }

  return removed;
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
  listInvites,
  acceptInvite,
  declineInvite,
  updatePartnerRole,
  removePartner,
};
