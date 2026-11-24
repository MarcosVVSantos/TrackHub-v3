// Testes de observabilidade: ID de requisição, health checks, erros e log de segurança.
process.env.JWT_ACCESS_SECRET = "test_access_secret";
process.env.JWT_REFRESH_SECRET = "test_refresh_secret";
process.env.R2_BUCKET = "test-bucket";
process.env.R2_ENDPOINT = "http://127.0.0.1:9";
process.env.R2_ACCESS_KEY_ID = "x";
process.env.R2_SECRET_ACCESS_KEY = "x";
process.env.LOG_LEVEL = "info";

const { test, beforeEach } = require("node:test");
const assert = require("node:assert");
const path = require("path");

const prismaPath = require.resolve(path.join(__dirname, "../src/lib/prisma"));
let db;
const fakePrisma = new Proxy({}, { get: (_, name) => db[name] });
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: fakePrisma };

// Captura as linhas de log (JSON) escritas pela API.
const logLines = [];
for (const stream of [process.stdout, process.stderr]) {
  const original = stream.write.bind(stream);
  stream.write = (chunk, ...rest) => {
    const text = String(chunk);
    if (text.startsWith("{\"time\"")) {
      logLines.push(JSON.parse(text));
      return true;
    }
    return original(chunk, ...rest);
  };
}

const request = require("supertest");
const app = require("../src/app");
const { signAccessToken } = require("../src/utils/jwt");

beforeEach(() => {
  logLines.length = 0;
  db = {
    $queryRaw: async () => [{ "?column?": 1 }],
    project: { findUnique: async () => ({ id: "p1", ownerId: "owner" }), findFirst: async () => null },
    projectMember: { findFirst: async () => null },
  };
});

test("toda resposta traz X-Request-Id e a requisição vira uma linha de log", async () => {
  const res = await request(app).get("/plan/me");
  assert.match(res.headers["x-request-id"], /^[0-9a-f-]{36}$/);
  const line = logLines.find((l) => l.msg === "request" && l.path === "/plan/me");
  assert.ok(line, "linha de log da requisição");
  assert.equal(line.requestId, res.headers["x-request-id"]);
  assert.equal(line.status, 401);
  assert.equal(typeof line.durationMs, "number");
});

test("reaproveita um X-Request-Id válido vindo do cliente", async () => {
  const res = await request(app).get("/health").set("X-Request-Id", "abc12345-cliente");
  assert.equal(res.headers["x-request-id"], "abc12345-cliente");
});

test("/health é leve e não toca no banco", async () => {
  db.$queryRaw = async () => { throw new Error("banco fora"); };
  const res = await request(app).get("/health");
  assert.equal(res.status, 200);
});

test("/ready responde 503 quando o banco cai, sem expor o erro", async () => {
  db.$queryRaw = async () => { throw new Error("connection refused db.internal:5432"); };
  const res = await request(app).get("/ready");
  assert.equal(res.status, 503);
  assert.equal(res.body.checks.database.ok, false);
  assert.ok(!JSON.stringify(res.body).includes("db.internal"));
  assert.ok(logLines.some((l) => l.msg === "readiness_check_failed" && l.check === "database"));
});

test("erro 500 devolve requestId e é registrado com o mesmo ID", async () => {
  db.project.findFirst = async () => { throw new Error("explodiu"); };
  const res = await request(app).get("/projects/p1/history").set("Authorization", `Bearer ${signAccessToken({ sub: "u1" })}`);
  assert.equal(res.status, 500);
  assert.equal(res.body.requestId, res.headers["x-request-id"]);
  const errorLine = logLines.find((l) => l.msg === "unhandled_error");
  assert.equal(errorLine.requestId, res.body.requestId);
  assert.equal(errorLine.userId, "u1");
});

test("acesso negado vira evento de segurança", async () => {
  await request(app).get("/projects/p1/files").set("Authorization", `Bearer ${signAccessToken({ sub: "intruso" })}`);
  const event = logLines.find((l) => l.msg === "security" && l.type === "access_denied");
  assert.ok(event);
  assert.equal(event.userId, "intruso");
});

test("login falho vira evento de segurança sem guardar o email", async () => {
  db.user = { findUnique: async () => null };
  await request(app).post("/auth/login").send({ email: "marcos@exemplo.com", password: "errada123" });
  const event = logLines.find((l) => l.msg === "security" && l.type === "login_failed");
  assert.ok(event);
  assert.equal(event.emailDomain, "exemplo.com");
  assert.ok(!JSON.stringify(logLines).includes("marcos@"));
  assert.ok(!JSON.stringify(logLines).includes("errada123"));
});

test("logger apaga campos sensíveis", () => {
  const logger = require("../src/utils/logger");
  logger.warn("teste", { refreshToken: "segredo", nested: { password: "123" } });
  const line = logLines.find((l) => l.msg === "teste");
  assert.equal(line.refreshToken, "[redacted]");
  assert.equal(line.nested.password, "[redacted]");
});
