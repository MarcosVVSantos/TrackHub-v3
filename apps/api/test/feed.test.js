const { test, before, after } = require("node:test");
const assert = require("node:assert");
const bcrypt = require("bcryptjs");
const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");
const { signAccessToken } = require("../src/utils/jwt");

let follower;
let artist;
let followerToken;
let artistToken;
let project;
let track;
let playlist;
let playlistTrack;
let post;

before(async () => {
  const passwordHash = await bcrypt.hash("password123", 10);
  const unique = Date.now();
  follower = await prisma.user.create({
    data: {
      email: `feed-${unique}@trackhub.local`,
      username: `feed_${unique}`,
      name: "Feed Follower",
      passwordHash,
    },
  });
  artist = await prisma.user.create({
    data: {
      email: `artist-${unique}@trackhub.local`,
      username: `artist_${unique}`,
      name: "Feed Artist",
      passwordHash,
    },
  });
  followerToken = signAccessToken({ sub: follower.id, email: follower.email });
  artistToken = signAccessToken({ sub: artist.id, email: artist.email });

  await prisma.follow.create({
    data: { followerId: follower.id, followingId: artist.id },
  });

  project = await prisma.project.create({
    data: {
      name: "Projeto Feed",
      status: "in_progress",
      tags: ["lofi", "mix"],
      ownerId: artist.id,
    },
  });

  track = await prisma.track.create({
    data: {
      projectId: project.id,
      title: "Track Feed",
      description: "Demo",
      audioUrl: "http://localhost:4000/uploads/demo.mp3",
      coverUrl: "http://localhost:4000/uploads/demo.jpg",
      isPublic: true,
    },
  });

  playlist = await prisma.playlist.create({
    data: {
      name: "Playlist Feed",
      creatorId: artist.id,
      tags: ["chill"],
      isPublic: true,
    },
  });

  playlistTrack = await prisma.playlistTrack.create({
    data: {
      playlistId: playlist.id,
      trackId: track.id,
      order: 1,
    },
  });

  post = await prisma.socialPost.create({
    data: {
      authorId: artist.id,
      content: "Bastidores do som",
      projectId: project.id,
      trackId: track.id,
      playlistId: playlist.id,
    },
  });
});

after(async () => {
  if (post?.id) {
    await prisma.socialPostComment.deleteMany({ where: { postId: post.id } });
    await prisma.socialPostLike.deleteMany({ where: { postId: post.id } });
    await prisma.socialPostSave.deleteMany({ where: { postId: post.id } });
    await prisma.socialPost.delete({ where: { id: post.id } });
  }
  if (playlistTrack?.id) {
    await prisma.playlistTrack.delete({ where: { id: playlistTrack.id } });
  }
  if (playlist?.id) {
    await prisma.playlistSave.deleteMany({ where: { playlistId: playlist.id } });
    await prisma.playlist.delete({ where: { id: playlist.id } });
  }
  if (track?.id) {
    await prisma.trackPlay.deleteMany({ where: { trackId: track.id } });
    await prisma.trackLike.deleteMany({ where: { trackId: track.id } });
    await prisma.trackComment.deleteMany({ where: { trackId: track.id } });
    await prisma.trackSave.deleteMany({ where: { trackId: track.id } });
    await prisma.track.delete({ where: { id: track.id } });
  }
  if (project?.id) {
    await prisma.project.delete({ where: { id: project.id } });
  }
  if (follower?.id) {
    await prisma.follow.deleteMany({ where: { followerId: follower.id } });
    await prisma.refreshToken.deleteMany({ where: { userId: follower.id } });
    await prisma.user.delete({ where: { id: follower.id } });
  }
  if (artist?.id) {
    await prisma.refreshToken.deleteMany({ where: { userId: artist.id } });
    await prisma.user.delete({ where: { id: artist.id } });
  }
  await prisma.$disconnect();
});

test("GET /feed/productions returns followed tracks", async () => {
  const response = await request(app)
    .get("/feed/productions")
    .set("Authorization", `Bearer ${followerToken}`);

  assert.strictEqual(response.statusCode, 200);
  assert.ok(response.body.some((item) => item.id === track.id));
});

test("GET /feed/social returns posts", async () => {
  const response = await request(app)
    .get("/feed/social")
    .set("Authorization", `Bearer ${followerToken}`);

  assert.strictEqual(response.statusCode, 200);
  assert.ok(response.body.some((item) => item.id === post.id));
});

test("GET /feed/playlists returns playlists", async () => {
  const response = await request(app)
    .get("/feed/playlists")
    .set("Authorization", `Bearer ${followerToken}`);

  assert.strictEqual(response.statusCode, 200);
  assert.ok(response.body.some((item) => item.id === playlist.id));
});

test("POST /feed/social creates a post", async () => {
  const response = await request(app)
    .post("/feed/social")
    .set("Authorization", `Bearer ${followerToken}`)
    .send({ content: "Novo post" });

  assert.strictEqual(response.statusCode, 201);
  await prisma.socialPost.delete({ where: { id: response.body.id } });
});

test("POST /feed/social/:id/like likes post", async () => {
  const response = await request(app)
    .post(`/feed/social/${post.id}/like`)
    .set("Authorization", `Bearer ${followerToken}`);

  assert.strictEqual(response.statusCode, 201);
});

test("POST /tracks/:id/save saves a track", async () => {
  const response = await request(app)
    .post(`/tracks/${track.id}/save`)
    .set("Authorization", `Bearer ${followerToken}`);

  assert.strictEqual(response.statusCode, 201);
});

test("PATCH /tracks/:id updates track title", async () => {
  const response = await request(app)
    .patch(`/tracks/${track.id}`)
    .set("Authorization", `Bearer ${artistToken}`)
    .send({ title: "Track Atualizada" });

  assert.strictEqual(response.statusCode, 200);
  assert.strictEqual(response.body.title, "Track Atualizada");
});