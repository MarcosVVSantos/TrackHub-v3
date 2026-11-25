const { test, before, after } = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/lib/prisma");
const { signAccessToken } = require("../src/utils/jwt");

// Fluxo completo de evento contra o banco de teste: criar, line-up, cachê escondido,
// artista confirmando, reordenar e separação entre eventos e faixas.
const unique = Date.now();
const users = {};
const auth = (who) => ({ Authorization: `Bearer ${users[who].token}` });
let eventId;

async function makeUser(key) {
  const user = await prisma.user.create({
    data: { email: `ev-${key}-${unique}@trackhub.local`, username: `ev_${key}_${unique}`, name: `Ev ${key}`, passwordHash: "x" },
  });
  users[key] = { ...user, token: signAccessToken({ sub: user.id, email: user.email }) };
}

before(async () => {
  for (const key of ["dona", "leitor", "mc", "estranho"]) await makeUser(key);
});

after(async () => {
  const ids = Object.values(users).map((u) => u.id);
  const projects = await prisma.project.findMany({ where: { ownerId: { in: ids } }, select: { id: true } });
  const projectIds = projects.map((p) => p.id);
  await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
  await prisma.lineupSlot.deleteMany({ where: { projectId: { in: projectIds } } });
  await prisma.eventInfo.deleteMany({ where: { projectId: { in: projectIds } } });
  await prisma.projectStatusLog.deleteMany({ where: { projectId: { in: projectIds } } });
  await prisma.projectMember.deleteMany({ where: { projectId: { in: projectIds } } });
  await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
});

test("cria evento e ele não aparece em Meus projetos", async () => {
  const startsAt = new Date(Date.now() + 18 * 24 * 3600 * 1000).toISOString();
  const res = await request(app)
    .post("/events")
    .set(auth("dona"))
    .send({ name: "Batalha da Leste #12", type: "battle", startsAt, venueName: "Casa de Cultura", callOpen: true });
  assert.strictEqual(res.status, 201, res.body.message);
  assert.strictEqual(res.body.kind, "event");
  assert.match(res.body.eventInfo.slug, /^batalha-da-leste-12/);
  eventId = res.body.id;

  const projects = await request(app).get("/projects").set(auth("dona"));
  assert.ok(!projects.body.some((p) => p.id === eventId));

  const events = await request(app).get("/events").set(auth("dona"));
  const item = events.body.find((e) => e.id === eventId);
  assert.ok(item);
  assert.strictEqual(item.myRole, "owner");
});

test("line-up: cachê só para quem edita, convite e resposta do artista", async () => {
  // Leitor entra na equipe como viewer.
  await prisma.projectMember.create({
    data: { projectId: eventId, userId: users.leitor.id, inviteEmail: users.leitor.email, role: "viewer", status: "accepted", invitedById: users.dona.id },
  });

  const convidado = await request(app)
    .post(`/events/${eventId}/lineup`)
    .set(auth("dona"))
    .send({ userId: users.mc.id, role: "MC", startTime: "20:15", feeCents: 15000 });
  assert.strictEqual(convidado.status, 201, convidado.body.message);

  const semConta = await request(app)
    .post(`/events/${eventId}/lineup`)
    .set(auth("dona"))
    .send({ name: "Trio Ruído", role: "Banda", startTime: "21:45", feeCents: 60000 });
  assert.strictEqual(semConta.status, 201);

  const repetido = await request(app).post(`/events/${eventId}/lineup`).set(auth("dona")).send({ userId: users.mc.id, role: "MC" });
  assert.strictEqual(repetido.status, 409);

  const daDona = await request(app).get(`/events/${eventId}`).set(auth("dona"));
  assert.strictEqual(daDona.body.lineupSummary.feeTotalCents, 75000);
  assert.strictEqual(daDona.body.lineup[0].feeCents, 15000);

  const doLeitor = await request(app).get(`/events/${eventId}`).set(auth("leitor"));
  assert.strictEqual(doLeitor.status, 200);
  assert.ok(doLeitor.body.lineup.every((s) => !("feeCents" in s)));
  assert.strictEqual("feeTotalCents" in doLeitor.body.lineupSummary, false);

  const doEstranho = await request(app).get(`/events/${eventId}`).set(auth("estranho"));
  assert.strictEqual(doEstranho.status, 404);

  // O artista vê o convite, sem cachê, e confirma.
  const convites = await request(app).get("/events/lineup-invites").set(auth("mc"));
  const meu = convites.body.find((s) => s.id === convidado.body.id);
  assert.ok(meu);
  assert.strictEqual("feeCents" in meu, false);

  const resposta = await request(app).post(`/events/lineup-invites/${meu.id}/respond`).set(auth("mc")).send({ accept: true });
  assert.strictEqual(resposta.status, 200);
  assert.strictEqual(resposta.body.status, "confirmed");

  const avisos = await prisma.notification.findMany({ where: { userId: users.dona.id, type: "lineup_accept" } });
  assert.strictEqual(avisos.length, 1);

  // Reordena: banda primeiro.
  const ordem = await request(app)
    .put(`/events/${eventId}/lineup/order`)
    .set(auth("dona"))
    .send({ ids: [semConta.body.id, convidado.body.id] });
  assert.strictEqual(ordem.status, 200);
  assert.deepStrictEqual(ordem.body.map((s) => s.name), ["Trio Ruído", users.mc.name]);
});

test("edita etapa e datas; viewer não edita; evento não vira público pela rota de projeto", async () => {
  const etapa = await request(app).put(`/events/${eventId}`).set(auth("dona")).send({ status: "in_progress", ticketUrl: "https://www.sympla.com.br/x" });
  assert.strictEqual(etapa.status, 200, etapa.body.message);
  assert.strictEqual(etapa.body.status, "in_progress");

  const leitor = await request(app).put(`/events/${eventId}`).set(auth("leitor")).send({ name: "Outro" });
  assert.strictEqual(leitor.status, 403);

  const publicar = await request(app).put(`/projects/${eventId}`).set(auth("dona")).send({ isPublic: true });
  assert.strictEqual(publicar.status, 400);

  const arquivado = await request(app).delete(`/events/${eventId}`).set(auth("dona"));
  assert.strictEqual(arquivado.status, 200);
  const depois = await request(app).get(`/events/${eventId}`).set(auth("dona"));
  assert.strictEqual(depois.status, 404);
});
