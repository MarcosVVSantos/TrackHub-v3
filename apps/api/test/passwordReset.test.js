const { test, before, after } = require("node:test");
const assert = require("node:assert");
const path = require("path");
const request = require("supertest");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "../.env") });
process.env.EMAIL_DRIVER = "memory";

const app = require("../src/app");
const prisma = require("../src/lib/prisma");
const { outbox } = require("../src/services/emailService");

let user;

before(async () => {
  const unique = Date.now();
  user = await prisma.user.create({
    data: {
      email: `reset-${unique}@trackhub.local`,
      username: `reset_${unique}`,
      name: "Reset",
      passwordHash: await bcrypt.hash("senhaAntiga1", 10),
    },
  });
});

after(async () => {
  if (user?.id) {
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
  await prisma.$disconnect();
});

const tokenFromOutbox = () => {
  const mail = [...outbox].reverse().find((item) => item.to === user.email);
  return mail && new URL(/https?:\/\/\S+/.exec(mail.text)[0]).searchParams.get("token");
};

test("e-mail desconhecido recebe a mesma resposta (não revela contas)", async () => {
  const response = await request(app).post("/auth/forgot-password").send({ email: "ninguem@trackhub.local" });
  assert.strictEqual(response.status, 200);
  assert.match(response.body.message, /Se existir uma conta/);
});

test("fluxo completo: pedir link, trocar senha, entrar com a nova", async () => {
  const login = await request(app).post("/auth/login").send({ email: user.email, password: "senhaAntiga1" });
  assert.strictEqual(login.status, 200);

  const asked = await request(app).post("/auth/forgot-password").send({ email: user.email.toUpperCase() });
  assert.strictEqual(asked.status, 200);
  await new Promise((resolve) => setTimeout(resolve, 50));
  const token = tokenFromOutbox();
  assert.ok(token, "o e-mail deveria ter o link com token");

  const stored = await prisma.passwordResetToken.findFirst({ where: { userId: user.id } });
  assert.notStrictEqual(stored.tokenHash, token, "o banco guarda só o hash");

  const weak = await request(app).post("/auth/reset-password").send({ token, password: "curta" });
  assert.strictEqual(weak.status, 400);

  const reset = await request(app).post("/auth/reset-password").send({ token, password: "senhaNova123" });
  assert.strictEqual(reset.status, 200);

  // sessões antigas caem
  const refreshed = await request(app).post("/auth/refresh").send({ refreshToken: login.body.refreshToken });
  assert.strictEqual(refreshed.status, 401);

  const oldPassword = await request(app).post("/auth/login").send({ email: user.email, password: "senhaAntiga1" });
  assert.strictEqual(oldPassword.status, 401);
  const newPassword = await request(app).post("/auth/login").send({ email: user.email, password: "senhaNova123" });
  assert.strictEqual(newPassword.status, 200);

  const reused = await request(app).post("/auth/reset-password").send({ token, password: "outraSenha123" });
  assert.strictEqual(reused.status, 400, "o link só vale uma vez");
});

test("link expirado é recusado", async () => {
  await request(app).post("/auth/forgot-password").send({ email: user.email });
  await new Promise((resolve) => setTimeout(resolve, 50));
  const token = tokenFromOutbox();
  await prisma.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { expiresAt: new Date(Date.now() - 1000) } });
  const response = await request(app).post("/auth/reset-password").send({ token, password: "senhaNova456" });
  assert.strictEqual(response.status, 400);
});
