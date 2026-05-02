const prisma = require("../lib/prisma");

const FREE_TIER = "free";

async function getUserPlan(userId) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    include: { plan: true },
  });

  if (subscription?.plan) return subscription.plan;

  return prisma.plan.findUnique({ where: { tier: FREE_TIER } });
}

async function getUsage(userId) {
  const [projects, tracks, playlists, storageResult] = await Promise.all([
    prisma.project.count({ where: { ownerId: userId, archivedAt: null } }),
    prisma.track.count({ where: { project: { ownerId: userId } } }),
    prisma.playlist.count({ where: { creatorId: userId } }),
    prisma.fileAsset.aggregate({
      where: { uploader: { id: userId } },
      _sum: { sizeBytes: true },
    }),
  ]);

  return {
    projects,
    tracks,
    playlists,
    storageBytes: storageResult._sum.sizeBytes ?? BigInt(0),
  };
}

async function getCollaboratorCount(projectId) {
  return prisma.projectMember.count({
    where: {
      projectId,
      status: "accepted",
      role: { not: "owner" },
    },
  });
}

async function checkLimit(userId, resource, context = {}) {
  const plan = await getUserPlan(userId);
  if (!plan) return;

  const unlimited = (val) => val === -1 || val === BigInt(-1);

  switch (resource) {
    case "projects": {
      if (unlimited(plan.maxProjects)) return;
      const count = await prisma.project.count({
        where: { ownerId: userId, archivedAt: null },
      });
      if (count >= plan.maxProjects) {
        const err = new Error(
          `Limite de ${plan.maxProjects} projeto(s) atingido no plano Free. Faça upgrade para Premium.`
        );
        err.status = 403;
        err.code = "PLAN_LIMIT_PROJECTS";
        throw err;
      }
      break;
    }

    case "collaborators": {
      if (unlimited(plan.maxCollaboratorsPerProject)) return;
      const { projectId } = context;
      const count = await getCollaboratorCount(projectId);
      if (count >= plan.maxCollaboratorsPerProject) {
        const err = new Error(
          `Limite de ${plan.maxCollaboratorsPerProject} colaborador(es) por projeto atingido no plano Free. Faça upgrade para Premium.`
        );
        err.status = 403;
        err.code = "PLAN_LIMIT_COLLABORATORS";
        throw err;
      }
      break;
    }

    case "tracks": {
      if (unlimited(plan.maxTracks)) return;
      const count = await prisma.track.count({
        where: { project: { ownerId: userId } },
      });
      if (count >= plan.maxTracks) {
        const err = new Error(
          `Limite de ${plan.maxTracks} track(s) atingido no plano Free. Faça upgrade para Premium.`
        );
        err.status = 403;
        err.code = "PLAN_LIMIT_TRACKS";
        throw err;
      }
      break;
    }

    case "storage": {
      if (unlimited(plan.maxStorageBytes)) return;
      const result = await prisma.fileAsset.aggregate({
        where: { uploader: { id: userId } },
        _sum: { sizeBytes: true },
      });
      const used = result._sum.sizeBytes ?? BigInt(0);
      const incoming = BigInt(context.sizeBytes ?? 0);
      if (used + incoming > plan.maxStorageBytes) {
        const limitMB = Number(plan.maxStorageBytes) / (1024 * 1024);
        const err = new Error(
          `Limite de storage de ${limitMB}MB atingido no plano Free. Faça upgrade para Premium.`
        );
        err.status = 403;
        err.code = "PLAN_LIMIT_STORAGE";
        throw err;
      }
      break;
    }

    case "playlists": {
      if (unlimited(plan.maxPlaylists)) return;
      const count = await prisma.playlist.count({
        where: { creatorId: userId },
      });
      if (count >= plan.maxPlaylists) {
        const err = new Error(
          `Limite de ${plan.maxPlaylists} playlist(s) atingido no plano Free. Faça upgrade para Premium.`
        );
        err.status = 403;
        err.code = "PLAN_LIMIT_PLAYLISTS";
        throw err;
      }
      break;
    }
  }
}

module.exports = { getUserPlan, getUsage, checkLimit };
