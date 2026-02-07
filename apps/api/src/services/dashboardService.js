const prisma = require("../lib/prisma");

const ACTIVE_THRESHOLD_DAYS = 7;
const ATTENTION_THRESHOLD_DAYS = 21;

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

function resolvePeriod(periodKey = "6m") {
  const now = new Date();
  const allowed = new Set(["30d", "3m", "6m"]);
  const key = allowed.has(periodKey) ? periodKey : "6m";

  if (key === "30d") {
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    const previousStart = new Date(start);
    previousStart.setDate(previousStart.getDate() - 30);
    return {
      key,
      label: "Últimos 30 dias",
      start,
      end: now,
      previousStart,
      previousEnd: start,
      months: 1,
      days: 30,
    };
  }

  const months = key === "3m" ? 3 : 6;
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const previousStart = new Date(start.getFullYear(), start.getMonth() - months, 1);
  return {
    key,
    label: key === "3m" ? "Últimos 3 meses" : "Últimos 6 meses",
    start,
    end: now,
    previousStart,
    previousEnd: start,
    months,
    days: months * 30,
  };
}

function calculateTrend(current, previous) {
  if (!previous && !current) {
    return { direction: "flat", value: 0 };
  }
  if (!previous) {
    return { direction: "up", value: 100 };
  }
  const diff = current - previous;
  if (diff === 0) {
    return { direction: "flat", value: 0 };
  }
  const value = Math.round((diff / previous) * 100);
  return { direction: diff > 0 ? "up" : "down", value: Math.abs(value) };
}

function daysSince(date) {
  if (!date) return null;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function resolveHealth({ hasProject, daysWithoutProject, daysWithoutVersion, daysWithoutInteraction }) {
  const criteria = {
    active: `Ativo: até ${ACTIVE_THRESHOLD_DAYS} dias sem criar projeto, enviar versão ou interagir.`,
    attention: `Atenção: entre ${ACTIVE_THRESHOLD_DAYS + 1} e ${ATTENTION_THRESHOLD_DAYS} dias de inatividade.`,
    inactive: `Inativo: mais de ${ATTENTION_THRESHOLD_DAYS} dias sem atividade relevante.`,
  };

  if (!hasProject) {
    return {
      status: "attention",
      title: "Atenção",
      message: "Você ainda não criou projetos. Comece sua jornada criativa hoje.",
      criteria,
      cta: { label: "Criar novo projeto", href: "/projects" },
    };
  }

  const maxGap = Math.max(
    daysWithoutProject ?? 0,
    daysWithoutVersion ?? 0,
    daysWithoutInteraction ?? 0
  );

  if (maxGap > ATTENTION_THRESHOLD_DAYS) {
    return {
      status: "inactive",
      title: "Inativo",
      message: "Sua conta está há um tempo sem atividade. Vamos retomar o ritmo?",
      criteria,
      cta: { label: "Enviar nova versão", href: "/projects" },
    };
  }

  if (maxGap > ACTIVE_THRESHOLD_DAYS) {
    return {
      status: "attention",
      title: "Atenção",
      message: "Pequenas ações agora ajudam a manter seus projetos vivos.",
      criteria,
      cta: { label: "Criar novo projeto", href: "/projects" },
    };
  }

  return {
    status: "active",
    title: "Ativo",
    message: "Ótimo ritmo! Continue compartilhando e colaborando.",
    criteria,
    cta: { label: "Criar novo projeto", href: "/projects" },
  };
}

function buildRanking(projectStats) {
  const byMetric = (metric) =>
    projectStats
      .filter((item) => item[metric] > 0)
      .sort((a, b) => b[metric] - a[metric])
      .slice(0, 5)
      .map((item) => ({
        id: item.id,
        name: item.name,
        value: item[metric],
        plays: item.plays,
        likes: item.likes,
        comments: item.comments,
        engagement: item.engagement,
      }));

  return {
    plays: byMetric("plays"),
    likes: byMetric("likes"),
    engagement: byMetric("engagement"),
  };
}

async function getDashboardMetrics(userId, periodKey) {
  const period = resolvePeriod(periodKey);
  const projects = await prisma.project.findMany({
    where: { ownerId: userId, archivedAt: null },
    select: { id: true, status: true, createdAt: true, name: true },
  });

  const projectIds = projects.map((project) => project.id);
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status !== "finished").length;
  const completedProjects = projects.filter((p) => p.status === "finished").length;

  const partners = projectIds.length
    ? await prisma.projectMember.count({
        where: { projectId: { in: projectIds }, status: "accepted" },
      })
    : 0;

  const periodFilter = { gte: period.start, lt: period.end };
  const previousFilter = { gte: period.previousStart, lt: period.previousEnd };

  const [plays, likes, comments, playsPrevious, likesPrevious, commentsPrevious] = await Promise.all([
    prisma.trackPlay.count({
      where: { track: { projectId: { in: projectIds } }, createdAt: periodFilter },
    }),
    prisma.trackLike.count({
      where: { track: { projectId: { in: projectIds } }, createdAt: periodFilter },
    }),
    prisma.trackComment.count({
      where: { track: { projectId: { in: projectIds } }, createdAt: periodFilter },
    }),
    prisma.trackPlay.count({
      where: { track: { projectId: { in: projectIds } }, createdAt: previousFilter },
    }),
    prisma.trackLike.count({
      where: { track: { projectId: { in: projectIds } }, createdAt: previousFilter },
    }),
    prisma.trackComment.count({
      where: { track: { projectId: { in: projectIds } }, createdAt: previousFilter },
    }),
  ]);

  const months = getMonthsBack(period.months);

  const [playsEvolution, projectsEvolution, versionsEvolution] = await Promise.all([
    Promise.all(
      months.map(async (month) => ({
        name: month.label,
        value: await prisma.trackPlay.count({
          where: {
            track: { projectId: { in: projectIds } },
            createdAt: { gte: month.start, lt: month.end },
          },
        }),
      }))
    ),
    Promise.all(
      months.map(async (month) => ({
        name: month.label,
        value: await prisma.project.count({
          where: {
            ownerId: userId,
            createdAt: { gte: month.start, lt: month.end },
          },
        }),
      }))
    ),
    Promise.all(
      months.map(async (month) => ({
        name: month.label,
        value: await prisma.fileVersion.count({
          where: {
            file: { projectId: { in: projectIds } },
            createdAt: { gte: month.start, lt: month.end },
          },
        }),
      }))
    ),
  ]);

  const [lastProject, lastVersion, lastProjectComment, lastTrackComment, lastTrackLike, lastTrackPlay] =
    await Promise.all([
      prisma.project.findFirst({
        where: { ownerId: userId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.fileVersion.findFirst({
        where: { file: { project: { ownerId: userId } } },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.projectComment.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.trackComment.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.trackLike.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.trackPlay.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

  const interactionDates = [
    lastProjectComment?.createdAt,
    lastTrackComment?.createdAt,
    lastTrackLike?.createdAt,
    lastTrackPlay?.createdAt,
  ].filter(Boolean);

  const lastInteraction = interactionDates.length
    ? new Date(Math.max(...interactionDates.map((date) => date.getTime())))
    : null;

  const health = resolveHealth({
    hasProject: totalProjects > 0,
    daysWithoutProject: daysSince(lastProject?.createdAt),
    daysWithoutVersion: daysSince(lastVersion?.createdAt),
    daysWithoutInteraction: daysSince(lastInteraction),
  });

  const tracks = projectIds.length
    ? await prisma.track.findMany({
        where: { projectId: { in: projectIds } },
        select: { id: true, projectId: true, project: { select: { name: true } } },
      })
    : [];

  const trackIds = tracks.map((track) => track.id);
  let ranking = { plays: [], likes: [], engagement: [] };

  if (trackIds.length) {
    const [playsByTrack, likesByTrack, commentsByTrack] = await Promise.all([
      prisma.trackPlay.groupBy({
        by: ["trackId"],
        where: { trackId: { in: trackIds }, createdAt: periodFilter },
        _count: { _all: true },
      }),
      prisma.trackLike.groupBy({
        by: ["trackId"],
        where: { trackId: { in: trackIds }, createdAt: periodFilter },
        _count: { _all: true },
      }),
      prisma.trackComment.groupBy({
        by: ["trackId"],
        where: { trackId: { in: trackIds }, createdAt: periodFilter },
        _count: { _all: true },
      }),
    ]);

    const playsMap = new Map(playsByTrack.map((item) => [item.trackId, item._count._all]));
    const likesMap = new Map(likesByTrack.map((item) => [item.trackId, item._count._all]));
    const commentsMap = new Map(commentsByTrack.map((item) => [item.trackId, item._count._all]));

    const projectStatsMap = new Map(
      projects.map((project) => [
        project.id,
        {
          id: project.id,
          name: project.name,
          plays: 0,
          likes: 0,
          comments: 0,
          engagement: 0,
        },
      ])
    );

    tracks.forEach((track) => {
      const stats = projectStatsMap.get(track.projectId);
      if (!stats) return;
      const playsCount = playsMap.get(track.id) || 0;
      const likesCount = likesMap.get(track.id) || 0;
      const commentsCount = commentsMap.get(track.id) || 0;
      stats.plays += playsCount;
      stats.likes += likesCount;
      stats.comments += commentsCount;
      stats.engagement += playsCount + likesCount + commentsCount;
    });

    ranking = buildRanking(Array.from(projectStatsMap.values()));
  }

  return {
    period: {
      key: period.key,
      label: period.label,
      start: period.start,
      end: period.end,
    },
    metrics: {
      totalProjects,
      activeProjects,
      completedProjects,
      partners,
      plays,
      likes,
      comments,
    },
    trends: {
      plays: calculateTrend(plays, playsPrevious),
      likes: calculateTrend(likes, likesPrevious),
      comments: calculateTrend(comments, commentsPrevious),
    },
    health,
    ranking,
    charts: {
      playsEvolution,
      projectsEvolution,
      versionsEvolution,
    },
  };
}

module.exports = { getDashboardMetrics };
