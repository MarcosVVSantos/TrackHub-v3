const prisma = require("../lib/prisma");
const { createNotification } = require("./notificationService");

async function getFollowingIds(userId) {
  const follows = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  return follows.map((item) => item.followingId);
}

async function listProductions(userId) {
  const followingIds = await getFollowingIds(userId);
  if (!followingIds.length) return [];
  const followingSet = new Set(followingIds);

  const tracks = await prisma.track.findMany({
    where: {
      isPublic: true,
      project: { ownerId: { in: followingIds } },
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          description: true,
          tags: true,
          coverUrl: true,
          ownerId: true,
          owner: { select: { id: true, name: true, username: true, avatarUrl: true } },
          members: {
            where: { status: "accepted" },
            select: { user: { select: { id: true, name: true, username: true, avatarUrl: true } } },
          },
        },
      },
      likes: { where: { userId }, select: { id: true } },
      saves: { where: { userId }, select: { id: true } },
      _count: { select: { likes: true, comments: true, plays: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return tracks.map((track) => ({
    ...track,
    saved: track.saves.length > 0,
    liked: track.likes.length > 0,
    isFollowing: followingSet.has(track.project?.ownerId),
  }));
}

async function listProjectPosts(userId) {
  const followingIds = await getFollowingIds(userId);
  if (!followingIds.length) return [];
  const followingSet = new Set(followingIds);

  const posts = await prisma.socialPost.findMany({
    where: {
      projectId: { not: null },
      authorId: { in: followingIds },
      project: { isPublic: true, coverUrl: { not: null } },
    },
    include: {
      author: { select: { id: true, name: true, username: true, avatarUrl: true } },
      project: {
        select: {
          id: true,
          name: true,
          description: true,
          tags: true,
          coverUrl: true,
          ownerId: true,
          owner: { select: { id: true, name: true, username: true, avatarUrl: true } },
          members: {
            where: { status: "accepted" },
            select: { user: { select: { id: true, name: true, username: true, avatarUrl: true } } },
          },
          files: {
            where: { type: { startsWith: "audio/" } },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true, url: true, name: true, type: true },
          },
        },
      },
      likes: { where: { userId }, select: { id: true } },
      saves: { where: { userId }, select: { id: true } },
      _count: { select: { likes: true, comments: true, saves: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return posts.map((post) => ({
    ...post,
    liked: post.likes.length > 0,
    saved: post.saves.length > 0,
    isFollowing: followingSet.has(post.project?.ownerId),
  }));
}

async function listSocialPosts(userId) {
  const followingIds = await getFollowingIds(userId);
  const authorIds = [userId, ...followingIds];

  const posts = await prisma.socialPost.findMany({
    where: { authorId: { in: authorIds } },
    include: {
      author: { select: { id: true, name: true, username: true, avatarUrl: true } },
      project: { select: { id: true, name: true } },
  track: { select: { id: true, title: true, projectId: true } },
      playlist: { select: { id: true, name: true } },
      likes: { where: { userId }, select: { id: true } },
      saves: { where: { userId }, select: { id: true } },
      _count: { select: { likes: true, comments: true, saves: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return posts.map((post) => ({
    ...post,
    liked: post.likes.length > 0,
    saved: post.saves.length > 0,
  }));
}

async function createSocialPost(userId, payload) {
  const { content, projectId, trackId, playlistId } = payload;
  return prisma.socialPost.create({
    data: {
      authorId: userId,
      content,
      projectId: projectId || null,
      trackId: trackId || null,
      playlistId: playlistId || null,
    },
    include: {
      author: { select: { id: true, name: true, username: true, avatarUrl: true } },
      project: { select: { id: true, name: true } },
      track: { select: { id: true, title: true } },
      playlist: { select: { id: true, name: true } },
      _count: { select: { likes: true, comments: true, saves: true } },
    },
  });
}

async function likeSocialPost(postId, userId) {
  const existing = await prisma.socialPostLike.findUnique({
    where: { postId_userId: { postId, userId } },
  });
  if (existing) {
    await prisma.socialPostLike.delete({ where: { postId_userId: { postId, userId } } });
    return { liked: false };
  }
  const like = await prisma.socialPostLike.create({ data: { postId, userId } });
  const [actor, post] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, username: true } }),
    prisma.socialPost.findUnique({
      where: { id: postId },
      select: { authorId: true },
    }),
  ]);

  if (post) {
    await createNotification({
      userId: post.authorId,
      actorId: userId,
      type: "social_like",
      message: `${actor?.name || "Alguém"} curtiu seu post`,
      link: `/profile/${actor?.username || userId}`,
    });
  }

  return { liked: true, id: like.id };
}

async function commentSocialPost(postId, userId, content) {
  const comment = await prisma.socialPostComment.create({
    data: { postId, userId, content },
    include: {
      user: { select: { id: true, name: true, username: true, avatarUrl: true } },
    },
  });
  const [actor, post] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, username: true } }),
    prisma.socialPost.findUnique({ where: { id: postId }, select: { authorId: true } }),
  ]);

  if (post) {
    await createNotification({
      userId: post.authorId,
      actorId: userId,
      type: "social_comment",
      message: `${actor?.name || "Alguém"} comentou no seu post`,
      link: `/profile/${actor?.username || userId}`,
    });
  }

  return comment;
}

async function listSocialComments(postId) {
  return prisma.socialPostComment.findMany({
    where: { postId },
    include: { user: { select: { id: true, name: true, username: true, avatarUrl: true } } },
    orderBy: { createdAt: "asc" },
  });
}

async function saveSocialPost(postId, userId) {
  const existing = await prisma.socialPostSave.findUnique({
    where: { postId_userId: { postId, userId } },
  });
  if (existing) return existing;
  const save = await prisma.socialPostSave.create({ data: { postId, userId } });
  const [actor, post] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, username: true } }),
    prisma.socialPost.findUnique({ where: { id: postId }, select: { authorId: true } }),
  ]);

  if (post) {
    await createNotification({
      userId: post.authorId,
      actorId: userId,
      type: "social_save",
      message: `${actor?.name || "Alguém"} salvou seu post`,
      link: `/profile/${actor?.username || userId}`,
    });
  }

  return save;
}

async function unsaveSocialPost(postId, userId) {
  return prisma.socialPostSave.delete({ where: { postId_userId: { postId, userId } } });
}

async function listPlaylists(userId) {
  const followingIds = await getFollowingIds(userId);
  if (!followingIds.length) return [];

  const playlists = await prisma.playlist.findMany({
    where: { isPublic: true, creatorId: { in: followingIds } },
    include: {
      creator: { select: { id: true, name: true, username: true, avatarUrl: true } },
      tracks: {
        include: { track: { select: { id: true, title: true, audioUrl: true, coverUrl: true } } },
        orderBy: { order: "asc" },
      },
      saves: { where: { userId }, select: { id: true } },
      _count: { select: { tracks: true, saves: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return playlists.map((playlist) => ({
    ...playlist,
    saved: playlist.saves.length > 0,
  }));
}

async function getTrack(trackId) {
  return prisma.track.findUnique({
    where: { id: trackId },
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
      comments: { include: { user: true } },
      _count: { select: { likes: true, comments: true, plays: true } },
    },
  });
}

async function updateTrackTitle(trackId, userId, title) {
  const track = await prisma.track.findUnique({
    where: { id: trackId },
    include: { project: { select: { ownerId: true } } },
  });
  if (!track || track.project.ownerId !== userId) {
    const error = new Error("Sem permissão para editar esta faixa.");
    error.status = 403;
    throw error;
  }

  return prisma.track.update({
    where: { id: trackId },
    data: { title },
  });
}

async function likeTrack(trackId, userId) {
  const existing = await prisma.trackLike.findFirst({ where: { trackId, userId } });
  if (existing) {
    await prisma.trackLike.delete({ where: { id: existing.id } });
    return { liked: false };
  }
  const like = await prisma.trackLike.create({
    data: { trackId, userId },
  });

  const [actor, track] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, username: true } }),
    prisma.track.findUnique({
      where: { id: trackId },
      select: { title: true, project: { select: { ownerId: true, id: true } } },
    }),
  ]);

  if (track?.project?.ownerId) {
    await createNotification({
      userId: track.project.ownerId,
      actorId: userId,
      type: "track_like",
      message: `${actor?.name || "Alguém"} curtiu sua track ${track.title}`,
      link: `/projects/${track.project.id}`,
    });
  }

  return { liked: true, id: like.id };
}

async function saveTrack(trackId, userId) {
  const existing = await prisma.trackSave.findUnique({ where: { trackId_userId: { trackId, userId } } });
  if (existing) return existing;
  const save = await prisma.trackSave.create({ data: { trackId, userId } });
  const [actor, track] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, username: true } }),
    prisma.track.findUnique({
      where: { id: trackId },
      select: { title: true, project: { select: { ownerId: true, id: true } } },
    }),
  ]);

  if (track?.project?.ownerId) {
    await createNotification({
      userId: track.project.ownerId,
      actorId: userId,
      type: "track_save",
      message: `${actor?.name || "Alguém"} salvou sua track ${track.title}`,
      link: `/projects/${track.project.id}`,
    });
  }

  return save;
}

async function unsaveTrack(trackId, userId) {
  return prisma.trackSave.delete({ where: { trackId_userId: { trackId, userId } } });
}

async function savePlaylist(playlistId, userId) {
  const existing = await prisma.playlistSave.findUnique({
    where: { playlistId_userId: { playlistId, userId } },
  });
  if (existing) return existing;
  const save = await prisma.playlistSave.create({ data: { playlistId, userId } });
  const [actor, playlist] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, username: true } }),
    prisma.playlist.findUnique({ where: { id: playlistId }, select: { creatorId: true, name: true } }),
  ]);

  if (playlist) {
    await createNotification({
      userId: playlist.creatorId,
      actorId: userId,
      type: "playlist_save",
      message: `${actor?.name || "Alguém"} salvou sua playlist ${playlist.name}`,
      link: `/profile/${actor?.username || userId}`,
    });
  }

  return save;
}

async function unsavePlaylist(playlistId, userId) {
  return prisma.playlistSave.delete({ where: { playlistId_userId: { playlistId, userId } } });
}

async function addTrackComment(trackId, userId, content) {
  const comment = await prisma.trackComment.create({
    data: { trackId, userId, content },
  });

  const [actor, track] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, username: true } }),
    prisma.track.findUnique({
      where: { id: trackId },
      select: { title: true, project: { select: { ownerId: true, id: true } } },
    }),
  ]);

  if (track?.project?.ownerId) {
    await createNotification({
      userId: track.project.ownerId,
      actorId: userId,
      type: "track_comment",
      message: `${actor?.name || "Alguém"} comentou na sua track ${track.title}`,
      link: `/projects/${track.project.id}`,
    });
  }

  return comment;
}

async function addTrackPlay(trackId, userId) {
  return prisma.trackPlay.create({
    data: { trackId, userId },
  });
}

module.exports = {
  listProductions,
  listProjectPosts,
  listSocialPosts,
  createSocialPost,
  likeSocialPost,
  commentSocialPost,
  listSocialComments,
  saveSocialPost,
  unsaveSocialPost,
  listPlaylists,
  getTrack,
  updateTrackTitle,
  likeTrack,
  saveTrack,
  unsaveTrack,
  savePlaylist,
  unsavePlaylist,
  addTrackComment,
  addTrackPlay,
};
