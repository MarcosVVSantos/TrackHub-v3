const { test, before, after } = require("node:test");
const assert = require("node:assert");
const bcrypt = require("bcryptjs");
const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");
const { signAccessToken } = require("../src/utils/jwt");

let viewer;
let artist;
let token;
let project;
let track;

before(async () => {
  const passwordHash = await bcrypt.hash("password123", 10);
  const unique = Date.now();
  viewer = await prisma.user.create({
    data: {
      email: `explore-${unique}@trackhub.local`,
      username: `explore_${unique}`,
      name: "Explorer",
      passwordHash,
    },
  });
  artist = await prisma.user.create({
    data: {
      email: `artist-explore-${unique}@trackhub.local`,
      username: `artist_explore_${unique}`,
      name: "Artist",
      passwordHash,
    },
  });
  token = signAccessToken({ sub: viewer.id, email: viewer.email });

  project = await prisma.project.create({
    data: {
      name: "Explore Project",
      status: "production",
      ownerId: artist.id,
    },
  });
  track = await prisma.track.create({
    data: {
      projectId: project.id,
      title: "Explore Track",
      audioUrl: "http://localhost:4000/uploads/demo.mp3",
      isPublic: true,
    },
  });
});

after(async () => {
  if (track?.id) await prisma.track.delete({ where: { id: track.id } });
  if (project?.id) await prisma.project.delete({ where: { id: project.id } });
  if (viewer?.id) {
    await prisma.follow.deleteMany({ where: { followerId: viewer.id } });
    await prisma.refreshToken.deleteMany({ where: { userId: viewer.id } });
    await prisma.user.delete({ where: { id: viewer.id } });
  }
  if (artist?.id) {
    await prisma.refreshToken.deleteMany({ where: { userId: artist.id } });
    await prisma.user.delete({ where: { id: artist.id } });
  }
  await prisma.$disconnect();
});

test("GET /users/explore returns artists", async () => {
  const response = await request(app)
    .get("/users/explore")
    .set("Authorization", `Bearer ${token}`);

  assert.strictEqual(response.statusCode, 200);
  assert.ok(response.body.some((item) => item.id === artist.id));
  assert.ok(!response.body.some((item) => item.id === viewer.id));
});

test("GET /users/explore filters by query", async () => {
  const response = await request(app)
    .get(`/users/explore?q=${artist.username}`)
    .set("Authorization", `Bearer ${token}`);

  assert.strictEqual(response.statusCode, 200);
  assert.ok(response.body.length >= 1);
});