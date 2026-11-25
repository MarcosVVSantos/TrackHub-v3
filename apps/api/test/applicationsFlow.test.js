const { test, before, after } = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");
const { signAccessToken } = require("../src/utils/jwt");

// Página pública e inscrições contra o banco de teste.
const unique = Date.now();
const users = {};
const auth = (who) => ({ Authorization: `Bearer ${users[who].token}` });
let eventId;
let slug;

async function makeUser(key) {
  const user = await prisma.user.create({
    data: { email: `ap-${key}-${unique}@trackhub.local`, username: `ap_${key}_${unique}`, name: `Ap ${key}`, passwordHash: "x" },
  });
  users[key] = { ...user, token: signAccessToken({ sub: user.id, email: user.email }) };
}

before(async () => {
  for (const key of ["dona", "mc", "convidado"]) await makeUser(key);
  const startsAt = new Date(Date.now() + 10 * 86400000).toISOString();
  const res = await request(app)
    .post("/events")
    .set(auth("dona"))
    .send({ name: `Seletiva ${unique}`, type: "battle", startsAt, callOpen: true });
  eventId = res.body.id;
  slug = res.body.eventInfo.slug;
  // Um convidado ainda sem resposta e uma atração confirmada com cachê.
  await request(app).post(`/events/${eventId}/lineup`).set(auth("dona")).send({ userId: users.convidado.id, role: "DJ", feeCents: 50000 });
  const banda = await request(app).post(`/events/${eventId}/lineup`).set(auth("dona")).send({ name: "Trio Ruído", role: "Banda", feeCents: 60000 });
  await request(app).patch(`/events/${eventId}/lineup/${banda.body.id}`).set(auth("dona")).send({ status: "confirmed" });
});

after(async () => {
  const ids = Object.values(users).map((u) => u.id);
  const projects = await prisma.project.findMany({ where: { ownerId: { in: ids } }, select: { id: true } });
  const projectIds = projects.map((p) => p.id);
  await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
  await prisma.eventApplication.deleteMany({ where: { projectId: { in: projectIds } } });
  await prisma.lineupSlot.deleteMany({ where: { projectId: { in: projectIds } } });
  await prisma.eventInfo.deleteMany({ where: { projectId: { in: projectIds } } });
  await prisma.projectStatusLog.deleteMany({ where: { projectId: { in: projectIds } } });
  await prisma.projectMember.deleteMany({ where: { projectId: { in: projectIds } } });
  await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
});

test("página só aparece depois de publicada", async () => {
  const antes = await request(app).get(`/public/events/${slug}`);
  assert.strictEqual(antes.status, 404);

  const publicar = await request(app).put(`/events/${eventId}`).set(auth("dona")).send({ published: true });
  assert.strictEqual(publicar.status, 200, publicar.body.message);

  const depois = await request(app).get(`/public/events/${slug}`);
  assert.strictEqual(depois.status, 200);
  assert.strictEqual(depois.body.callOpenNow, true);
});

test("página pública não vaza cachê, convidados nem equipe", async () => {
  const res = await request(app).get(`/public/events/${slug}`);
  const text = JSON.stringify(res.body);
  assert.deepStrictEqual(res.body.lineup.map((s) => s.name), ["Trio Ruído"]);
  for (const forbidden of ["feeCents", "notes", "members", "tasks", "inviteEmail", "email", "passwordHash", users.convidado.id]) {
    assert.ok(!text.includes(forbidden), `não deveria conter ${forbidden}`);
  }
});

test("inscrição exige login, vale uma vez e chega para a dona", async () => {
  const body = { artistName: "Kaizen", role: "MC", sampleUrl: "https://soundcloud.com/kaizen", message: "Quero revanche", acceptRules: true };
  const semLogin = await request(app).post(`/public/events/${slug}/apply`).send(body);
  assert.strictEqual(semLogin.status, 401);

  const ok = await request(app).post(`/public/events/${slug}/apply`).set(auth("mc")).send(body);
  assert.strictEqual(ok.status, 201, ok.body.message);

  const repetida = await request(app).post(`/public/events/${slug}/apply`).set(auth("mc")).send(body);
  assert.strictEqual(repetida.status, 409);

  const daDona = await request(app).post(`/public/events/${slug}/apply`).set(auth("dona")).send(body);
  assert.strictEqual(daDona.status, 400);

  const comoMc = await request(app).get(`/public/events/${slug}`).set(auth("mc"));
  assert.strictEqual(comoMc.body.viewer.application.status, "pending");

  const lista = await request(app).get(`/events/${eventId}/applications`).set(auth("dona"));
  assert.strictEqual(lista.status, 200);
  assert.strictEqual(lista.body.length, 1);

  const doMc = await request(app).get(`/events/${eventId}/applications`).set(auth("mc"));
  assert.strictEqual(doMc.status, 404);
});

test("aprovar coloca no line-up como confirmado e avisa o artista", async () => {
  const [inscricao] = (await request(app).get(`/events/${eventId}/applications`).set(auth("dona"))).body;
  const res = await request(app).patch(`/events/${eventId}/applications/${inscricao.id}`).set(auth("dona")).send({ status: "approved" });
  assert.strictEqual(res.status, 200, res.body.message);

  const slot = await prisma.lineupSlot.findFirst({ where: { projectId: eventId, userId: users.mc.id } });
  assert.strictEqual(slot.status, "confirmed");
  assert.strictEqual(slot.name, "Kaizen");

  const aviso = await prisma.notification.findFirst({ where: { userId: users.mc.id, type: "application_approved" } });
  assert.ok(aviso);

  const minhas = await request(app).get("/events/my-applications").set(auth("mc"));
  assert.strictEqual(minhas.body[0].status, "approved");
});

test("despublicar tira a página do ar", async () => {
  await request(app).put(`/events/${eventId}`).set(auth("dona")).send({ published: false });
  const res = await request(app).get(`/public/events/${slug}`);
  assert.strictEqual(res.status, 404);
});
