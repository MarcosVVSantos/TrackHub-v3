// Logger em JSON: uma linha por evento. O Render guarda o que sai no stdout,
// e em JSON dá para filtrar no painel por requestId, userId, status etc.
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const minLevel = LEVELS[process.env.LOG_LEVEL] || (process.env.NODE_ENV === "test" ? LEVELS.error : LEVELS.info);

// Nunca registre segredos: estes campos são apagados antes de escrever o log.
const REDACT = new Set(["password", "passwordHash", "token", "refreshToken", "accessToken", "authorization", "cookie"]);

function sanitize(value, depth = 0) {
  if (value === null || typeof value !== "object" || depth > 4) return value;
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack, code: value.code };
  }
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitize(item, depth + 1));
  const result = {};
  for (const [key, item] of Object.entries(value)) {
    result[key] = REDACT.has(key) ? "[redacted]" : sanitize(item, depth + 1);
  }
  return result;
}

function write(level, msg, fields = {}) {
  if (LEVELS[level] < minLevel) return;
  const line = JSON.stringify({
    time: new Date().toISOString(),
    level,
    msg,
    ...sanitize(fields),
  });
  if (level === "error" || level === "warn") process.stderr.write(`${line}\n`);
  else process.stdout.write(`${line}\n`);
}

module.exports = {
  debug: (msg, fields) => write("debug", msg, fields),
  info: (msg, fields) => write("info", msg, fields),
  warn: (msg, fields) => write("warn", msg, fields),
  error: (msg, fields) => write("error", msg, fields),
};
