const express = require("express");
const prisma = require("../lib/prisma");
const { checkBuckets } = require("../services/storageService");
const logger = require("../utils/logger");

const router = express.Router();
const CHECK_TIMEOUT_MS = 3000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`timeout ${ms}ms`)), ms)),
  ]);
}

async function runCheck(name, fn) {
  const startedAt = Date.now();
  try {
    await withTimeout(fn(), CHECK_TIMEOUT_MS);
    return { name, ok: true, ms: Date.now() - startedAt };
  } catch (error) {
    logger.error("readiness_check_failed", { check: name, error });
    return { name, ok: false, ms: Date.now() - startedAt };
  }
}

// Leve: o Render usa para liberar o deploy e reiniciar instâncias travadas.
// Não toca no banco, para um problema no banco não derrubar o deploy em loop.
router.get("/health", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ status: "ok" });
});

// Profundo: para o monitor externo. Confere banco e armazenamento.
// Responde 503 se algo falhar, mas sem detalhes do erro (eles vão para o log).
router.get("/ready", async (req, res) => {
  const checks = await Promise.all([
    runCheck("database", () => prisma.$queryRaw`SELECT 1`),
    runCheck("storage", () => checkBuckets()),
  ]);
  const ok = checks.every((check) => check.ok);
  res.set("Cache-Control", "no-store");
  res.status(ok ? 200 : 503).json({
    status: ok ? "ok" : "degraded",
    commit: process.env.RENDER_GIT_COMMIT ? process.env.RENDER_GIT_COMMIT.slice(0, 7) : undefined,
    uptimeSeconds: Math.round(process.uptime()),
    checks: Object.fromEntries(checks.map((check) => [check.name, { ok: check.ok, ms: check.ms }])),
  });
});

module.exports = router;
