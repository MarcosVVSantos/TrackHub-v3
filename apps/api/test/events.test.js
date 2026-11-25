const path = require("path");

// Banco falso em memória: só o suficiente para testar as regras do módulo de eventos
// (quem pode ver o cachê, quem pode editar, validação), sem precisar de Postgres.
const db = {
  projects: [],
  members: [],
  slots: [],
  eventInfos: [],
  notifications: [],
};

const fakePrisma = {
  project: {
    findUnique: async ({ where }) => db.projects.find((p) => p.id === where.id) || null,
  },
  projectMember: {
    findFirst: async ({ where }) =>
      db.members.find((m) => m.projectId === where.projectId && m.userId === where.userId && m.status === where.status) || null,
  },
  eventInfo: {
    findUnique: async ({ where }) => db.eventInfos.find((e) => e.slug === where.slug || e.projectId === where.projectId) || null,
  },
  lineupSlot: {
    findMany: async ({ where }) => db.slots.filter((s) => s.projectId === where.projectId).map((s) => ({ id: s.id })),
    findFirst: async ({ where }) =>
      db.slots.find(
        (s) =>
          s.id === where.id &&
          (where.projectId === undefined || s.projectId === where.projectId) &&
          (where.userId === undefined || s.userId === where.userId)
      ) || null,
    update: async () => {
      throw new Error("não deveria gravar");
    },
  },
  notification: { create: async ({ data }) => (db.notifications.push(data), data) },
  $transaction: async () => {
    throw new Error("não deveria gravar");
  },
};
require.cache[require.resolve(path.join(__dirname, "../src/lib/prisma"))] = { exports: fakePrisma };

const { test, beforeEach } = require("node:test");
const assert = require("node:assert");

const eventService = require("../src/services/eventService");
const { parseCreateEvent, parseUpdateEvent, createSlotSchema, slugify } = require("../src/utils/eventInput");

beforeEach(() => {
  db.projects = [
    { id: "ev1", kind: "event", ownerId: "dona", archivedAt: null, status: "idea", name: "Batalha da Leste #12" },
    { id: "faixa1", kind: "track", ownerId: "dona", archivedAt: null, status: "idea", name: "Faixa" },
    { id: "ev-arq", kind: "event", ownerId: "dona", archivedAt: new Date(), status: "idea", name: "Antigo" },
  ];
  db.members = [
    { projectId: "ev1", userId: "editor", status: "accepted", role: "editor" },
    { projectId: "ev1", userId: "leitor", status: "accepted", role: "viewer" },
    { projectId: "ev1", userId: "pendente", status: "pending", role: "editor" },
  ];
  db.slots = [
    { id: "s1", projectId: "ev1", userId: "mc", status: "invited" },
    { id: "s2", projectId: "ev1", userId: null, status: "confirmed" },
    { id: "outro", projectId: "ev-de-outra-pessoa", userId: null, status: "invited" },
  ];
  db.eventInfos = [{ projectId: "ev1", slug: "batalha-da-leste-12" }];
});

const rejects = (promise, status) => assert.rejects(promise, (err) => err.status === status);

// ---------- Quem pode o quê ----------

test("quem não participa do evento recebe 404, não 403", async () => {
  await rejects(eventService.ensureEventRole("estranho", "ev1"), 404);
  await rejects(eventService.ensureEventRole("pendente", "ev1"), 404);
});

test("projeto de faixa e evento arquivado não abrem como evento", async () => {
  await rejects(eventService.ensureEventRole("dona", "faixa1"), 404);
  await rejects(eventService.ensureEventRole("dona", "ev-arq"), 404);
});

test("viewer vê o evento mas não edita; editor edita; só a dona arquiva", async () => {
  assert.strictEqual((await eventService.ensureEventRole("leitor", "ev1", "viewer")).role, "viewer");
  await rejects(eventService.ensureEventRole("leitor", "ev1", "editor"), 403);
  assert.strictEqual((await eventService.ensureEventRole("editor", "ev1", "editor")).role, "editor");
  await rejects(eventService.archiveEvent("editor", "ev1"), 403);
  await rejects(eventService.addSlot("leitor", "ev1", { name: "Trio Ruído", role: "Banda" }), 403);
});

// ---------- Cachê ----------

const slot = { id: "s1", name: "DJ Kaique", status: "confirmed", feeCents: 30000, notes: "pix na hora" };

test("cachê e observações somem para quem é viewer", () => {
  const visto = eventService.presentSlot(slot, "viewer");
  assert.strictEqual("feeCents" in visto, false);
  assert.strictEqual("notes" in visto, false);
  assert.strictEqual(eventService.presentSlot(slot, "editor").feeCents, 30000);
  assert.strictEqual(eventService.presentSlot(slot, "owner").feeCents, 30000);
});

test("total previsto ignora quem recusou e quem não tem cachê", () => {
  const total = eventService.feeTotal([
    { status: "confirmed", feeCents: 30000 },
    { status: "invited", feeCents: 60000 },
    { status: "declined", feeCents: 15000 },
    { status: "invited", feeCents: null },
  ]);
  assert.strictEqual(total, 90000);
});

test("contagem do line-up por status", () => {
  assert.deepStrictEqual(
    eventService.lineupCounts([{ status: "confirmed" }, { status: "invited" }, { status: "invited" }, { status: "declined" }]),
    { total: 4, confirmed: 1, invited: 2, declined: 1 }
  );
});

// ---------- Line-up ----------

test("reordenar exige exatamente as atrações do evento", async () => {
  await rejects(eventService.reorderLineup("editor", "ev1", { ids: ["s1", "outro"] }), 400);
  await rejects(eventService.reorderLineup("editor", "ev1", { ids: ["s1"] }), 400);
  await rejects(eventService.reorderLineup("editor", "ev1", { ids: ["s1", "s1"] }), 400);
});

test("artista só responde ao próprio convite", async () => {
  await rejects(eventService.respondToLineup("intruso", "s1", { accept: true }), 404);
  await assert.rejects(eventService.respondToLineup("mc", "s1", {}), (err) => err.name === "ZodError");
});

test("não dá para mexer em atração de outro evento pela URL deste", async () => {
  await rejects(eventService.updateSlot("editor", "ev1", "outro", { role: "MC" }), 404);
  await rejects(eventService.removeSlot("editor", "ev1", "outro"), 404);
});

// ---------- Validação ----------

const base = { name: "Batalha da Leste #12", type: "battle", startsAt: "2026-12-13T22:00:00.000Z" };

test("cria com o mínimo e normaliza campos vazios", () => {
  const data = parseCreateEvent({ ...base, venueName: "", ticketUrl: "" });
  assert.strictEqual(data.venueName, null);
  assert.strictEqual(data.ticketUrl, null);
  assert.ok(data.startsAt instanceof Date);
});

test("link de ingresso só aceita http(s)", () => {
  assert.throws(() => parseCreateEvent({ ...base, ticketUrl: "javascript:alert(1)" }));
  assert.throws(() => parseCreateEvent({ ...base, ticketUrl: "data:text/html,oi" }));
  assert.strictEqual(parseCreateEvent({ ...base, ticketUrl: "https://www.sympla.com.br/x" }).ticketUrl, "https://www.sympla.com.br/x");
});

test("fim antes do início e prazo depois do evento são recusados", () => {
  assert.throws(() => parseCreateEvent({ ...base, endsAt: "2026-12-13T20:00:00.000Z" }), /depois do início/);
  assert.throws(() => parseCreateEvent({ ...base, callOpen: true, callDeadline: "2026-12-20T00:00:00.000Z" }), /até o dia do evento/);
});

test("na edição, as datas são conferidas contra o que já está salvo", () => {
  const current = { startsAt: new Date("2026-12-13T22:00:00.000Z"), endsAt: null, callDeadline: null };
  assert.throws(() => parseUpdateEvent({ endsAt: "2026-12-13T21:00:00.000Z" }, current), /depois do início/);
  assert.strictEqual(parseUpdateEvent({ status: "in_progress" }, current).status, "in_progress");
  assert.throws(() => parseUpdateEvent({ status: "publicado" }, current), /Etapa inválida/);
});

test("tipo inválido e flyer de fora do nosso armazenamento são recusados", () => {
  assert.throws(() => parseCreateEvent({ ...base, type: "rave" }), /Tipo de evento inválido/);
  assert.throws(() => parseCreateEvent({ ...base, coverUrl: "https://rastreador.example/flyer.png" }), /Flyer inválido/);
});

test("atração: horário no formato 21:30, cachê inteiro e não negativo", () => {
  assert.strictEqual(createSlotSchema.parse({ name: "Trio Ruído", role: "Banda", startTime: "21:30" }).startTime, "21:30");
  assert.throws(() => createSlotSchema.parse({ name: "Trio Ruído", role: "Banda", startTime: "25:00" }));
  assert.throws(() => createSlotSchema.parse({ name: "Trio Ruído", role: "Banda", feeCents: -1 }));
  assert.throws(() => createSlotSchema.parse({ name: "Trio Ruído", role: "Banda", feeCents: 10.5 }));
  assert.throws(() => createSlotSchema.parse({ role: "Banda" }), /Escolha um artista/);
});

test("slug legível e sem acentos", () => {
  assert.strictEqual(slugify("Batalha da Leste #12"), "batalha-da-leste-12");
  assert.strictEqual(slugify("Ação & Reação"), "acao-reacao");
  assert.strictEqual(slugify("!!!"), "evento");
});

test("slug repetido ganha sufixo", async () => {
  assert.strictEqual(await eventService.uniqueSlug("Batalha da Leste #12"), "batalha-da-leste-12-2");
  assert.strictEqual(await eventService.uniqueSlug("Sarau"), "sarau");
});
