const { test, before, after } = require("node:test");
const assert = require("node:assert");
const path = require("path");
const fs = require("fs/promises");
const request = require("supertest");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");
const { signAccessToken } = require("../src/utils/jwt");

dotenv.config({ path: path.join(__dirname, "../.env") });

let user;
let token;

before(async () => {
  const passwordHash = await bcrypt.hash("password123", 10);
  const unique = Date.now();
  user = await prisma.user.create({
    data: {
      email: `test-${unique}@trackhub.local`,
      username: `tester_${unique}`,
      name: "Tester",
      passwordHash,
    },
  });
  token = signAccessToken({ sub: user.id, email: user.email });
});

after(async () => {
  if (user?.id) {
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
  await prisma.$disconnect();
});

test("GET /users/me requires auth", async () => {
  const response = await request(app).get("/users/me");
  assert.strictEqual(response.statusCode, 401);
});

test("GET /users/me returns profile", async () => {
  const response = await request(app)
    .get("/users/me")
    .set("Authorization", `Bearer ${token}`);
  assert.strictEqual(response.statusCode, 200);
  assert.strictEqual(response.body.email, user.email);
});

test("PUT /users/me updates profile", async () => {
  const response = await request(app)
    .put("/users/me")
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "Tester Updated", username: `tester_${Date.now()}` });
  assert.strictEqual(response.statusCode, 200);
  assert.strictEqual(response.body.name, "Tester Updated");
});

test("POST /users/avatar uploads avatar", async () => {
  const buffer = Buffer.from("avatar");
  const response = await request(app)
    .post("/users/avatar")
    .set("Authorization", `Bearer ${token}`)
    .attach("avatar", buffer, { filename: "avatar.png", contentType: "image/png" });

  assert.strictEqual(response.statusCode, 200);
  assert.ok(response.body.avatarUrl);

  const filename = response.body.avatarUrl.split("/uploads/")[1];
  if (filename) {
    const filePath = path.join(__dirname, "../", "uploads", filename);
    await fs.unlink(filePath).catch(() => null);
  }
});
