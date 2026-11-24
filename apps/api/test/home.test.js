// Integração (Postgres de verdade): Início, comentários com tempo, tarefas e playlists automáticas.
const { test, before, after } = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");
const { signAccessToken } = require("../src/utils/jwt");

let owner;
let partner;
let project;
let file;
const auth = (user) => `Bearer ${signAccessToken({ sub: user.id })}`;

before(async () => {
  const unique = Date.now();
  owner = await prisma.user.create({
    data: { email: `home-owner-${unique}@trackhub.local`, username: `home_owner_${unique}`, name: "Dono", passwordHash: "x" },
  });
  partner = await prisma.user.create({
    data: {
      email: `home-partner-${unique}@trackhub.local`,
      username: `home_partner_${unique}`,
      name: "Lia",
      passwordHash: "x",
      role: "Voz",
      genres: ["R&B"],
      openToCollab: true,
    },
  });
  project = await prisma.project.create({
    data: {
      name: "Noite em SP",
      status: "production",
      tags: ["R&B"],
      ownerId: owner.id,
      members: {
        create: [
          { inviteEmail: "owner", role: "owner", status: "accepted", invitedById: owner.id, userId: owner.id },
          { inviteEmail: partner.email, role: "editor", status: "accepted", invitedById: owner.id, userId: partner.id },
        ],
      },
    },
  });
  file = await prisma.fileAsset.create({
    data: {
      projectId: project.id,
      uploaderId: partner.id,
      name: "noite-v3.mp3",
      type: "audio/mpeg",
      url: "https://cdn.test/noite-v3.mp3",
      storageKey: "noite-v3.mp3",
      durationSec: 221,
      peaks: [0.1, 0.5, 0.9],
      versions: { create: { version: "v3", authorId: partner.id } },
    },
  });
});

after(async () => {
  await prisma.fileComment.deleteMany({ where: { fileId: file.id } });
  await prisma.fileVersion.deleteMany({ where: { fileId: file.id } });
  await prisma.fileAsset.deleteMany({ where: { projectId: project.id } });
  await prisma.taskCard.deleteMany({ where: { projectId: project.id } });
  await prisma.notification.deleteMany({ where: { userId: { in: [owner.id, partner.id] } } });
  await prisma.projectMember.deleteMany({ where: { projectId: project.id } });
  await prisma.project.delete({ where: { id: project.id } });
  await prisma.user.deleteMany({ where: { id: { in: [owner.id, partner.id] } } });
  await prisma.$disconnect();
});

test("parceiro comenta num momento da v3 e o dono vê no Início", async () => {
  const created = await request(app)
    .post(`/projects/${project.id}/files/${file.id}/comments`)
    .set("Authorization", auth(partner))
    .send({ content: "O grave estoura aqui", atSeconds: 84 });
  assert.strictEqual(created.statusCode, 201);

  const listed = await request(app)
    .get(`/projects/${project.id}/files/${file.id}/comments`)
    .set("Authorization", auth(owner));
  assert.strictEqual(listed.statusCode, 200);
  assert.strictEqual(listed.body[0].atSeconds, 84);
  assert.strictEqual(listed.body[0].user.email, undefined);

  const home = await request(app).get("/home").set("Authorization", auth(owner));
  assert.strictEqual(home.statusCode, 200);
  assert.strictEqual(home.body.comments[0].projectName, "Noite em SP");
  assert.strictEqual(home.body.comments[0].version, "v3");
  assert.ok(home.body.continue.some((item) => item.id === project.id));
});

test("tarefa com responsável pode ser concluída", async () => {
  const created = await request(app)
    .post(`/projects/${project.id}/tasks`)
    .set("Authorization", auth(owner))
    .send({ title: "Gravar voz", assigneeId: partner.id, dueDate: "2026-12-01T19:00:00.000Z" });
  assert.strictEqual(created.statusCode, 201);
  assert.strictEqual(created.body.assignee.id, partner.id);

  const done = await request(app)
    .patch(`/projects/${project.id}/tasks/${created.body.id}`)
    .set("Authorization", auth(partner))
    .send({ done: true });
  assert.strictEqual(done.statusCode, 200);
  assert.strictEqual(done.body.done, true);
});

test("playlist automática Em andamento traz a versão mais recente", async () => {
  const response = await request(app).get("/playlists/auto").set("Authorization", auth(owner));
  assert.strictEqual(response.statusCode, 200);
  const inProgress = response.body.find((list) => list.id === "auto-em-andamento");
  assert.ok(inProgress.tracks.some((track) => track.fileId === file.id && track.version === "v3"));
});

test("Encontrar parceiros filtra por gênero e aberto a colaborar", async () => {
  const response = await request(app)
    .get("/users/explore?genre=r%26b&open=true")
    .set("Authorization", auth(owner));
  assert.strictEqual(response.statusCode, 200);
  assert.ok(response.body.some((user) => user.id === partner.id && user.role === "Voz"));
});
