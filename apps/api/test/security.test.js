// Testes de segurança: simulam ataques contra a API com um banco falso em memória.
// Não precisam de Postgres: o Prisma é substituído antes de carregar o app.
process.env.JWT_ACCESS_SECRET = "test_access_secret";
process.env.JWT_REFRESH_SECRET = "test_refresh_secret";
process.env.R2_PUBLIC_URL = "https://cdn.test";
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
const { signAccessToken, signRefreshToken } = require("../src/utils/jwt");
const { detectFileType } = require("../src/utils/fileType");
const { hashToken } = require("../src/services/authService");

const token = (sub) => `Bearer ${signAccessToken({ sub })}`;
const PROJECT = { id: "p1", ownerId: "owner", name: "Beat secreto", isPublic: false, archivedAt: null };

function memberRole(role) {
  return model("projectMember", { findFirst: ({ where }) => (where.userId === "member" && where.status === "accepted" ? { role } : null) });
}

beforeEach(() => {
  calls.length = 0;
  db = {
    project: model("project", { findUnique: () => PROJECT }),
    projectMember: memberRole("viewer"),
  };
});

test("faixa privada não abre para quem não está logado", async () => {
  db.track = model("track", { findUnique: () => ({ id: "t1", isPublic: false, project: { id: "p1", ownerId: "owner", archivedAt: null } }) });
  const res = await request(app).get("/tracks/t1");
  assert.equal(res.status, 404);
});

test("faixa pública não devolve email nem hash de senha de quem comentou", async () => {
  db.track = model("track", {
    findUnique: (args) => (args.select ? { id: "t2", isPublic: true, project: { id: "p1", archivedAt: null } } : { id: "t2" }),
  });
  const res = await request(app).get("/tracks/t2");
  assert.equal(res.status, 200);
  const query = calls.find((c) => c.model === "track" && c.args.include);
  const userQuery = query.args.include.comments.include.user;
  assert.ok(userQuery.select, "user precisa usar select");
  assert.equal(userQuery.select.passwordHash, undefined);
  assert.equal(userQuery.select.email, undefined);
});

test("dono não altera papel de membro de OUTRO projeto (IDOR)", async () => {
  db.project = model("project", { findUnique: () => ({ ...PROJECT, ownerId: "attacker" }) });
  db.projectMember = model("projectMember", { findFirst: () => null });
  const res = await request(app).put("/projects/p1/roles").set("Authorization", token("attacker")).send({ memberId: "m-outro", role: "editor" });
  assert.equal(res.status, 404);
  assert.ok(!calls.some((c) => c.model === "projectMember" && c.method === "update"));
});

test("convite não aceita papel de dono", async () => {
  const res = await request(app).post("/projects/p1/invite").set("Authorization", token("owner")).send({ username: "x", role: "owner" });
  assert.equal(res.status, 400);
});

test("remover parceiro sem userId não apaga todos os membros", async () => {
  const res = await request(app).delete("/projects/p1/partner/owner").set("Authorization", token("owner"));
  assert.equal(res.status, 400);
  assert.ok(!calls.some((c) => c.method === "deleteMany"));
});

test("membro não edita evento de outro projeto (IDOR)", async () => {
  db.projectMember = memberRole("editor");
  db.projectEvent = model("projectEvent", { findFirst: () => null });
  const res = await request(app).put("/calendar/projects/p1/events/e-outro").set("Authorization", token("member")).send({ title: "hack" });
  assert.equal(res.status, 404);
  assert.ok(!calls.some((c) => c.model === "projectEvent" && c.method === "update"));
});

test("ouvinte (viewer) não consegue enviar arquivo", async () => {
  const res = await request(app)
    .post("/projects/p1/files")
    .set("Authorization", token("member"))
    .attach("file", Buffer.from("ID3fake-mp3"), "beat.mp3");
  assert.equal(res.status, 403);
});

test("quem não é do projeto não consegue enviar arquivo", async () => {
  const res = await request(app)
    .post("/projects/p1/files")
    .set("Authorization", token("stranger"))
    .attach("file", Buffer.from("ID3fake-mp3"), "beat.mp3");
  assert.equal(res.status, 403);
});

test("HTML disfarçado de mp3 é recusado", async () => {
  db.projectMember = memberRole("editor");
  db.fileAsset = model("fileAsset", { aggregate: () => ({ _sum: { sizeBytes: 0n } }) });
  const res = await request(app)
    .post("/projects/p1/files")
    .set("Authorization", token("member"))
    .attach("file", Buffer.from("<html><script>alert(1)</script></html>"), { filename: "beat.mp3", contentType: "audio/mpeg" });
  assert.equal(res.status, 400);
});

test("post não pode citar projeto privado de outra pessoa", async () => {
  const res = await request(app).post("/feed/social").set("Authorization", token("attacker")).send({ content: "olha", projectId: "p1" });
  assert.equal(res.status, 404);
  assert.ok(!calls.some((c) => c.model === "socialPost" && c.method === "create"));
});

test("capa de projeto não aceita URL externa", async () => {
  const res = await request(app).put("/projects/p1").set("Authorization", token("owner")).send({ coverUrl: "https://evil.test/track.gif" });
  assert.equal(res.status, 400);
});

test("erro interno não vaza detalhes", async () => {
  const boom = () => { throw new Error("select * from \"User\" failed at db.internal:5432"); };
  db.project = model("project", { findUnique: boom, findFirst: boom });
  const res = await request(app).get("/projects/p1/history").set("Authorization", token("owner"));
  assert.equal(res.status, 500);
  assert.ok(!res.body.message.includes("User"));
});

test("cabeçalhos de segurança presentes", async () => {
  const res = await request(app).get("/health");
  assert.equal(res.headers["x-content-type-options"], "nosniff");
  assert.equal(res.headers["x-frame-options"], "DENY");
  assert.equal(res.headers["x-powered-by"], undefined);
});

test("refresh token é trocado a cada uso e reuso derruba todas as sessões", async () => {
  const store = new Map();
  db.user = model("user", { findUnique: () => ({ id: "u1", email: "a@a.com", username: "a", name: "A", isActive: true }) });
  db.refreshToken = model("refreshToken", {
    create: ({ data }) => { store.set(data.token, { id: data.token, ...data }); return data; },
    findUnique: ({ where }) => store.get(where.token) || null,
    update: ({ where, data }) => Object.assign(store.get(where.id), data),
    deleteMany: ({ where }) => {
      for (const [k, v] of store) if ((where.userId && v.userId === where.userId && !where.expiresAt) || where.token === k || where.id === k) store.delete(k);
      return { count: 0 };
    },
  });
  const first = signRefreshToken({ sub: "u1", jti: "a" });
  store.set(hashToken(first), { id: hashToken(first), token: hashToken(first), userId: "u1", expiresAt: new Date(Date.now() + 86400000) });

  const ok = await request(app).post("/auth/refresh").send({ refreshToken: first });
  assert.equal(ok.status, 200);
  assert.notEqual(ok.body.refreshToken, first, "deve emitir um refresh token novo");
  assert.ok(![...store.keys()].includes(ok.body.refreshToken), "o banco guarda só o hash");

  store.delete(hashToken(first)); // simula o fim da carência de 30s
  const reuse = await request(app).post("/auth/refresh").send({ refreshToken: first });
  assert.equal(reuse.status, 401);
  assert.equal(store.size, 0, "todas as sessões do usuário foram encerradas");
});

test("refresh sem token responde 401, não 500", async () => {
  const res = await request(app).post("/auth/refresh").send({});
  assert.equal(res.status, 401);
});

test("cadastro exige senha com 8+ caracteres, letras e números", async () => {
  const res = await request(app).post("/auth/register").send({ email: "a@a.com", username: "abc", name: "Ab", password: "123456" });
  assert.equal(res.status, 400);
});

test("detecção de tipo de arquivo pelos bytes", () => {
  assert.equal(detectFileType(Buffer.from("ID3\x04\x00"), "x.mp3").mime, "audio/mpeg");
  assert.equal(detectFileType(Buffer.from("RIFF\x00\x00\x00\x00WAVEfmt "), "x.wav").mime, "audio/wav");
  assert.equal(detectFileType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "x.png").mime, "image/png");
  assert.equal(detectFileType(Buffer.from("<svg onload=alert(1)>"), "x.svg"), null);
  assert.equal(detectFileType(Buffer.from("<html>"), "x.png"), null);
  const flp = detectFileType(Buffer.from("FLhd"), "projeto.flp");
  assert.equal(flp.download, true);
  assert.equal(flp.mime, "application/octet-stream");
});
