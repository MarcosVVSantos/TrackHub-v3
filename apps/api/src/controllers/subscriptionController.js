const { getUserPlan, getUsage } = require("../services/planService");

async function getMySubscription(req, res, next) {
  try {
    const userId = req.user.sub;
    const [plan, usage] = await Promise.all([
      getUserPlan(userId),
      getUsage(userId),
    ]);

    res.json({
      plan: {
        tier: plan.tier,
        maxProjects: plan.maxProjects,
        maxCollaboratorsPerProject: plan.maxCollaboratorsPerProject,
        maxTracks: plan.maxTracks,
        maxStorageBytes: plan.maxStorageBytes.toString(),
        maxPlaylists: plan.maxPlaylists,
      },
      usage: {
        projects: usage.projects,
        tracks: usage.tracks,
        playlists: usage.playlists,
        storageBytes: usage.storageBytes.toString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getMySubscription };
