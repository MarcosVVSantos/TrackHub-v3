const { test } = require("node:test");
const assert = require("node:assert");
const { canAccess } = require("../src/utils/permissions");

test("permission hierarchy works", () => {
  assert.strictEqual(canAccess("viewer", "owner"), true);
  assert.strictEqual(canAccess("editor", "viewer"), false);
  assert.strictEqual(canAccess("editor", "editor"), true);
});
