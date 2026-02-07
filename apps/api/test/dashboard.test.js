const { test, before, after } = require("node:test");
const assert = require("node:assert");
const bcrypt = require("bcryptjs");
const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");
const { signAccessToken } = require("../src/utils/jwt");

let user;
let token;
let project;
let track;
let fileAsset;
let fileVersion;

before(async () => {
  const passwordHash = await bcrypt.hash("password123", 10);
  const unique = Date.now();
  user = await prisma.user.create({
    data: {
      email: `dash-${unique}@trackhub.local`,
      username: `dash_${unique}`,
      name: "Dash Tester",
      passwordHash,
    },
  });
  token = signAccessToken({ sub: user.id, email: user.email });
  project = await prisma.project.create({
    data: {
      name: "Dashboard Project",
      status: "in_progress",
      ownerId: user.id,
    },
  });
  track = await prisma.track.create({
    data: {
      projectId: project.id,
      title: "Demo Track",
      description: "Demo",
      audioUrl: "http://localhost:4000/uploads/demo.mp3",
      coverUrl: "http://localhost:4000/uploads/demo.jpg",
      isPublic: true,
    },
  });
  await prisma.trackPlay.create({ data: { trackId: track.id, userId: user.id } });
  await prisma.trackLike.create({ data: { trackId: track.id, userId: user.id } });
  await prisma.trackComment.create({
    data: { trackId: track.id, userId: user.id, content: "Nice" },
  });

  fileAsset = await prisma.fileAsset.create({
    data: {
      projectId: project.id,
      uploaderId: user.id,
      name: "Demo File",
      type: "audio/mpeg",
      url: "http://localhost:4000/uploads/demo.mp3",
      storageKey: "demo.mp3",
    },
  });
  fileVersion = await prisma.fileVersion.create({
    data: {
      fileId: fileAsset.id,
      version: "v1",
      authorId: user.id,
    },
  });
});

after(async () => {
  if (track?.id) {
    await prisma.trackPlay.deleteMany({ where: { trackId: track.id } });
    await prisma.trackLike.deleteMany({ where: { trackId: track.id } });
    await prisma.trackComment.deleteMany({ where: { trackId: track.id } });
    await prisma.track.delete({ where: { id: track.id } });
  }
  if (fileVersion?.id) {
    await prisma.fileVersion.delete({ where: { id: fileVersion.id } });
  }
  if (fileAsset?.id) {
    await prisma.fileAsset.delete({ where: { id: fileAsset.id } });
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

test("GET /dashboard/metrics returns enriched metrics", async () => {
  const response = await request(app)
    .get("/dashboard/metrics?period=30d")
    .set("Authorization", `Bearer ${token}`);

  assert.strictEqual(response.statusCode, 200);
  assert.strictEqual(response.body.period.key, "30d");
  assert.ok(response.body.metrics);
  assert.ok(response.body.trends);
  assert.ok(response.body.health);
  assert.ok(response.body.ranking);
  assert.ok(response.body.charts);
});