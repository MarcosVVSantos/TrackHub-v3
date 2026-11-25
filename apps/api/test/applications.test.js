const path = require("path");

// Banco falso em memória: testa as regras da página pública e das inscrições sem Postgres.
const now = Date.now();
const future = (days) => new Date(now + days * 86400000);
let db;

function reset() {
  db = {
    infos: [
      { slug: "batalha", projectId: "ev1", published: true, callOpen: true, callDeadline: future(5), startsAt: future(10), endsAt: null },
      { slug: "rascunho", projectId: "ev2", published: false, callOpen: true, startsAt: future(10) },
      { slug: "fechada", projectId: "ev3", published: true, callOpen: true, callDeadline: future(-1), startsAt: future(10) },
    ],
    projects: [
      { id: "ev1", kind: "event", archivedAt: null, ownerId: "dona", name: "Batalha" },
      { id: "ev2", kind: "event", archivedAt: null, ownerId: "dona", name: "Rascunho" },
      { id: "ev3", kind: "event", archivedAt: null, ownerId: "dona", name: "Fechada" },
    ],
    members: [{ projectId: "ev1", userId: "leitor", status: "accepted", role: "viewer" }],
    tracks: [
      { id: "minha", ownerId: "mc", isPublic: true },
      { id: "alheia", ownerId: "outra", isPublic: true },
    ],
    applications: [],
    created: [],
  };
}

const project = (id) => db.projects.find((p) => p.id === id) || null;

const fakePrisma = {
  eventInfo: {
    findUnique: async ({ where }) => {
      const info = db.infos.find((i) => i.slug === where.slug || i.projectId === where.projectId);
      if (!info) return null;
      return where.slug ? { published: info.published, project: project(info.projectId) } : info;
    },
  },
  project: { findUnique: async ({ where }) => project(where.id) },
  projectMember: {
    findFirst: async ({ where }) =>
      db.members.find((m) => m.projectId === where.projectId && m.userId === where.userId && m.status === where.status) || null,
  },
  lineupSlot: { findFirst: async () => null },
  eventApplication: {
    findUnique: async ({ where }) =>
      db.applications.find((a) => a.projectId === where.projectId_userId.projectId && a.userId === where.projectId_userId.userId) || null,
    findFirst: async ({ where }) => db.applications.find((a) => a.id === where.id && a.projectId === where.projectId) || null,
    count: async () => db.applications.length,
    create: async ({ data }) => {
      db.created.push(data);
      return { id: "nova", status: "pending" };
    },
  },
  track: {
    findFirst: async ({ where }) =>
      db.tracks.find((t) => t.id === where.id && t.isPublic && t.ownerId === where.project.ownerId) || null,
  },
  notification: { create: async ({ data }) => data },
};
require.cache[require.resolve(path.join(__dirname, "../src/lib/prisma"))] = { exports: fakePrisma };

const { test, beforeEach } = require("node:test");
const assert = require("node:assert");
const service = require("../src/services/applicationService");
const { applySchema } = require("../src/utils/eventInput");

beforeEach(reset);

const rejects = (promise, status, pattern) =>
  assert.rejects(promise, (err) => err.status === status && (!pattern || pattern.test(err.message)));

const valid = { artistName: "Kaizen", role: "MC", city: "Jandira", trackId: "minha", message: "Quero revanche!", acceptRules: true };

test("prazo e fim do evento são conferidos no servidor", () => {
  assert.strictEqual(service.isCallOpen({ callOpen: true, startsAt: future(3) }), true);
  assert.strictEqual(service.isCallOpen({ callOpen: false, startsAt: future(3) }), false);
  assert.strictEqual(service.isCallOpen({ callOpen: true, callDeadline: future(-1), startsAt: future(3) }), false);
  assert.strictEqual(service.isCallOpen({ callOpen: true, startsAt: future(-1) }), false);
});

test("evento não publicado não aparece nem aceita inscrição (404)", async () => {
  await rejects(service.getPublicEvent("rascunho"), 404);
  await rejects(service.getPublicEvent("nao-existe"), 404);
  await rejects(service.apply("mc", "rascunho", valid), 404);
});

test("inscrição: chamada fechada, equipe e faixa de outra pessoa são recusadas", async () => {
  await rejects(service.apply("mc", "fechada", valid), 400, /fechadas/);
  await rejects(service.apply("dona", "batalha", valid), 400, /equipe/);
  await rejects(service.apply("leitor", "batalha", valid), 400, /equipe/);
  await rejects(service.apply("mc", "batalha", { ...valid, trackId: "alheia" }), 400, /faixa pública sua/);
});

test("inscrição válida é criada só com os campos permitidos", async () => {
  const result = await service.apply("mc", "batalha", { ...valid, status: "approved", projectId: "outro" });
  assert.strictEqual(result.status, "pending");
  const saved = db.created[0];
  assert.strictEqual(saved.projectId, "ev1");
  assert.strictEqual(saved.userId, "mc");
  assert.strictEqual("status" in saved, false);
});

test("segunda inscrição da mesma pessoa é recusada (409)", async () => {
  db.applications.push({ id: "a1", projectId: "ev1", userId: "mc" });
  await rejects(service.apply("mc", "batalha", valid), 409);
});

test("formulário: regras aceitas, amostra obrigatória e link só http(s)", () => {
  assert.throws(() => applySchema.parse({ ...valid, acceptRules: false }), /aceite as regras/);
  assert.throws(() => applySchema.parse({ ...valid, trackId: undefined }), /amostra/);
  assert.throws(() => applySchema.parse({ ...valid, trackId: undefined, sampleUrl: "javascript:alert(1)" }));
  assert.throws(() => applySchema.parse({ ...valid, message: "x".repeat(281) }), /280/);
  assert.strictEqual(applySchema.parse({ ...valid, trackId: undefined, sampleUrl: "https://soundcloud.com/kaizen" }).sampleUrl, "https://soundcloud.com/kaizen");
});

test("inscrições recebidas: só editores e dona", async () => {
  await rejects(service.listApplications("leitor", "ev1"), 403);
  await rejects(service.listApplications("estranho", "ev1"), 404);
  await rejects(service.setApplicationStatus("leitor", "ev1", "a1", { status: "approved" }), 403);
});
