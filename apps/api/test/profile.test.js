const { test, before, after } = require("node:test");
const assert = require("node:assert");
const bcrypt = require("bcryptjs");
const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");
const { signAccessToken } = require("../src/utils/jwt");

let viewer;
let creator;
let token;
let creatorToken;
let project;
let track;
let post;
let playlist;

before(async () => {
  const passwordHash = await bcrypt.hash("password123", 10);
  const unique = Date.now();
  viewer = await prisma.user.create({
    data: {
      email: `viewer-${unique}@trackhub.local`,
      username: `viewer_${unique}`,
      name: "Viewer",
      passwordHash,
    },
  });
  creator = await prisma.user.create({
    data: {
      email: `creator-${unique}@trackhub.local`,
      username: `creator_${unique}`,
      name: "Creator",
      bio: "Bio do artista",
      passwordHash,
    },
  });
  token = signAccessToken({ sub: viewer.id, email: viewer.email });
  creatorToken = signAccessToken({ sub: creator.id, email: creator.email });

  project = await prisma.project.create({
    data: {
      name: "Projeto Perfil",
      status: "production",
      ownerId: creator.id,
    },
  });
  track = await prisma.track.create({
    data: {
      projectId: project.id,
      title: "Track Perfil",
      audioUrl: "http://localhost:4000/uploads/demo.mp3",
      coverUrl: "http://localhost:4000/uploads/demo.jpg",
      isPublic: true,
    },
  });
  post = await prisma.socialPost.create({
    data: { authorId: creator.id, content: "Post do perfil" },
  });
  playlist = await prisma.playlist.create({
    data: { name: "Playlist Perfil", creatorId: creator.id, isPublic: true },
  });
});

after(async () => {
  if (post?.id) await prisma.socialPost.delete({ where: { id: post.id } });
  if (playlist?.id) await prisma.playlist.delete({ where: { id: playlist.id } });
  if (track?.id) await prisma.track.delete({ where: { id: track.id } });
  if (project?.id) await prisma.project.delete({ where: { id: project.id } });
  if (viewer?.id) {
    await prisma.refreshToken.deleteMany({ where: { userId: viewer.id } });
    await prisma.user.delete({ where: { id: viewer.id } });
  }
  if (creator?.id) {
    await prisma.refreshToken.deleteMany({ where: { userId: creator.id } });
    await prisma.user.delete({ where: { id: creator.id } });
  }
  await prisma.$disconnect();
});

test("GET /profiles/:id returns profile data", async () => {
  const response = await request(app)
    .get(`/profiles/${creator.id}`)
    .set("Authorization", `Bearer ${token}`);

  assert.strictEqual(response.statusCode, 200);
  assert.strictEqual(response.body.id, creator.id);
  assert.strictEqual(response.body.bio, "Bio do artista");
});

test("GET /profiles/:id/productions returns tracks", async () => {
  const response = await request(app)
    .get(`/profiles/${creator.id}/productions`)
    .set("Authorization", `Bearer ${token}`);

  assert.strictEqual(response.statusCode, 200);
  assert.ok(response.body.some((item) => item.id === track.id));
});

test("GET /profiles/:id/posts returns posts", async () => {
  const response = await request(app)
    .get(`/profiles/${creator.id}/posts`)
    .set("Authorization", `Bearer ${token}`);

  assert.strictEqual(response.statusCode, 200);
  assert.ok(response.body.some((item) => item.id === post.id));
});

test("GET /profiles/:id/playlists returns playlists", async () => {
  const response = await request(app)
    .get(`/profiles/${creator.id}/playlists`)
    .set("Authorization", `Bearer ${token}`);

  assert.strictEqual(response.statusCode, 200);
  assert.ok(response.body.some((item) => item.id === playlist.id));
});

test("PUT /users/me updates bio", async () => {
  const response = await request(app)
    .put("/users/me")
    .set("Authorization", `Bearer ${creatorToken}`)
    .send({ bio: "Nova bio" });

  assert.strictEqual(response.statusCode, 200);
  assert.strictEqual(response.body.bio, "Nova bio");
});