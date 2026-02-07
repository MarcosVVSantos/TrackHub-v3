const prisma = require("../lib/prisma");

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
          tags: true,
          ownerId: true,
          owner: { select: { id: true, name: true, username: true, avatarUrl: true } },
        },
      },
      saves: { where: { userId }, select: { id: true } },
      _count: { select: { likes: true, comments: true, plays: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return tracks.map((track) => ({
    ...track,
    saved: track.saves.length > 0,
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
  if (existing) return existing;
  return prisma.socialPostLike.create({ data: { postId, userId } });
}

async function commentSocialPost(postId, userId, content) {
  return prisma.socialPostComment.create({ data: { postId, userId, content } });
}

async function saveSocialPost(postId, userId) {
  const existing = await prisma.socialPostSave.findUnique({
    where: { postId_userId: { postId, userId } },
  });
  if (existing) return existing;
  return prisma.socialPostSave.create({ data: { postId, userId } });
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
  if (existing) return existing;
  return prisma.trackLike.create({
    data: { trackId, userId },
  });
}

async function saveTrack(trackId, userId) {
  const existing = await prisma.trackSave.findUnique({ where: { trackId_userId: { trackId, userId } } });
  if (existing) return existing;
  return prisma.trackSave.create({ data: { trackId, userId } });
}

async function unsaveTrack(trackId, userId) {
  return prisma.trackSave.delete({ where: { trackId_userId: { trackId, userId } } });
}

async function savePlaylist(playlistId, userId) {
  const existing = await prisma.playlistSave.findUnique({
    where: { playlistId_userId: { playlistId, userId } },
  });
  if (existing) return existing;
  return prisma.playlistSave.create({ data: { playlistId, userId } });
}

async function unsavePlaylist(playlistId, userId) {
  return prisma.playlistSave.delete({ where: { playlistId_userId: { playlistId, userId } } });
}

async function addTrackComment(trackId, userId, content) {
  return prisma.trackComment.create({
    data: { trackId, userId, content },
  });
}

async function addTrackPlay(trackId, userId) {
  return prisma.trackPlay.create({
    data: { trackId, userId },
  });
}

module.exports = {
  listProductions,
  listSocialPosts,
  createSocialPost,
  likeSocialPost,
  commentSocialPost,
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
