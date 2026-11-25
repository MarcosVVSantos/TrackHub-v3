const prisma = require("../lib/prisma");
const projectService = require("./projectService");
const calendarService = require("./calendarService");
const userService = require("./userService");
const { withResolvedUrls } = require("./storageService");
const { PUBLIC_USER_SELECT } = require("../utils/publicUser");

const COMMENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function myProjectsWhere(userId) {
  return {
    archivedAt: null,
    OR: [{ ownerId: userId }, { members: { some: { userId, status: "accepted" } } }],
  };
}

// Comentários recentes de outras pessoas nas suas faixas, agrupados por versão.
async function recentComments(userId) {
  const comments = await prisma.fileComment.findMany({
    where: {
      userId: { not: userId },
      createdAt: { gte: new Date(Date.now() - COMMENT_WINDOW_MS) },
      file: { project: myProjectsWhere(userId) },
    },
    include: {
      user: { select: PUBLIC_USER_SELECT },
      file: {
        select: {
          id: true,
          versions: { select: { version: true }, take: 1 },
          project: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  const groups = new Map();
  for (const comment of comments) {
    const key = comment.file.id;
    if (!groups.has(key)) {
      groups.set(key, {
        projectId: comment.file.project.id,
        projectName: comment.file.project.name,
        fileId: comment.file.id,
        version: comment.file.versions[0]?.version || "v1",
        count: 0,
        people: [],
        times: [],
        lastAt: comment.createdAt,
      });
    }
    const group = groups.get(key);
    group.count += 1;
    if (!group.people.includes(comment.user.name)) group.people.push(comment.user.name);
    if (comment.atSeconds !== null && group.times.length < 3) group.times.push(comment.atSeconds);
  }
  return [...groups.values()].slice(0, 3);
}

async function continueProjects(userId) {
  const projects = await prisma.project.findMany({
    where: { ...myProjectsWhere(userId), kind: "track" },
    orderBy: { updatedAt: "desc" },
    take: 4,
    select: {
      id: true,
      name: true,
      status: true,
      coverUrl: true,
      updatedAt: true,
      owner: { select: PUBLIC_USER_SELECT },
      members: { where: { status: "accepted", role: { not: "owner" } }, select: { user: { select: PUBLIC_USER_SELECT } } },
      files: {
        where: { type: { startsWith: "audio/" } },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          url: true,
          name: true,
          durationSec: true,
          createdAt: true,
          versions: { select: { version: true }, take: 1 },
          uploader: { select: PUBLIC_USER_SELECT },
        },
      },
    },
  });

  return Promise.all(
    projects.map(async (project) => ({
      id: project.id,
      name: project.name,
      status: project.status,
      coverUrl: project.coverUrl,
      updatedAt: project.updatedAt,
      team: [project.owner, ...project.members.map((member) => member.user).filter(Boolean)],
      latest: (await withResolvedUrls(project.files))[0] || null,
    }))
  );
}

async function getHome(userId) {
  const [invites, comments, calendar, recent, suggestions, projectCount] = await Promise.all([
    projectService.listInvites(userId),
    recentComments(userId),
    calendarService.listCalendarOverview(userId),
    continueProjects(userId),
    userService.listSuggestions(userId, 3),
    prisma.project.count({ where: { ...myProjectsWhere(userId), kind: "track" } }),
  ]);

  return {
    invites,
    comments,
    today: calendar.today,
    agenda: calendar.upcoming.slice(0, 3),
    continue: recent,
    suggestions,
    counts: { projects: projectCount, invites: invites.length },
  };
}

module.exports = { getHome };
