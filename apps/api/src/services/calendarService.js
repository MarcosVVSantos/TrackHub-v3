const prisma = require("../lib/prisma");
const { createNotification } = require("./notificationService");
const { ensureProjectMember } = require("./accessService");

async function getCalendarProjectIds(userId) {
  const [owned, shared] = await Promise.all([
    prisma.project.findMany({
      where: { ownerId: userId, archivedAt: null },
      select: { id: true },
    }),
    prisma.projectMember.findMany({
      where: { userId, status: "accepted", calendarShareStatus: "accepted" },
      select: { projectId: true },
    }),
  ]);

  return Array.from(new Set([...owned.map((item) => item.id), ...shared.map((item) => item.projectId)]));
}

async function listCalendarEvents(userId, { start, end } = {}) {
  const projectIds = await getCalendarProjectIds(userId);
  if (!projectIds.length) return [];

  const where = {
    projectId: { in: projectIds },
    ...(start && end ? { startsAt: { gte: start, lte: end } } : {}),
  };

  return prisma.projectEvent.findMany({
    where,
    include: {
      project: { select: { id: true, name: true, coverUrl: true } },
      participants: { include: { user: { select: { id: true, name: true, username: true, avatarUrl: true } } } },
      createdBy: { select: { id: true, name: true, username: true, avatarUrl: true } },
    },
    orderBy: { startsAt: "asc" },
  });
}

async function listCalendarOverview(userId) {
  const projectIds = await getCalendarProjectIds(userId);
  if (!projectIds.length) {
    return { today: [], upcoming: [] };
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const [today, upcoming] = await Promise.all([
    prisma.projectEvent.findMany({
      where: {
        projectId: { in: projectIds },
        startsAt: { gte: startOfDay, lt: endOfDay },
      },
      include: {
        project: { select: { id: true, name: true, coverUrl: true } },
        participants: { include: { user: { select: { id: true, name: true, username: true, avatarUrl: true } } } },
      },
      orderBy: { startsAt: "asc" },
    }),
    prisma.projectEvent.findMany({
      where: {
        projectId: { in: projectIds },
        startsAt: { gt: now },
      },
      include: {
        project: { select: { id: true, name: true, coverUrl: true } },
        participants: { include: { user: { select: { id: true, name: true, username: true, avatarUrl: true } } } },
      },
      orderBy: { startsAt: "asc" },
      take: 6,
    }),
  ]);

  return { today, upcoming };
}

async function listProjectEvents(userId, projectId) {
  await ensureProjectMember(userId, projectId);
  return prisma.projectEvent.findMany({
    where: { projectId },
    include: {
      participants: { include: { user: { select: { id: true, name: true, username: true, avatarUrl: true } } } },
      createdBy: { select: { id: true, name: true, username: true, avatarUrl: true } },
    },
    orderBy: { startsAt: "asc" },
  });
}

async function createProjectEvent(userId, projectId, payload) {
  await ensureProjectMember(userId, projectId);
  const { title, description, startsAt, endsAt, participantIds } = payload;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    const error = new Error("Projeto não encontrado");
    error.status = 404;
    throw error;
  }

  const members = await prisma.projectMember.findMany({
    where: { projectId, status: "accepted" },
    select: { userId: true },
  });
  const memberIds = new Set([project.ownerId, ...members.map((member) => member.userId).filter(Boolean)]);
  const requested = Array.isArray(participantIds) && participantIds.length
    ? participantIds.filter((id) => memberIds.has(id))
    : Array.from(memberIds);

  const event = await prisma.projectEvent.create({
    data: {
      projectId,
      title,
      description: description || null,
      startsAt: new Date(startsAt),
      endsAt: endsAt ? new Date(endsAt) : null,
      createdById: userId,
      participants: {
        createMany: {
          data: requested.map((participantId) => ({ userId: participantId })),
        },
      },
    },
    include: {
      participants: { include: { user: { select: { id: true, name: true, username: true, avatarUrl: true } } } },
      createdBy: { select: { id: true, name: true, username: true, avatarUrl: true } },
    },
  });

  await Promise.all(
    requested
      .filter((participantId) => participantId && participantId !== userId)
      .map((participantId) =>
        createNotification({
          userId: participantId,
          actorId: userId,
          type: "event_created",
          message: `Novo evento no projeto ${project.name}`,
          link: `/projects/${projectId}`,
        })
      )
  );

  return event;
}

async function updateProjectEvent(userId, projectId, eventId, payload) {
  await ensureProjectMember(userId, projectId);
  const { title, description, startsAt, endsAt, participantIds } = payload;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    const error = new Error("Projeto não encontrado");
    error.status = 404;
    throw error;
  }

  let participants = null;
  if (Array.isArray(participantIds)) {
    const members = await prisma.projectMember.findMany({
      where: { projectId, status: "accepted" },
      select: { userId: true },
    });
    const memberIds = new Set([project.ownerId, ...members.map((member) => member.userId).filter(Boolean)]);
    participants = participantIds.filter((id) => memberIds.has(id));
  }

  const updated = await prisma.projectEvent.update({
    where: { id: eventId },
    data: {
      title,
      description: description ?? null,
      startsAt: startsAt ? new Date(startsAt) : undefined,
      endsAt: endsAt ? new Date(endsAt) : null,
      participants: participants
        ? {
            deleteMany: {},
            createMany: { data: participants.map((participantId) => ({ userId: participantId })) },
          }
        : undefined,
    },
    include: {
      participants: { include: { user: { select: { id: true, name: true, username: true, avatarUrl: true } } } },
      createdBy: { select: { id: true, name: true, username: true, avatarUrl: true } },
    },
  });

  const notifyIds = (participants || updated.participants.map((participant) => participant.userId)).filter(Boolean);
  await Promise.all(
    notifyIds
      .filter((participantId) => participantId !== userId)
      .map((participantId) =>
        createNotification({
          userId: participantId,
          actorId: userId,
          type: "event_updated",
          message: `Evento atualizado no projeto ${project.name}`,
          link: `/projects/${projectId}`,
        })
      )
  );

  return updated;
}

async function inviteCalendarShare(userId, projectId, memberId) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.ownerId !== userId) {
    const error = new Error("Sem permissão para compartilhar agenda");
    error.status = 403;
    throw error;
  }

  const member = await prisma.projectMember.findFirst({
    where: { projectId, userId: memberId, status: "accepted" },
  });

  if (!member) {
    const error = new Error("Parceiro não encontrado");
    error.status = 404;
    throw error;
  }

  const updated = await prisma.projectMember.update({
    where: { id: member.id },
    data: {
      calendarShareStatus: "pending",
      calendarInvitedById: userId,
    },
  });

  await createNotification({
    userId: memberId,
    actorId: userId,
    type: "calendar_invite",
    message: `Convite para agenda compartilhada do projeto ${project.name}`,
    link: `/projects/${projectId}`,
  });

  return updated;
}

async function acceptCalendarShare(userId, projectId) {
  const member = await prisma.projectMember.findFirst({
    where: { projectId, userId, status: "accepted" },
    include: { project: true },
  });

  if (!member) {
    const error = new Error("Convite não encontrado");
    error.status = 404;
    throw error;
  }

  const updated = await prisma.projectMember.update({
    where: { id: member.id },
    data: { calendarShareStatus: "accepted" },
  });

  await createNotification({
    userId: member.project.ownerId,
    actorId: userId,
    type: "calendar_accept",
    message: `Agenda compartilhada aceita em ${member.project.name}`,
    link: `/projects/${projectId}`,
  });

  return updated;
}

async function declineCalendarShare(userId, projectId) {
  const member = await prisma.projectMember.findFirst({
    where: { projectId, userId, status: "accepted" },
    include: { project: true },
  });

  if (!member) {
    const error = new Error("Convite não encontrado");
    error.status = 404;
    throw error;
  }

  const updated = await prisma.projectMember.update({
    where: { id: member.id },
    data: { calendarShareStatus: "declined" },
  });

  await createNotification({
    userId: member.project.ownerId,
    actorId: userId,
    type: "calendar_decline",
    message: `Agenda compartilhada recusada em ${member.project.name}`,
    link: `/projects/${projectId}`,
  });

  return updated;
}

module.exports = {
  listCalendarEvents,
  listCalendarOverview,
  listProjectEvents,
  createProjectEvent,
  updateProjectEvent,
  inviteCalendarShare,
  acceptCalendarShare,
  declineCalendarShare,
};
