const { captureException } = require("../instrument");
const logger = require("../utils/logger");
const { logSecurityEvent } = require("../utils/securityLog");

// Erros conhecidos do Prisma viram respostas claras; o resto vira 500 genérico,
// sem expor detalhes internos (nomes de tabela, consultas, stack) para quem está atacando.
const PRISMA_ERRORS = {
  P2025: { status: 404, message: "Registro não encontrado" },
  P2002: { status: 409, message: "Esse registro já existe" },
  P2003: { status: 400, message: "Referência inválida" },
  P2023: { status: 400, message: "Identificador inválido" },
};

const MULTER_ERRORS = {
  LIMIT_FILE_SIZE: "O arquivo é maior que o tamanho permitido",
  LIMIT_FILE_COUNT: "Envie um arquivo por vez",
  LIMIT_UNEXPECTED_FILE: "Campo de arquivo inesperado",
};

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err?.name === "ZodError" && err.issues?.length) {
    const message = err.issues.map((issue) => issue.message).join(" | ");
    return res.status(400).json({ message });
  }

  if (err?.name === "MulterError") {
    return res.status(400).json({ message: MULTER_ERRORS[err.code] || "Upload inválido" });
  }

  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ message: "JSON inválido" });
  }

  if (err?.type === "entity.too.large") {
    return res.status(413).json({ message: "Requisição grande demais" });
  }

  if (err?.code && PRISMA_ERRORS[err.code]) {
    const { status, message } = PRISMA_ERRORS[err.code];
    return res.status(status).json({ message });
  }

  // Prisma lança PrismaClientValidationError quando chega um tipo inesperado (ex.: objeto no lugar de texto).
  if (err?.name === "PrismaClientValidationError") {
    return res.status(400).json({ message: "Dados inválidos" });
  }

  const status = Number.isInteger(err?.status) && err.status >= 400 && err.status < 600 ? err.status : 500;

  if (status >= 500) {
    captureException(err, { requestId: req.id, userId: req.user?.sub, method: req.method, path: req.path });
    logger.error("unhandled_error", { requestId: req.id, userId: req.user?.sub, error: err });
    // O requestId aparece para o usuário: se ele te mandar, você acha o erro exato no log e no Sentry.
    return res.status(status).json({ message: "Ocorreu um erro inesperado. Tente novamente.", requestId: req.id });
  }

  if (status === 403) logSecurityEvent("access_denied", { req, reason: err.message });
  if (err.code === "UPLOAD_REJECTED") logSecurityEvent("upload_rejected", { req, reason: err.message });
  if (err.code === "REFRESH_TOKEN_REUSE") logSecurityEvent("refresh_token_reuse", { req, userId: err.userId });

  const body = { message: err.message || "Requisição inválida" };
  if (err.code === "PLAN_LIMIT_REACHED") {
    body.code = err.code;
    body.details = err.details;
  }

  return res.status(status).json(body);
}

module.exports = errorHandler;
