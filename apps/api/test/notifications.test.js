const { test, before, after } = require("node:test");
const assert = require("node:assert");
const bcrypt = require("bcryptjs");
const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");
const { signAccessToken } = require("../src/utils/jwt");

let user;
let actor;
let token;
let notification;

before(async () => {
  const passwordHash = await bcrypt.hash("password123", 10);
  const unique = Date.now();
  user = await prisma.user.create({
    data: {
      email: `notif-${unique}@trackhub.local`,
      username: `notif_${unique}`,
      name: "Notify User",
      passwordHash,
    },
  });
  actor = await prisma.user.create({
    data: {
      email: `actor-${unique}@trackhub.local`,
      username: `actor_${unique}`,
      name: "Actor",
      passwordHash,
    },
  });
  token = signAccessToken({ sub: user.id, email: user.email });
  notification = await prisma.notification.create({
    data: {
      userId: user.id,
      actorId: actor.id,
      type: "follow",
      message: "Actor começou a te seguir",
      link: `/profile/${actor.username}`,
    },
  });
});

after(async () => {
  if (notification?.id) await prisma.notification.delete({ where: { id: notification.id } });
  if (user?.id) {
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
  if (actor?.id) {
    await prisma.refreshToken.deleteMany({ where: { userId: actor.id } });
    await prisma.user.delete({ where: { id: actor.id } });
  }
  await prisma.$disconnect();
});

test("GET /notifications returns items and unread count", async () => {
  const response = await request(app)
    .get("/notifications")
    .set("Authorization", `Bearer ${token}`);

  assert.strictEqual(response.statusCode, 200);
  assert.ok(Array.isArray(response.body.items));
  assert.strictEqual(response.body.unreadCount, 1);
});

test("PUT /notifications/read-all marks all read", async () => {
  const response = await request(app)
    .put("/notifications/read-all")
    .set("Authorization", `Bearer ${token}`);

  assert.strictEqual(response.statusCode, 200);
  const updated = await prisma.notification.findUnique({ where: { id: notification.id } });
  assert.ok(updated.readAt);
});