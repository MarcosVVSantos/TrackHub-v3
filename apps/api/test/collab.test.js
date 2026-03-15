const { test, before, after } = require("node:test");
const assert = require("node:assert");
const bcrypt = require("bcryptjs");
const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");
const { signAccessToken } = require("../src/utils/jwt");

let owner;
let partner;
let ownerToken;
let partnerToken;
let project;

before(async () => {
  const passwordHash = await bcrypt.hash("password123", 10);
  const unique = Date.now();
  owner = await prisma.user.create({
    data: {
      email: `owner-${unique}@trackhub.local`,
      username: `owner_${unique}`,
      name: "Owner Test",
      passwordHash,
    },
  });
  partner = await prisma.user.create({
    data: {
      email: `partner-${unique}@trackhub.local`,
      username: `partner_${unique}`,
      name: "Partner Test",
      passwordHash,
    },
  });
  ownerToken = signAccessToken({ sub: owner.id, email: owner.email });
  partnerToken = signAccessToken({ sub: partner.id, email: partner.email });
  project = await prisma.project.create({
    data: {
      name: "Projeto Colab",
      description: "Teste",
      status: "idea",
      order: 1,
      tags: [],
      ownerId: owner.id,
    },
  });
});

after(async () => {
  if (project?.id) {
    await prisma.projectMember.deleteMany({ where: { projectId: project.id } });
    await prisma.projectEventParticipant.deleteMany({ where: { event: { projectId: project.id } } });
    await prisma.projectEvent.deleteMany({ where: { projectId: project.id } });
    await prisma.socialPost.deleteMany({ where: { projectId: project.id } });
    await prisma.project.delete({ where: { id: project.id } });
  }
  if (owner?.id) {
    await prisma.notification.deleteMany({
      where: { OR: [{ userId: owner.id }, { actorId: owner.id }] },
    });
    await prisma.refreshToken.deleteMany({ where: { userId: owner.id } });
    await prisma.user.delete({ where: { id: owner.id } });
  }
  if (partner?.id) {
    await prisma.notification.deleteMany({
      where: { OR: [{ userId: partner.id }, { actorId: partner.id }] },
    });
    await prisma.refreshToken.deleteMany({ where: { userId: partner.id } });
    await prisma.user.delete({ where: { id: partner.id } });
  }
  await prisma.$disconnect();
});

test("project invites can be accepted", async () => {
  const inviteResponse = await request(app)
    .post(`/projects/${project.id}/invite`)
    .set("Authorization", `Bearer ${ownerToken}`)
    .send({ username: partner.username, role: "editor", roleLabel: "Produtor" });

  assert.strictEqual(inviteResponse.statusCode, 201);
  assert.strictEqual(inviteResponse.body.status, "pending");

  const listResponse = await request(app)
    .get("/projects/invites")
    .set("Authorization", `Bearer ${partnerToken}`);

  assert.strictEqual(listResponse.statusCode, 200);
  assert.ok(listResponse.body.some((invite) => invite.id === inviteResponse.body.id));

  const acceptResponse = await request(app)
    .post(`/projects/invites/${inviteResponse.body.id}/accept`)
    .set("Authorization", `Bearer ${partnerToken}`);

  assert.strictEqual(acceptResponse.statusCode, 200);
  assert.strictEqual(acceptResponse.body.status, "accepted");
});

test("calendar events show in overview", async () => {
  const eventResponse = await request(app)
    .post(`/calendar/projects/${project.id}/events`)
    .set("Authorization", `Bearer ${ownerToken}`)
    .send({
      title: "Sessão de gravação",
      startsAt: new Date().toISOString(),
    });

  assert.strictEqual(eventResponse.statusCode, 201);

  const overviewResponse = await request(app)
    .get("/calendar/overview")
    .set("Authorization", `Bearer ${ownerToken}`);

  assert.strictEqual(overviewResponse.statusCode, 200);
  assert.ok(Array.isArray(overviewResponse.body.today));
  assert.ok(Array.isArray(overviewResponse.body.upcoming));
});
