const GB = 1024n * 1024n * 1024n;

// Limites usados quando a tabela Plan ainda está vazia.
// Para mudar os valores em produção, cadastre os planos na tabela Plan.
const DEFAULT_PLANS = {
  free: {
    tier: "free",
    maxProjects: 5,
    maxCollaboratorsPerProject: 3,
    maxTracks: 20,
    maxStorageBytes: 1n * GB,
    maxPlaylists: 5,
  },
  premium: {
    tier: "premium",
    maxProjects: 100,
    maxCollaboratorsPerProject: 20,
    maxTracks: 1000,
    maxStorageBytes: 50n * GB,
    maxPlaylists: 100,
  },
};

const RESOURCE_LIMIT_FIELD = {
  project: "maxProjects",
  collaborator: "maxCollaboratorsPerProject",
  track: "maxTracks",
  storage: "maxStorageBytes",
  playlist: "maxPlaylists",
};

const RESOURCE_MESSAGES = {
  project: "Você atingiu o limite de projetos do seu plano.",
  collaborator: "Este projeto atingiu o limite de colaboradores do plano.",
  track: "Você atingiu o limite de faixas do seu plano.",
  storage: "Este upload passaria do armazenamento disponível no plano.",
  playlist: "Você atingiu o limite de playlists do seu plano.",
};

function isSubscriptionActive(subscription, now = new Date()) {
  if (!subscription || subscription.status !== "active") return false;
  if (!subscription.endsAt) return true;
  return new Date(subscription.endsAt) > now;
}

// Decide se uma ação cabe no plano.
// used: quanto já foi usado. adding: quanto a ação vai acrescentar (1 para contagens, bytes para storage).
function evaluateLimit(plan, resource, used, adding = 1) {
  const field = RESOURCE_LIMIT_FIELD[resource];
  if (!field) throw new Error(`Recurso de plano desconhecido: ${resource}`);

  if (resource === "storage") {
    const limit = BigInt(plan[field]);
    const total = BigInt(used) + BigInt(adding);
    return { allowed: total <= limit, limit, used: BigInt(used) };
  }

  const limit = Number(plan[field]);
  return { allowed: Number(used) + Number(adding) <= limit, limit, used: Number(used) };
}

function planLimitError(resource, plan) {
  const error = new Error(RESOURCE_MESSAGES[resource]);
  error.status = 403;
  error.code = "PLAN_LIMIT_REACHED";
  error.details = { resource, tier: plan.tier };
  return error;
}

module.exports = {
  DEFAULT_PLANS,
  RESOURCE_LIMIT_FIELD,
  isSubscriptionActive,
  evaluateLimit,
  planLimitError,
};
