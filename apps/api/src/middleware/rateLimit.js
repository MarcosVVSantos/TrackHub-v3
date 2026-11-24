// Limitador de requisições em memória (janela fixa).
// Funciona para uma instância da API. Se um dia rodar várias instâncias,
// troque por um armazenamento compartilhado (ex.: Redis).
const { logSecurityEvent } = require("../utils/securityLog");

function rateLimit({ windowMs, max, message, keyGenerator }) {
  const hits = new Map();

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, windowMs);
  cleanup.unref();

  return function rateLimitMiddleware(req, res, next) {
    if (process.env.RATE_LIMIT_DISABLED === "true") return next();

    const key = keyGenerator ? keyGenerator(req) : req.ip;
    const now = Date.now();
    let entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    entry.count += 1;
    res.setHeader("RateLimit-Limit", max);
    res.setHeader("RateLimit-Remaining", Math.max(0, max - entry.count));

    if (entry.count > max) {
      // Loga só a primeira recusa de cada janela, para não encher o log durante um ataque.
      if (entry.count === max + 1) logSecurityEvent("rate_limited", { req, limit: max, windowMs });
      res.setHeader("Retry-After", Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({ message });
    }

    return next();
  };
}

const byUser = (req) => `user:${req.user?.sub || req.ip}`;

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: "Muitas renovações de sessão. Aguarde alguns minutos.",
});

const chatSendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: byUser,
  message: "Você está enviando mensagens rápido demais. Espere um pouco.",
});

// Limite geral para qualquer escrita (POST/PUT/PATCH/DELETE): segura spam de curtidas,
// follows, comentários e notificações em massa.
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: "Muitas ações em pouco tempo. Espere um minuto.",
});

function limitWrites(req, res, next) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();
  return writeLimiter(req, res, next);
}

module.exports = { rateLimit, authLimiter, refreshLimiter, chatSendLimiter, limitWrites };
