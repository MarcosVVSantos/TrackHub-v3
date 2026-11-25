// Integração (Postgres de verdade, roda na CI): fluxo completo do "Entrar com Google".
const { test, before, after } = require("node:test");
const assert = require("node:assert");
const path = require("path");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const request = require("supertest");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "../.env") });
const CLIENT_ID = "trackhub-ci.apps.googleusercontent.com";
process.env.GOOGLE_CLIENT_ID = CLIENT_ID;

const app = require("../src/app");
const prisma = require("../src/lib/prisma");

const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const KID = "ci-key";
const unique = Date.now();
const newEmail = `google-novo-${unique}@trackhub.local`;
const oldEmail = `google-antigo-${unique}@trackhub.local`;
let originalFetch;

before(async () => {
  originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    if (String(url).includes("googleapis.com/oauth2/v3/certs")) {
      return {
        ok: true,
        headers: new Map([["cache-control", "max-age=60"]]),
        json: async () => ({ keys: [{ ...publicKey.export({ format: "jwk" }), kid: KID, alg: "RS256" }] }),
      };
    }
    return originalFetch(url, options);
  };
  await prisma.user.create({
    data: { email: oldEmail, username: `antigo_${unique}`, name: "Antigo", passwordHash: await bcrypt.hash("senha123", 10) },
  });
});

after(async () => {
  global.fetch = originalFetch;
  const users = await prisma.user.findMany({ where: { email: { in: [newEmail, oldEmail] } }, select: { id: true } });
  const ids = users.map((user) => user.id);
  await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
});

const idToken = (sub, email) =>
  jwt.sign({ sub, email, email_verified: true, name: "Pessoa Teste" }, privateKey, {
    algorithm: "RS256",
    keyid: KID,
    audience: CLIENT_ID,
    issuer: "https://accounts.google.com",
    expiresIn: "5m",
  });

test("primeiro acesso com Google cria a conta (sem senha)", async () => {
  const response = await request(app).post("/auth/google").send({ credential: idToken(`g-${unique}`, newEmail) });
  assert.strictEqual(response.status, 201);
  assert.ok(response.body.accessToken && response.body.refreshToken);
  assert.strictEqual(response.body.isNew, true);
  const user = await prisma.user.findUnique({ where: { email: newEmail } });
  assert.strictEqual(user.googleId, `g-${unique}`);
  assert.strictEqual(user.passwordHash, null);
  assert.match(user.username, /^[a-zA-Z0-9_.]{3,30}$/);
});

test("segundo acesso entra na mesma conta", async () => {
  const response = await request(app).post("/auth/google").send({ credential: idToken(`g-${unique}`, newEmail) });
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.isNew, false);
  assert.strictEqual(await prisma.user.count({ where: { email: newEmail } }), 1);
});

test("conta antiga (com senha) é ligada ao Google pelo e-mail, e a senha continua valendo", async () => {
  const response = await request(app).post("/auth/google").send({ credential: idToken(`g2-${unique}`, oldEmail) });
  assert.strictEqual(response.status, 200);
  const user = await prisma.user.findUnique({ where: { email: oldEmail } });
  assert.strictEqual(user.googleId, `g2-${unique}`);
  const login = await request(app).post("/auth/login").send({ email: oldEmail, password: "senha123" });
  assert.strictEqual(login.status, 200);
});

test("conta só-Google não entra com senha nenhuma", async () => {
  const login = await request(app).post("/auth/login").send({ email: newEmail, password: "qualquerCoisa1" });
  assert.strictEqual(login.status, 401);
});
