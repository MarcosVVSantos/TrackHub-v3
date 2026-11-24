const prisma = require("../lib/prisma");
const {
  DEFAULT_PLANS,
  isSubscriptionActive,
  evaluateLimit,
  planLimitError,
} = require("../utils/planLimits");

async function getPlanByTier(tier) {
  const plan = await prisma.plan.findUnique({ where: { tier } });
  return plan || DEFAULT_PLANS[tier];
}

async function getUserPlan(userId) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    include: { plan: true },
  });

  if (isSubscriptionActive(subscription) && subscription.plan) {
    return subscription.plan;
  }

  return getPlanByTier("free");
}

async function countUsage(userId, resource, context = {}) {
  switch (resource) {
    case "project":
      return prisma.project.count({ where: { ownerId: userId, archivedAt: null } });
    case "collaborator":
      return prisma.projectMember.count({
        where: {
          projectId: context.projectId,
          role: { not: "owner" },
          status: { in: ["pending", "accepted"] },
        },
      });
    case "track":
      return prisma.track.count({ where: { project: { ownerId: userId } } });
    case "playlist":
      return prisma.playlist.count({ where: { creatorId: userId } });
    case "storage": {
      const result = await prisma.fileAsset.aggregate({
        where: { project: { ownerId: userId } },
        _sum: { sizeBytes: true },
      });
      return result._sum.sizeBytes || 0n;
    }
    default:
      throw new Error(`Recurso de plano desconhecido: ${resource}`);
  }
}

// O limite vale para o plano do dono do projeto: é ele quem paga.
async function resolveBillingUserId(userId, context) {
  if (!context.projectId) return userId;
  const project = await prisma.project.findUnique({
    where: { id: context.projectId },
    select: { ownerId: true },
  });
  return project ? project.ownerId : userId;
}

async function checkLimit(userId, resource, context = {}) {
  const billingUserId = await resolveBillingUserId(userId, context);
  const plan = await getUserPlan(billingUserId);
  const used = await countUsage(billingUserId, resource, context);
  const adding = resource === "storage" ? BigInt(context.incomingBytes || 0) : 1;
  const result = evaluateLimit(plan, resource, used, adding);

  if (!result.allowed) {
    throw planLimitError(resource, plan);
  }

  return result;
}

async function getPlanSummary(userId) {
  const plan = await getUserPlan(userId);
  const [projects, tracks, playlists, storageBytes] = await Promise.all([
    countUsage(userId, "project"),
    countUsage(userId, "track"),
    countUsage(userId, "playlist"),
    countUsage(userId, "storage"),
  ]);

  return {
    tier: plan.tier,
    limits: {
      projects: plan.maxProjects,
      collaboratorsPerProject: plan.maxCollaboratorsPerProject,
      tracks: plan.maxTracks,
      playlists: plan.maxPlaylists,
      storageBytes: Number(plan.maxStorageBytes),
    },
    usage: {
      projects,
      tracks,
      playlists,
      storageBytes: Number(storageBytes),
    },
  };
}

module.exports = {
  getUserPlan,
  checkLimit,
  getPlanSummary,
};
