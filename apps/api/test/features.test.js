// Testes dos recursos do redesign: comentários com tempo, tarefas, perfil e forma de onda.
// Usa um banco falso em memória (sem Postgres), como o security.test.js.
process.env.JWT_ACCESS_SECRET = "test_access_secret";
process.env.JWT_REFRESH_SECRET = "test_refresh_secret";
process.env.LOG_LEVEL = process.env.LOG_LEVEL || "error";

const { test, beforeEach } = require("node:test");
const assert = require("node:assert");
const path = require("path");

const prismaPath = require.resolve(path.join(__dirname, "../src/lib/prisma"));
const calls = [];
let db;

function model(name, impl = {}) {
  return new Proxy(impl, {
    get(target, method) {
      return async (args) => {
        calls.push({ model: name, method, args });
        if (target[method]) return target[method](args);
        if (method === "count") return 0;
        if (method === "findMany") return [];
        if (method === "deleteMany" || method === "updateMany") return { count: 0 };
        return null;
      };
    },
  });
}

const fakePrisma = new Proxy({}, { get: (_, name) => db[name] || model(name) });
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: fakePrisma };

const request = require("supertest");
const app = require("../src/app");
const { signAccessToken } = require("../src/utils/jwt");
const { parseAudioMeta } = require("../src/utils/audioMeta");

const token = (sub) => `Bearer ${signAccessToken({ sub })}`;
const PROJECT = { id: "p1", ownerId: "owner", name: "Noite em SP", archivedAt: null };
const called = (m, method) => calls.some((c) => c.model === m && c.method === method);

function withRole(role) {
  return model("projectMember", {
    findFirst: ({ where }) => (where.userId === "member" && where.status === "accepted" ? { role } : null),
  });
}

beforeEach(() => {
  calls.length = 0;
  db = {
    project: model("project", { findUnique: () => PROJECT }),
    projectMember: withRole("viewer"),
  };
});

test("comentar em arquivo de OUTRO projeto é bloqueado (IDOR)", async () => {
  db.fileAsset = model("fileAsset", { findFirst: () => null });
  const res = await request(app)
    .post("/projects/p1/files/arquivo-de-outro-projeto/comments")
    .set("Authorization", token("member"))
    .send({ content: "oi", atSeconds: 10 });
  assert.equal(res.status, 404);
  assert.ok(!called("fileComment", "create"));
});

test("quem não é do projeto não lê comentários", async () => {
  const res = await request(app).get("/projects/p1/files/f1/comments").set("Authorization", token("stranger"));
  assert.equal(res.status, 403);
});

test("ouvinte pode comentar num momento da faixa e o dono é avisado", async () => {
  db.fileAsset = model("fileAsset", { findFirst: () => ({ id: "f1", durationSec: 221, versions: [{ version: "v3" }] }) });
  db.fileComment = model("fileComment", {
    create: ({ data }) => ({ id: "c1", ...data, user: { id: "member", name: "Lia" } }),
  });
  db.notification = model("notification", { create: ({ data }) => ({ id: "n1", ...data }) });
  const res = await request(app)
    .post("/projects/p1/files/f1/comments")
    .set("Authorization", token("member"))
    .send({ content: "O grave estoura aqui", atSeconds: 84.37 });
  assert.equal(res.status, 201);
  assert.equal(res.body.atSeconds, 84.4);
  const notified = calls.filter((c) => c.model === "notification" && c.method === "create");
  assert.equal(notified.length, 1);
  assert.equal(notified[0].args.data.userId, "owner");
  assert.match(notified[0].args.data.message, /v3 de Noite em SP em 1:24/);
});

test("momento do comentário fora da duração da faixa é recusado", async () => {
  db.fileAsset = model("fileAsset", { findFirst: () => ({ id: "f1", durationSec: 60, versions: [] }) });
  const res = await request(app)
    .post("/projects/p1/files/f1/comments")
    .set("Authorization", token("member"))
    .send({ content: "x", atSeconds: 500 });
  assert.equal(res.status, 400);
});

test("ouvinte não cria tarefa", async () => {
  const res = await request(app).post("/projects/p1/tasks").set("Authorization", token("member")).send({ title: "Mixar" });
  assert.equal(res.status, 403);
});

test("editar tarefa de OUTRO projeto é bloqueado (IDOR)", async () => {
  db.projectMember = withRole("editor");
  db.taskCard = model("taskCard", { findFirst: () => null });
  const res = await request(app)
    .patch("/projects/p1/tasks/tarefa-de-outro-projeto")
    .set("Authorization", token("member"))
    .send({ done: true });
  assert.equal(res.status, 404);
  assert.ok(!called("taskCard", "update"));
});

test("responsável da tarefa precisa ser do projeto", async () => {
  db.projectMember = model("projectMember", {
    findFirst: ({ where }) => (where.userId === "member" ? { role: "editor", id: "m1" } : null),
  });
  const res = await request(app)
    .post("/projects/p1/tasks")
    .set("Authorization", token("member"))
    .send({ title: "Gravar voz", assigneeId: "estranho" });
  assert.equal(res.status, 400);
  assert.ok(!called("taskCard", "create"));
});

test("BPM fora da faixa é recusado", async () => {
  const res = await request(app).put("/projects/p1").set("Authorization", token("owner")).send({ bpm: 900 });
  assert.equal(res.status, 400);
});

test("perfil: gêneros demais são recusados", async () => {
  const res = await request(app)
    .put("/users/me")
    .set("Authorization", token("u1"))
    .send({ genres: ["a", "b", "c", "d", "e", "f", "g", "h", "i"] });
  assert.equal(res.status, 400);
});

test("perfil: salva função, cidade e aberto a colaborar", async () => {
  db.user = model("user", { update: ({ data }) => ({ id: "u1", ...data }) });
  const res = await request(app)
    .put("/users/me")
    .set("Authorization", token("u1"))
    .send({ role: "Beatmaker", city: "Itapevi", genres: ["Trap", "Trap", "R&B"], openToCollab: true });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.genres, ["Trap", "R&B"]);
  assert.equal(res.body.openToCollab, true);
});

test("forma de onda: aceita só números entre 0 e 1", () => {
  assert.deepEqual(parseAudioMeta({ durationSec: "221.34", peaks: "[0.1,0.55555,1]" }), { durationSec: 221.3, peaks: [0.1, 0.556, 1] });
  assert.deepEqual(parseAudioMeta({ peaks: [0.1, 7] }), {});
  assert.deepEqual(parseAudioMeta({ peaks: "<script>" }), {});
  assert.deepEqual(parseAudioMeta({ durationSec: -5 }), {});
  assert.deepEqual(parseAudioMeta({ peaks: new Array(401).fill(0.5) }), {});
});
