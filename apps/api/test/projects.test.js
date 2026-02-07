const { test, before, after } = require("node:test");
const assert = require("node:assert");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs/promises");
const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");
const { signAccessToken } = require("../src/utils/jwt");

let user;
let token;
let project;
let audioFile;

before(async () => {
  const passwordHash = await bcrypt.hash("password123", 10);
  const unique = Date.now();
  user = await prisma.user.create({
    data: {
      email: `proj-${unique}@trackhub.local`,
      username: `proj_${unique}`,
      name: "Proj Tester",
      passwordHash,
    },
  });
  token = signAccessToken({ sub: user.id, email: user.email });
  project = await prisma.project.create({
    data: {
      name: "Projeto Teste",
      description: "Desc",
      status: "idea",
      order: 1,
      tags: ["lofi", "mix"],
      ownerId: user.id,
    },
  });

  const filename = `audio-${unique}.mp3`;
  const filePath = path.join(__dirname, "../", "uploads", filename);
  await fs.writeFile(filePath, Buffer.from("audio"));
  audioFile = await prisma.fileAsset.create({
    data: {
      projectId: project.id,
      uploaderId: user.id,
      name: filename,
      type: "audio/mpeg",
      url: `http://localhost:4000/uploads/${filename}`,
      storageKey: filename,
    },
  });
});

after(async () => {
  if (project?.id) {
    await prisma.projectStatusLog.deleteMany({ where: { projectId: project.id } });
  }
  if (audioFile?.id) {
    await prisma.fileAsset.delete({ where: { id: audioFile.id } });
    const filePath = path.join(__dirname, "../", "uploads", audioFile.storageKey);
    await fs.unlink(filePath).catch(() => null);
  }
  if (project?.id) {
    await prisma.project.delete({ where: { id: project.id } });
  }
  if (user?.id) {
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
  await prisma.$disconnect();
});

test("GET /projects/tags returns aggregated tags", async () => {
  const response = await request(app)
    .get("/projects/tags")
    .set("Authorization", `Bearer ${token}`);

  assert.strictEqual(response.statusCode, 200);
  assert.ok(response.body.includes("lofi"));
});

test("GET /projects filters by tags", async () => {
  const response = await request(app)
    .get("/projects?tags=lofi")
    .set("Authorization", `Bearer ${token}`);

  assert.strictEqual(response.statusCode, 200);
  assert.ok(response.body.some((item) => item.id === project.id));
});

test("PUT /projects/:id/order updates order", async () => {
  const response = await request(app)
    .put(`/projects/${project.id}/order`)
    .set("Authorization", `Bearer ${token}`)
    .send({ order: 3, status: "production" });

  assert.strictEqual(response.statusCode, 200);
  assert.strictEqual(response.body.order, 3);
  assert.strictEqual(response.body.status, "production");
});

test("GET /projects/:id/history returns status history", async () => {
  await prisma.projectStatusLog.create({
    data: {
      projectId: project.id,
      fromStatus: "idea",
      toStatus: "production",
      changedBy: user.id,
    },
  });

  const response = await request(app)
    .get(`/projects/${project.id}/history`)
    .set("Authorization", `Bearer ${token}`);

  assert.strictEqual(response.statusCode, 200);
  assert.ok(Array.isArray(response.body));
});

test("GET /projects/:id/audio streams latest audio", async () => {
  const response = await request(app)
    .get(`/projects/${project.id}/audio`)
    .set("Authorization", `Bearer ${token}`);

  assert.strictEqual(response.statusCode, 200);
  assert.strictEqual(response.headers["content-type"], "audio/mpeg");
});
