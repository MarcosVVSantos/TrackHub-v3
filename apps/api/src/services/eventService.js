const crypto = require("crypto");
const prisma = require("../lib/prisma");
const { createNotification } = require("./notificationService");
const { getProjectRole, httpError } = require("./accessService");
const { PUBLIC_USER_SELECT } = require("../utils/publicUser");
const {
  parseCreateEvent,
  parseUpdateEvent,
  createSlotSchema,
  updateSlotSchema,
  reorderSchema,
  respondSchema,
  slugify,
} = require("../utils/eventInput");

// Um evento é um projeto com kind = "event" e os dados extras em EventInfo.
// Assim ele reaproveita o que já existe: equipe (membros), checklist (tarefas),
// cronograma (agenda do projeto) e arquivos.

const ROLE_PRIORITY = { viewer: 1, editor: 2, owner: 3 };

const MAX_SLOTS_PER_EVENT = 200;

const SLOT_SELECT = {
  id: true,
  userId: true,
  name: true,
  role: true,
  startTime: true,
  position: true,
  status: true,
  feeCents: true,
  notes: true,
  createdAt: true,
  user: { select: { ...PUBLIC_USER_SELECT, role: true, city: true } },
};

const MEMBER_SELECT = {
  id: true,
  userId: true,
  role: true,
  roleLabel: true,
  status: true,
  inviteEmail: true,
  createdAt: true,
  user: { select: PUBLIC_USER_SELECT },
};

// Garante que o projeto é um evento e que a pessoa tem pelo menos o papel pedido.
// Responde 404 (e não 403) quando a pessoa não participa: assim não dá para descobrir
// quais IDs de evento existem.
async function ensureEventRole(userId, projectId, minRole = "viewer") {
  const { project, role } = await getProjectRole(userId, projectId);
  if (!project || project.kind !== "event" || project.archivedAt || !role) {
    throw httpError(404, "Evento não encontrado");
  }
  if (ROLE_PRIORITY[role] < ROLE_PRIORITY[minRole]) {
    throw httpError(403, "Seu papel neste evento não permite essa ação");
  }
  return { project, role };
}

const canSeeFees = (role) => role === "owner" || role === "editor";

// Cachê é dado sensível: some da resposta para quem é só "viewer".
function presentSlot(slot, role) {
  if (canSeeFees(role)) return slot;
  const { feeCents, notes, ...rest } = slot;
  return rest;
}

function feeTotal(slots) {
  return slots.filter((slot) => slot.status !== "declined").reduce((sum, slot) => sum + (slot.feeCents || 0), 0);
}

function lineupCounts(slots) {
  const counts = { total: slots.length, confirmed: 0, invited: 0, declined: 0 };
  for (const slot of slots) counts[slot.status] += 1;
  return counts;
}

// Gera um endereço único para a página pública. Se "batalha-da-leste-12" já existir,
// tenta "batalha-da-leste-12-2" e assim por diante; no limite, usa um sufixo aleatório.
async function uniqueSlug(name, db = prisma) {
  const base = slugify(name);
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const candidate = attempt === 1 ? base : `${base}-${attempt}`;
    const taken = await db.eventInfo.findUnique({ where: { slug: candidate }, select: { projectId: true } });
    if (!taken) return candidate;
  }
  return `${base}-${crypto.randomBytes(3).toString("hex")}`;
}

function eventInfoData(data) {
  const fields = ["type", "startsAt", "endsAt", "venueName", "venueAddress", "ticketUrl", "callOpen", "callDeadline", "callSlots"];
  const result = {};
  for (const field of fields) if (data[field] !== undefined) result[field] = data[field];
  return result;
}

async function createEvent(userId, body) {
  const data = parseCreateEvent(body);
  const slug = await uniqueSlug(data.name);

  return prisma.project.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      kind: "event",
      status: "idea",
      coverUrl: data.coverUrl ?? null,
      tags: [],
      ownerId: userId,
      members: {
        create: {
          inviteEmail: "owner",
          role: "owner",
          roleLabel: data.ownerRoleLabel || "Produção",
          status: "accepted",
          invitedById: userId,
          userId,
        },
      },
      statusLog: { create: { fromStatus: "idea", toStatus: "idea", changedBy: userId } },
      eventInfo: { create: { slug, ...eventInfoData(data), callOpen: Boolean(data.callOpen) } },
    },
    include: { eventInfo: true },
  });
}

// Eventos de que a pessoa participa (dona ou membro), com resumo de line-up e checklist.
async function listEvents(userId, { when = "upcoming" } = {}) {
  // "Próximos" inclui o próprio dia: um evento que começou há pouco ainda aparece.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const dateFilter =
    when === "past" ? { startsAt: { lt: startOfToday } } : when === "all" ? {} : { startsAt: { gte: startOfToday } };

  const projects = await prisma.project.findMany({
    where: {
      kind: "event",
      archivedAt: null,
      OR: [{ ownerId: userId }, { members: { some: { userId, status: "accepted" } } }],
      eventInfo: { is: dateFilter },
    },
    select: {
      id: true,
      name: true,
      status: true,
      coverUrl: true,
      ownerId: true,
      updatedAt: true,
      eventInfo: true,
      lineup: { select: { status: true } },
      tasks: { select: { done: true } },
      members: { where: { userId, status: "accepted" }, select: { role: true } },
    },
    orderBy: { eventInfo: { startsAt: when === "past" ? "desc" : "asc" } },
  });

  return projects.map(({ lineup, tasks, members, ...project }) => ({
    ...project,
    myRole: project.ownerId === userId ? "owner" : members[0]?.role === "owner" ? "editor" : members[0]?.role || "viewer",
    lineup: lineupCounts(lineup),
    checklist: { total: tasks.length, done: tasks.filter((task) => task.done).length },
  }));
}

async function getEvent(userId, projectId) {
  const { role } = await ensureEventRole(userId, projectId, "viewer");

  const event = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      eventInfo: true,
      owner: { select: PUBLIC_USER_SELECT },
      members: { select: MEMBER_SELECT },
      lineup: { select: SLOT_SELECT, orderBy: [{ position: "asc" }, { createdAt: "asc" }] },
      tasks: { include: { assignee: { select: PUBLIC_USER_SELECT } }, orderBy: [{ done: "asc" }, { dueDate: "asc" }] },
      events: {
        include: { participants: { include: { user: { select: PUBLIC_USER_SELECT } } } },
        orderBy: { startsAt: "asc" },
      },
      _count: { select: { files: true } },
    },
  });

  const lineup = event.lineup.map((slot) => presentSlot(slot, role));
  return {
    ...event,
    myRole: role,
    lineup,
    lineupSummary: {
      ...lineupCounts(event.lineup),
      ...(canSeeFees(role) ? { feeTotalCents: feeTotal(event.lineup) } : {}),
    },
  };
}

async function updateEvent(userId, projectId, body) {
  const { project } = await ensureEventRole(userId, projectId, "editor");
  const current = await prisma.eventInfo.findUnique({ where: { projectId } });
  const data = parseUpdateEvent(body, current || {});

  const projectData = {};
  if (data.name !== undefined) projectData.name = data.name;
  if (data.description !== undefined) projectData.description = data.description;
  if (data.coverUrl !== undefined) projectData.coverUrl = data.coverUrl;
  if (data.status !== undefined) projectData.status = data.status;

  // Fechar a chamada (callOpen = false) não apaga prazo e vagas: dá para reabrir depois.
  const info = eventInfoData(data);

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.project.update({
      where: { id: projectId },
      data: {
        ...projectData,
        ...(Object.keys(info).length ? { eventInfo: { update: info } } : {}),
      },
      include: { eventInfo: true },
    });
    if (data.status && data.status !== project.status) {
      await tx.projectStatusLog.create({
        data: { projectId, fromStatus: project.status, toStatus: data.status, changedBy: userId },
      });
    }
    return result;
  });

  return updated;
}

async function archiveEvent(userId, projectId) {
  await ensureEventRole(userId, projectId, "owner");
  return prisma.project.update({ where: { id: projectId }, data: { archivedAt: new Date() } });
}

// ---------- Line-up ----------

async function addSlot(userId, projectId, body) {
  const { project } = await ensureEventRole(userId, projectId, "editor");
  const data = createSlotSchema.parse(body || {});

  const count = await prisma.lineupSlot.count({ where: { projectId } });
  if (count >= MAX_SLOTS_PER_EVENT) throw httpError(400, `O line-up pode ter no máximo ${MAX_SLOTS_PER_EVENT} atrações`);

  let artist = null;
  if (data.userId) {
    artist = await prisma.user.findFirst({
      where: { id: data.userId, isActive: true },
      select: { id: true, name: true },
    });
    if (!artist) throw httpError(404, "Artista não encontrado");
    const already = await prisma.lineupSlot.findFirst({ where: { projectId, userId: artist.id }, select: { id: true } });
    if (already) throw httpError(409, "Essa pessoa já está no line-up");
  }

  const last = await prisma.lineupSlot.findFirst({
    where: { projectId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const slot = await prisma.lineupSlot.create({
    data: {
      projectId,
      userId: artist?.id ?? null,
      name: data.name || artist.name,
      role: data.role,
      startTime: data.startTime ?? null,
      feeCents: data.feeCents ?? null,
      notes: data.notes ?? null,
      position: (last?.position ?? -1) + 1,
      // Quem não tem conta não tem como responder: começa como convidado e a equipe atualiza.
      status: "invited",
    },
    select: SLOT_SELECT,
  });

  if (artist) {
    await createNotification({
      userId: artist.id,
      actorId: userId,
      type: "lineup_invite",
      message: `Você foi convidado para o line-up de ${project.name}`,
      link: "/eventos/convites",
    });
  }

  return slot;
}

async function findSlot(projectId, slotId) {
  const slot = await prisma.lineupSlot.findFirst({ where: { id: slotId, projectId }, select: SLOT_SELECT });
  if (!slot) throw httpError(404, "Atração não encontrada no line-up");
  return slot;
}

async function updateSlot(userId, projectId, slotId, body) {
  await ensureEventRole(userId, projectId, "editor");
  const data = updateSlotSchema.parse(body || {});
  await findSlot(projectId, slotId);

  return prisma.lineupSlot.update({
    where: { id: slotId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.role !== undefined ? { role: data.role } : {}),
      ...(data.startTime !== undefined ? { startTime: data.startTime } : {}),
      ...(data.feeCents !== undefined ? { feeCents: data.feeCents } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    },
    select: SLOT_SELECT,
  });
}

async function removeSlot(userId, projectId, slotId) {
  await ensureEventRole(userId, projectId, "editor");
  await findSlot(projectId, slotId);
  await prisma.lineupSlot.delete({ where: { id: slotId } });
  return { ok: true };
}

// Recebe a lista completa de IDs na nova ordem. Precisa conter exatamente as atrações do evento,
// para não dar para mexer em atração de outro evento.
async function reorderLineup(userId, projectId, body) {
  const { role } = await ensureEventRole(userId, projectId, "editor");
  const { ids } = reorderSchema.parse(body || {});

  const slots = await prisma.lineupSlot.findMany({ where: { projectId }, select: { id: true } });
  const known = new Set(slots.map((slot) => slot.id));
  const unique = new Set(ids);
  if (unique.size !== ids.length || ids.length !== known.size || ids.some((id) => !known.has(id))) {
    throw httpError(400, "A nova ordem precisa ter todas as atrações do line-up, uma vez cada");
  }

  await prisma.$transaction(ids.map((id, position) => prisma.lineupSlot.update({ where: { id }, data: { position } })));

  const lineup = await prisma.lineupSlot.findMany({ where: { projectId }, select: SLOT_SELECT, orderBy: { position: "asc" } });
  return lineup.map((slot) => presentSlot(slot, role));
}

// ---------- Lado do artista convidado ----------

// Convites de line-up que a pessoa recebeu. Não mostra cachê nem observações internas:
// isso é combinado entre a equipe e o artista fora daqui por enquanto.
async function listMyLineupInvites(userId) {
  const slots = await prisma.lineupSlot.findMany({
    where: { userId, project: { kind: "event", archivedAt: null } },
    select: {
      id: true,
      role: true,
      startTime: true,
      status: true,
      createdAt: true,
      project: {
        select: {
          id: true,
          name: true,
          coverUrl: true,
          owner: { select: PUBLIC_USER_SELECT },
          eventInfo: { select: { slug: true, type: true, startsAt: true, endsAt: true, venueName: true, venueAddress: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return slots;
}

async function respondToLineup(userId, slotId, body) {
  const { accept } = respondSchema.parse(body || {});
  const slot = await prisma.lineupSlot.findFirst({
    where: { id: slotId, userId, project: { kind: "event", archivedAt: null } },
    select: { id: true, status: true, project: { select: { id: true, name: true, ownerId: true } } },
  });
  if (!slot) throw httpError(404, "Convite não encontrado");

  const status = accept ? "confirmed" : "declined";
  const updated = await prisma.lineupSlot.update({
    where: { id: slotId },
    data: { status },
    select: { id: true, status: true, role: true, startTime: true },
  });

  if (slot.status !== status) {
    await createNotification({
      userId: slot.project.ownerId,
      actorId: userId,
      type: accept ? "lineup_accept" : "lineup_decline",
      message: accept ? `Presença confirmada no line-up de ${slot.project.name}` : `Convite recusado no line-up de ${slot.project.name}`,
      link: `/eventos/${slot.project.id}`,
    });
  }

  return updated;
}

module.exports = {
  createEvent,
  listEvents,
  getEvent,
  updateEvent,
  archiveEvent,
  addSlot,
  updateSlot,
  removeSlot,
  reorderLineup,
  listMyLineupInvites,
  respondToLineup,
  // exportados para teste
  presentSlot,
  feeTotal,
  lineupCounts,
  uniqueSlug,
  ensureEventRole,
};
