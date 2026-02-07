const prisma = require("../lib/prisma");

async function listFeed() {
  return prisma.track.findMany({
    where: { isPublic: true },
    include: {
      project: true,
      _count: { select: { likes: true, comments: true, plays: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

async function getTrack(trackId) {
  return prisma.track.findUnique({
    where: { id: trackId },
    include: {
      project: true,
      comments: { include: { user: true } },
      _count: { select: { likes: true, comments: true, plays: true } },
    },
  });
}

async function likeTrack(trackId, userId) {
  return prisma.trackLike.create({
    data: { trackId, userId },
  });
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
  listFeed,
  getTrack,
  likeTrack,
  addTrackComment,
  addTrackPlay,
};
