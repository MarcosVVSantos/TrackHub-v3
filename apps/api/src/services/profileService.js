const prisma = require("../lib/prisma");

async function resolveUser(identifier) {
  return prisma.user.findFirst({
    where: {
      OR: [{ id: identifier }, { username: identifier }],
    },
    select: {
      id: true,
      name: true,
      username: true,
      avatarUrl: true,
      bio: true,
      isActive: true,
    },
  });
}

async function getProfile(viewerId, identifier) {
  const user = await resolveUser(identifier);

  if (!user) {
    const error = new Error("Perfil não encontrado");
    error.status = 404;
    throw error;
  }

  const [followers, following, isFollowing] = await Promise.all([
    prisma.follow.count({ where: { followingId: user.id } }),
    prisma.follow.count({ where: { followerId: user.id } }),
    prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: viewerId, followingId: user.id } },
    }),
  ]);

  const publicProjects = await prisma.project.count({
    where: {
      ownerId: user.id,
      archivedAt: null,
      isPublic: true,
    },
  });

  return {
    ...user,
    followers,
    following,
    publicProjects,
    isFollowing: Boolean(isFollowing),
  };
}

async function listProductions(identifier) {
  const user = await resolveUser(identifier);
  if (!user) {
    const error = new Error("Perfil não encontrado");
    error.status = 404;
    throw error;
  }
  return prisma.track.findMany({
    where: { isPublic: true, project: { ownerId: user.id } },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          tags: true,
          ownerId: true,
          owner: { select: { id: true, name: true, username: true, avatarUrl: true } },
        },
      },
      _count: { select: { likes: true, comments: true, plays: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function listPublicProjects(identifier, viewerId) {
  const user = await resolveUser(identifier);
  if (!user) {
    const error = new Error("Perfil não encontrado");
    error.status = 404;
    throw error;
  }

  const projects = await prisma.project.findMany({
    where: { ownerId: user.id, isPublic: true, archivedAt: null },
    include: {
      owner: { select: { id: true, name: true, username: true, avatarUrl: true } },
      files: {
        where: { type: { startsWith: "audio/" } },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, url: true, name: true, type: true },
      },
      members: { where: { status: "accepted" }, include: { user: true } },
      socialPosts: {
        take: 1,
        orderBy: { createdAt: "desc" },
        include: {
          likes: { where: { userId: viewerId }, select: { id: true } },
          saves: { where: { userId: viewerId }, select: { id: true } },
          _count: { select: { likes: true, comments: true, saves: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return projects.map((project) => {
    const post = project.socialPosts[0];
    return {
      ...project,
      postId: post?.id || null,
      liked: post ? post.likes.length > 0 : false,
      saved: post ? post.saves.length > 0 : false,
      counts: post?._count || { likes: 0, comments: 0, saves: 0 },
    };
  });
}

async function listPosts(identifier) {
  const user = await resolveUser(identifier);
  if (!user) {
    const error = new Error("Perfil não encontrado");
    error.status = 404;
    throw error;
  }
  return prisma.socialPost.findMany({
    where: { authorId: user.id },
    include: {
      author: { select: { id: true, name: true, username: true, avatarUrl: true } },
      project: { select: { id: true, name: true } },
      track: { select: { id: true, title: true } },
      playlist: { select: { id: true, name: true } },
      _count: { select: { likes: true, comments: true, saves: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function listPlaylists(identifier, viewerId) {
  const user = await resolveUser(identifier);
  if (!user) {
    const error = new Error("Perfil não encontrado");
    error.status = 404;
    throw error;
  }
  const playlists = await prisma.playlist.findMany({
    where: { creatorId: user.id, isPublic: true },
    include: {
      creator: { select: { id: true, name: true, username: true, avatarUrl: true } },
      tracks: {
        include: { track: { select: { id: true, title: true, audioUrl: true, coverUrl: true } } },
        orderBy: { order: "asc" },
      },
      saves: { where: { userId: viewerId }, select: { id: true } },
      _count: { select: { tracks: true, saves: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return playlists.map((playlist) => ({
    ...playlist,
    saved: playlist.saves.length > 0,
  }));
}

module.exports = {
  getProfile,
  listProductions,
  listPublicProjects,
  listPosts,
  listPlaylists,
};