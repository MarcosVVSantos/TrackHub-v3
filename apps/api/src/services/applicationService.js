const prisma = require("../lib/prisma");
const logger = require("../utils/logger");
const { createNotification } = require("./notificationService");
const { httpError } = require("./accessService");
const { ensureEventRole } = require("./eventService");
const { PUBLIC_USER_SELECT } = require("../utils/publicUser");
const { applySchema, applicationStatusSchema } = require("../utils/eventInput");

// Página pública do evento (/e/<slug>) e inscrições na chamada aberta.
//
// Regras de privacidade da página pública:
// - Só aparece se a equipe publicou e o evento não está arquivado.
// - Do line-up, só quem CONFIRMOU, e só nome, @, foto, função e horário.
//   Nada de cachê, observação, quem foi convidado ou quem recusou.
// - Nada da equipe, tarefas, arquivos ou inscrições de outras pessoas.

const MAX_APPLICATIONS_PER_EVENT = 1000;

async function notifySafe(payload) {
  try {
    await createNotification(payload);
  } catch (error) {
    logger.warn("application_notification_failed", { type: payload.type, error: error.message });
  }
}

// A chamada está aberta agora? O prazo é conferido aqui no servidor, não só escondido na tela.
function isCallOpen(info, now = new Date()) {
  if (!info?.callOpen) return false;
  if (info.callDeadline && new Date(info.callDeadline) < now) return false;
  const end = info.endsAt || info.startsAt;
  if (end && new Date(end) < now) return false;
  return true;
}

async function findPublishedEvent(slug) {
  if (typeof slug !== "string" || slug.length > 80) throw httpError(404, "Evento não encontrado");
  const info = await prisma.eventInfo.findUnique({
    where: { slug },
    select: {
      published: true,
      project: { select: { id: true, kind: true, archivedAt: true, ownerId: true } },
    },
  });
  if (!info || !info.published || !info.project || info.project.kind !== "event" || info.project.archivedAt) {
    throw httpError(404, "Evento não encontrado");
  }
  return info.project;
}

async function getPublicEvent(slug, viewerId) {
  const { id } = await findPublishedEvent(slug);

  const event = await prisma.project.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      coverUrl: true,
      owner: { select: PUBLIC_USER_SELECT },
      eventInfo: {
        select: {
          slug: true,
          type: true,
          startsAt: true,
          endsAt: true,
          venueName: true,
          venueAddress: true,
          ticketUrl: true,
          callOpen: true,
          callDeadline: true,
          callSlots: true,
        },
      },
      lineup: {
        where: { status: "confirmed" },
        select: { id: true, name: true, role: true, startTime: true, user: { select: PUBLIC_USER_SELECT } },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  const callOpenNow = isCallOpen(event.eventInfo);
  const result = { ...event, callOpenNow };

  // Logado: diz se a pessoa já se inscreveu e lista as faixas públicas dela para usar como amostra.
  if (viewerId) {
    const [application, member, tracks] = await Promise.all([
      prisma.eventApplication.findUnique({
        where: { projectId_userId: { projectId: id, userId: viewerId } },
        select: { id: true, status: true, createdAt: true },
      }),
      prisma.projectMember.findFirst({ where: { projectId: id, userId: viewerId, status: "accepted" }, select: { id: true } }),
      prisma.track.findMany({
        where: { isPublic: true, project: { ownerId: viewerId, archivedAt: null } },
        select: { id: true, title: true, coverUrl: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);
    result.viewer = {
      application,
      isTeam: Boolean(member) || event.owner?.id === viewerId,
      tracks,
    };
  }

  return result;
}

async function apply(userId, slug, body) {
  const project = await findPublishedEvent(slug);
  const data = applySchema.parse(body || {});

  const info = await prisma.eventInfo.findUnique({ where: { projectId: project.id } });
  if (!isCallOpen(info)) throw httpError(400, "As inscrições deste evento estão fechadas");

  if (project.ownerId === userId) throw httpError(400, "Você faz parte da equipe deste evento");
  const [member, slot, existing, total] = await Promise.all([
    prisma.projectMember.findFirst({ where: { projectId: project.id, userId, status: "accepted" }, select: { id: true } }),
    prisma.lineupSlot.findFirst({ where: { projectId: project.id, userId }, select: { id: true } }),
    prisma.eventApplication.findUnique({ where: { projectId_userId: { projectId: project.id, userId } }, select: { id: true } }),
    prisma.eventApplication.count({ where: { projectId: project.id } }),
  ]);
  if (member) throw httpError(400, "Você faz parte da equipe deste evento");
  if (slot) throw httpError(409, "Você já está no line-up deste evento");
  if (existing) throw httpError(409, "Você já se inscreveu neste evento");
  if (total >= MAX_APPLICATIONS_PER_EVENT) throw httpError(400, "Este evento atingiu o limite de inscrições");

  // A faixa precisa ser pública e da própria pessoa: não dá para usar o som de outra.
  if (data.trackId) {
    const track = await prisma.track.findFirst({
      where: { id: data.trackId, isPublic: true, project: { ownerId: userId, archivedAt: null } },
      select: { id: true },
    });
    if (!track) throw httpError(400, "Escolha uma faixa pública sua");
  }

  const application = await prisma.eventApplication.create({
    data: {
      projectId: project.id,
      userId,
      artistName: data.artistName,
      role: data.role,
      city: data.city ?? null,
      trackId: data.trackId || null,
      sampleUrl: data.sampleUrl || null,
      message: data.message ?? null,
    },
    select: { id: true, status: true, createdAt: true },
  });

  await notifySafe({
    userId: project.ownerId,
    actorId: userId,
    type: "application_new",
    message: `Nova inscrição de ${data.artistName}`,
    link: `/eventos/${project.id}?tab=inscricoes`,
  });

  return application;
}

// Inscrições que a própria pessoa enviou (para acompanhar a resposta).
async function listMyApplications(userId) {
  return prisma.eventApplication.findMany({
    where: { userId, project: { kind: "event", archivedAt: null } },
    select: {
      id: true,
      status: true,
      role: true,
      createdAt: true,
      project: {
        select: {
          id: true,
          name: true,
          coverUrl: true,
          eventInfo: { select: { slug: true, type: true, startsAt: true, venueName: true, published: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ---------- Lado da equipe ----------

const APPLICATION_SELECT = {
  id: true,
  artistName: true,
  role: true,
  city: true,
  sampleUrl: true,
  message: true,
  status: true,
  createdAt: true,
  user: { select: { ...PUBLIC_USER_SELECT, role: true, city: true } },
  track: { select: { id: true, title: true, coverUrl: true, audioUrl: true, isPublic: true } },
};

// Mensagens e cidades de quem se inscreveu ficam só com quem edita o evento.
async function listApplications(userId, projectId) {
  await ensureEventRole(userId, projectId, "editor");
  const items = await prisma.eventApplication.findMany({
    where: { projectId },
    select: APPLICATION_SELECT,
    orderBy: { createdAt: "asc" },
  });
  // Se a faixa deixou de ser pública depois da inscrição, não manda o áudio.
  return items.map((item) => (item.track && !item.track.isPublic ? { ...item, track: null } : item));
}

const STATUS_NOTIFY = {
  approved: { type: "application_approved", text: (name) => `Sua inscrição em ${name} foi aprovada!` },
  rejected: { type: "application_rejected", text: (name) => `Sua inscrição em ${name} não foi selecionada desta vez` },
};

async function setApplicationStatus(userId, projectId, applicationId, body) {
  const { project } = await ensureEventRole(userId, projectId, "editor");
  const { status } = applicationStatusSchema.parse(body || {});

  const application = await prisma.eventApplication.findFirst({
    where: { id: applicationId, projectId },
    select: { id: true, status: true, userId: true, artistName: true, role: true },
  });
  if (!application) throw httpError(404, "Inscrição não encontrada");

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.eventApplication.update({ where: { id: applicationId }, data: { status }, select: APPLICATION_SELECT });

    // Aprovou: a pessoa entra no line-up já confirmada (ela mesma pediu para tocar).
    if (status === "approved") {
      const already = await tx.lineupSlot.findFirst({ where: { projectId, userId: application.userId }, select: { id: true } });
      if (!already) {
        const last = await tx.lineupSlot.findFirst({ where: { projectId }, orderBy: { position: "desc" }, select: { position: true } });
        await tx.lineupSlot.create({
          data: {
            projectId,
            userId: application.userId,
            name: application.artistName,
            role: application.role,
            status: "confirmed",
            position: (last?.position ?? -1) + 1,
          },
        });
      }
    }
    return result;
  });

  // Avisa só quando a decisão muda (aprovar duas vezes não manda dois avisos).
  const notify = STATUS_NOTIFY[status];
  if (notify && application.status !== status) {
    await notifySafe({
      userId: application.userId,
      actorId: userId,
      type: notify.type,
      message: notify.text(project.name),
      link: "/eventos/convites",
    });
  }

  return updated;
}

module.exports = {
  getPublicEvent,
  apply,
  listMyApplications,
  listApplications,
  setApplicationStatus,
  isCallOpen,
};
