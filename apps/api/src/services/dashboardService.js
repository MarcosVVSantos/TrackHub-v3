const prisma = require("../lib/prisma");

function getMonthsBack(count) {
  const now = new Date();
  const months = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: date.toLocaleString("pt-BR", { month: "short" }),
      start: date,
      end: new Date(date.getFullYear(), date.getMonth() + 1, 1),
    });
  }
  return months;
}

async function getDashboardMetrics(userId) {
  const projects = await prisma.project.findMany({
    where: { ownerId: userId, archivedAt: null },
    select: { id: true, status: true, createdAt: true },
  });

  const projectIds = projects.map((project) => project.id);

  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status !== "finished").length;
  const completedProjects = projects.filter((p) => p.status === "finished").length;

  const partners = await prisma.projectMember.count({
    where: { projectId: { in: projectIds }, status: "accepted" },
  });

  const [plays, likes, comments] = await Promise.all([
    prisma.trackPlay.count({ where: { track: { projectId: { in: projectIds } } } }),
    prisma.trackLike.count({ where: { track: { projectId: { in: projectIds } } } }),
    prisma.trackComment.count({ where: { track: { projectId: { in: projectIds } } } }),
  ]);

  const months = getMonthsBack(6);

  const playsEvolution = await Promise.all(
    months.map(async (month) => ({
      name: month.label,
      value: await prisma.trackPlay.count({
        where: {
          track: { projectId: { in: projectIds } },
          createdAt: { gte: month.start, lt: month.end },
        },
      }),
    }))
  );

  const projectsEvolution = await Promise.all(
    months.map(async (month) => ({
      name: month.label,
      value: await prisma.project.count({
        where: {
          ownerId: userId,
          createdAt: { gte: month.start, lt: month.end },
        },
      }),
    }))
  );

  const versionsEvolution = await Promise.all(
    months.map(async (month) => ({
      name: month.label,
      value: await prisma.fileVersion.count({
        where: {
          file: { projectId: { in: projectIds } },
          createdAt: { gte: month.start, lt: month.end },
        },
      }),
    }))
  );

  return {
    totalProjects,
    activeProjects,
    completedProjects,
    partners,
    plays,
    likes,
    comments,
    charts: {
      playsEvolution,
      projectsEvolution,
      versionsEvolution,
    },
  };
}

module.exports = { getDashboardMetrics };
