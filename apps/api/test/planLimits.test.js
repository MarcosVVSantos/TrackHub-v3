const { test } = require("node:test");
const assert = require("node:assert");
const {
  DEFAULT_PLANS,
  isSubscriptionActive,
  evaluateLimit,
  planLimitError,
} = require("../src/utils/planLimits");

const free = DEFAULT_PLANS.free;

test("permite criar projeto abaixo do limite", () => {
  assert.equal(evaluateLimit(free, "project", 4).allowed, true);
});

test("bloqueia projeto quando o limite já foi atingido", () => {
  assert.equal(evaluateLimit(free, "project", 5).allowed, false);
});

test("storage soma o upload novo ao que já foi usado", () => {
  const limit = free.maxStorageBytes;
  assert.equal(evaluateLimit(free, "storage", limit - 10n, 10n).allowed, true);
  assert.equal(evaluateLimit(free, "storage", limit - 10n, 11n).allowed, false);
});

test("assinatura vencida ou cancelada não conta como ativa", () => {
  const past = new Date(Date.now() - 1000);
  const future = new Date(Date.now() + 86400000);
  assert.equal(isSubscriptionActive(null), false);
  assert.equal(isSubscriptionActive({ status: "canceled", endsAt: null }), false);
  assert.equal(isSubscriptionActive({ status: "active", endsAt: past }), false);
  assert.equal(isSubscriptionActive({ status: "active", endsAt: future }), true);
  assert.equal(isSubscriptionActive({ status: "active", endsAt: null }), true);
});

test("erro de limite traz código e recurso para o front", () => {
  const error = planLimitError("playlist", free);
  assert.equal(error.status, 403);
  assert.equal(error.code, "PLAN_LIMIT_REACHED");
  assert.deepEqual(error.details, { resource: "playlist", tier: "free" });
});

test("recurso desconhecido gera erro", () => {
  assert.throws(() => evaluateLimit(free, "foo", 0));
});
