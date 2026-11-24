const { isPublicStorageUrl } = require("../services/storageService");

const STATUSES = ["idea", "in_progress", "production", "finished"];
const LIMITS = { name: 100, description: 2000, tags: 10, tag: 30 };

function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

// Valida e normaliza os dados de projeto vindos do cliente.
// Só devolve campos conhecidos: nada de ownerId, archivedAt etc. vindos do body.
function parseProjectInput(data = {}, { partial = false } = {}) {
  const result = {};

  if (data.name !== undefined || !partial) {
    if (typeof data.name !== "string" || !data.name.trim()) throw badRequest("Informe o nome do projeto");
    if (data.name.trim().length > LIMITS.name) throw badRequest(`Nome com no máximo ${LIMITS.name} caracteres`);
    result.name = data.name.trim();
  }

  if (data.description !== undefined && data.description !== null) {
    if (typeof data.description !== "string") throw badRequest("Descrição inválida");
    if (data.description.length > LIMITS.description) {
      throw badRequest(`Descrição com no máximo ${LIMITS.description} caracteres`);
    }
    result.description = data.description;
  }

  if (data.status !== undefined) {
    if (!STATUSES.includes(data.status)) throw badRequest("Status inválido");
    result.status = data.status;
  }

  if (data.tags !== undefined) {
    if (!Array.isArray(data.tags) || data.tags.length > LIMITS.tags) {
      throw badRequest(`Use no máximo ${LIMITS.tags} tags`);
    }
    result.tags = data.tags.map((tag) => {
      if (typeof tag !== "string" || !tag.trim() || tag.trim().length > LIMITS.tag) {
        throw badRequest(`Cada tag deve ter até ${LIMITS.tag} caracteres`);
      }
      return tag.trim();
    });
  }

  if (data.isPublic !== undefined) result.isPublic = Boolean(data.isPublic);

  // A capa precisa ser um arquivo enviado para o nosso armazenamento,
  // nunca uma URL qualquer (evita rastreadores e conteúdo de terceiros).
  if (data.coverUrl !== undefined && data.coverUrl !== null && data.coverUrl !== "") {
    if (!isPublicStorageUrl(data.coverUrl)) throw badRequest("Capa inválida. Envie a imagem pelo upload de capa.");
    result.coverUrl = data.coverUrl;
  }

  if (data.bpm !== undefined) {
    if (data.bpm === null || data.bpm === "") {
      result.bpm = null;
    } else {
      const bpm = Number(data.bpm);
      if (!Number.isInteger(bpm) || bpm < 40 || bpm > 300) throw badRequest("BPM deve ser um número inteiro entre 40 e 300");
      result.bpm = bpm;
    }
  }

  if (data.order !== undefined && Number.isInteger(data.order)) result.order = data.order;

  return result;
}

module.exports = { parseProjectInput, STATUSES };
