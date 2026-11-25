const prisma = require("../lib/prisma");
const { withResolvedUrls } = require("./storageService");
const { backfillPublicTracks } = require("./trackSyncService");
const { PUBLIC_USER_SELECT } = require("../utils/publicUser");

const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_TRACKS_PER_PLAYLIST = 200;

function assertOwner(playlist, userId) {
  if (playlist.creatorId !== userId) {
    const err = new Error("Sem permissão para editar esta playlist.");
    err.status = 403;
    throw err;
  }
}

async function createPlaylist(userId, { name, description, isPublic }) {
  if (!name || typeof name !== "string" || !name.trim()) {
    const err = new Error("Nome da playlist é obrigatório.");
    err.status = 400;
    throw err;
  }
  if (name.trim().length > MAX_NAME_LENGTH) {
    const err = new Error(`Nome muito longo. Máximo de ${MAX_NAME_LENGTH} caracteres.`);
    err.status = 400;
    throw err;
  }
  if (description && description.length > MAX_DESCRIPTION_LENGTH) {
    const err = new Error(`Descrição muito longa. Máximo de ${MAX_DESCRIPTION_LENGTH} caracteres.`);
    err.status = 400;
    throw err;
  }

  return prisma.playlist.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      isPublic: Boolean(isPublic),
      creatorId: userId,
    },
    include: {
      creator: { select: { id: true, name: true, username: true, avatarUrl: true } },
      _count: { select: { tracks: true, saves: true } },
    },
  });
}

async function listMyPlaylists(userId) {
  return prisma.playlist.findMany({
    where: { creatorId: userId },
    include: {
      tracks: {
        include: {
          track: {
            select: {
              id: true, title: true, audioUrl: true, coverUrl: true,
              project: { select: { id: true, name: true, owner: { select: { id: true, name: true, username: true } } } },
            },
          },
        },
        orderBy: { order: "asc" },
        take: 4,
      },
      _count: { select: { tracks: true, saves: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

async function getPlaylist(playlistId, userId) {
  const playlist = await prisma.playlist.findUnique({
    where: { id: playlistId },
    include: {
      creator: { select: { id: true, name: true, username: true, avatarUrl: true } },
      tracks: {
        // Faixas que o dono tornou privadas somem das playlists dos outros.
        where: { track: { isPublic: true } },
        include: {
          track: {
            select: {
              id: true, title: true, audioUrl: true, coverUrl: true, isPublic: true,
              project: {
                select: {
                  id: true, name: true, coverUrl: true,
                  owner: { select: { id: true, name: true, username: true, avatarUrl: true } },
                },
              },
            },
          },
        },
        orderBy: { order: "asc" },
      },
      saves: { where: { userId }, select: { id: true } },
      _count: { select: { tracks: true, saves: true } },
    },
  });

  if (!playlist) {
    const err = new Error("Playlist não encontrada.");
    err.status = 404;
    throw err;
  }

  // Playlists privadas só visíveis ao criador
  if (!playlist.isPublic && playlist.creatorId !== userId) {
    const err = new Error("Esta playlist é privada.");
    err.status = 403;
    throw err;
  }

  return { ...playlist, saved: playlist.saves.length > 0 };
}

async function updatePlaylist(userId, playlistId, { name, description, isPublic }) {
  const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
  if (!playlist) {
    const err = new Error("Playlist não encontrada.");
    err.status = 404;
    throw err;
  }
  assertOwner(playlist, userId);

  if (name !== undefined) {
    if (!name || !name.trim()) {
      const err = new Error("Nome não pode ser vazio.");
      err.status = 400;
      throw err;
    }
    if (name.trim().length > MAX_NAME_LENGTH) {
      const err = new Error(`Nome muito longo. Máximo de ${MAX_NAME_LENGTH} caracteres.`);
      err.status = 400;
      throw err;
    }
  }

  return prisma.playlist.update({
    where: { id: playlistId },
    data: {
      name: name?.trim() ?? playlist.name,
      description: description !== undefined ? (description?.trim() || null) : playlist.description,
      isPublic: isPublic !== undefined ? Boolean(isPublic) : playlist.isPublic,
    },
  });
}

async function deletePlaylist(userId, playlistId) {
  const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
  if (!playlist) {
    const err = new Error("Playlist não encontrada.");
    err.status = 404;
    throw err;
  }
  assertOwner(playlist, userId);

  // Remove tracks e saves antes de deletar a playlist
  await prisma.$transaction([
    prisma.playlistTrack.deleteMany({ where: { playlistId } }),
    prisma.playlistSave.deleteMany({ where: { playlistId } }),
    prisma.socialPost.deleteMany({ where: { playlistId } }),
    prisma.playlist.delete({ where: { id: playlistId } }),
  ]);
}

async function addTrack(userId, playlistId, trackId) {
  const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
  if (!playlist) {
    const err = new Error("Playlist não encontrada.");
    err.status = 404;
    throw err;
  }
  assertOwner(playlist, userId);

  // Verifica se a track existe e é pública
  const track = await prisma.track.findUnique({
    where: { id: trackId },
    include: { project: { select: { ownerId: true, isPublic: true } } },
  });

  if (!track) {
    const err = new Error("Track não encontrada.");
    err.status = 404;
    throw err;
  }

  if (!track.isPublic || !track.project.isPublic) {
    const err = new Error("Só é possível adicionar tracks de projetos públicos.");
    err.status = 403;
    throw err;
  }

  // Verifica limite de tracks por playlist
  const count = await prisma.playlistTrack.count({ where: { playlistId } });
  if (count >= MAX_TRACKS_PER_PLAYLIST) {
    const err = new Error(`Limite de ${MAX_TRACKS_PER_PLAYLIST} tracks por playlist atingido.`);
    err.status = 400;
    throw err;
  }

  // Evita duplicata
  const existing = await prisma.playlistTrack.findUnique({
    where: { playlistId_trackId: { playlistId, trackId } },
  });
  if (existing) {
    const err = new Error("Track já está na playlist.");
    err.status = 409;
    throw err;
  }

  const entry = await prisma.playlistTrack.create({
    data: { playlistId, trackId, order: count + 1 },
    include: {
      track: {
        select: {
          id: true, title: true, audioUrl: true, coverUrl: true,
          project: {
            select: {
              id: true, name: true,
              owner: { select: { id: true, name: true, username: true, avatarUrl: true } },
            },
          },
        },
      },
    },
  });

  // Atualiza updatedAt da playlist
  await prisma.playlist.update({ where: { id: playlistId }, data: { updatedAt: new Date() } });

  return entry;
}

async function removeTrack(userId, playlistId, trackId) {
  const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
  if (!playlist) {
    const err = new Error("Playlist não encontrada.");
    err.status = 404;
    throw err;
  }
  assertOwner(playlist, userId);

  await prisma.playlistTrack.delete({
    where: { playlistId_trackId: { playlistId, trackId } },
  });
}

async function reorderTracks(userId, playlistId, orderedTrackIds) {
  const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
  if (!playlist) {
    const err = new Error("Playlist não encontrada.");
    err.status = 404;
    throw err;
  }
  assertOwner(playlist, userId);

  if (!Array.isArray(orderedTrackIds)) {
    const err = new Error("Lista de IDs inválida.");
    err.status = 400;
    throw err;
  }

  await prisma.$transaction(
    orderedTrackIds.map((trackId, index) =>
      prisma.playlistTrack.update({
        where: { playlistId_trackId: { playlistId, trackId } },
        data: { order: index + 1 },
      })
    )
  );
}

// Busca tracks públicas de projetos de outros usuários
async function searchPublicTracks(userId, query = "", playlistId = null) {
  // Garante que projetos públicos antigos já tenham a sua faixa pública.
  await backfillPublicTracks();
  const where = {
    isPublic: true,
    // Suas faixas públicas também podem entrar nas suas playlists.
    project: {
      isPublic: true,
      archivedAt: null,
    },
    ...(query.trim()
      ? {
          OR: [
            { title: { contains: query.trim(), mode: "insensitive" } },
            { project: { name: { contains: query.trim(), mode: "insensitive" } } },
            { project: { owner: { name: { contains: query.trim(), mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const tracks = await prisma.track.findMany({
    where,
    include: {
      project: {
        select: {
          id: true, name: true, coverUrl: true,
          owner: { select: { id: true, name: true, username: true, avatarUrl: true } },
        },
      },
      _count: { select: { likes: true, plays: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  // Marca quais já estão na playlist (se informado)
  const ownPlaylist = playlistId
    ? await prisma.playlist.findFirst({ where: { id: playlistId, creatorId: userId }, select: { id: true } })
    : null;

  if (ownPlaylist) {
    const existing = await prisma.playlistTrack.findMany({
      where: { playlistId },
      select: { trackId: true },
    });
    const existingSet = new Set(existing.map((e) => e.trackId));
    return tracks.map((t) => ({ ...t, inPlaylist: existingSet.has(t.id) }));
  }

  return tracks.map((t) => ({ ...t, inPlaylist: false }));
}

// Playlists automáticas: não ficam no banco, são montadas na hora a partir dos projetos.
//  - "Em andamento": a versão mais recente de cada projeto seu que ainda não foi finalizado.
//  - "Versões novas": áudios que outras pessoas subiram nos seus projetos nos últimos 7 dias.
const AUTO_FILE_SELECT = {
  id: true,
  url: true,
  name: true,
  durationSec: true,
  createdAt: true,
  versions: { select: { version: true }, take: 1 },
  uploader: { select: PUBLIC_USER_SELECT },
  project: { select: { id: true, name: true, status: true, coverUrl: true } },
};

function toAutoTrack(file) {
  return {
    fileId: file.id,
    title: file.project.name,
    projectId: file.project.id,
    status: file.project.status,
    coverUrl: file.project.coverUrl,
    version: file.versions[0]?.version || "v1",
    uploader: file.uploader,
    createdAt: file.createdAt,
    durationSec: file.durationSec,
    url: file.url,
  };
}

async function listAutoPlaylists(userId) {
  const mine = { archivedAt: null, OR: [{ ownerId: userId }, { members: { some: { userId, status: "accepted" } } }] };

  const [inProgressProjects, recentFiles] = await Promise.all([
    prisma.project.findMany({
      where: { ...mine, status: { not: "finished" } },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        files: {
          where: { type: { startsWith: "audio/" } },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: AUTO_FILE_SELECT,
        },
      },
    }),
    prisma.fileAsset.findMany({
      where: {
        type: { startsWith: "audio/" },
        uploaderId: { not: userId },
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        project: mine,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: AUTO_FILE_SELECT,
    }),
  ]);

  const inProgress = await withResolvedUrls(inProgressProjects.flatMap((project) => project.files));
  const recent = await withResolvedUrls(recentFiles);

  return [
    {
      id: "auto-em-andamento",
      name: "Em andamento",
      description: "A versão mais recente de cada projeto seu que ainda não foi finalizado. Atualiza sozinha.",
      tracks: inProgress.map(toAutoTrack),
    },
    {
      id: "auto-versoes-novas",
      name: "Versões novas",
      description: "O que seus parceiros subiram nos seus projetos nos últimos 7 dias.",
      tracks: recent.map(toAutoTrack),
    },
  ];
}

module.exports = {
  listAutoPlaylists,
  createPlaylist,
  listMyPlaylists,
  getPlaylist,
  updatePlaylist,
  deletePlaylist,
  addTrack,
  removeTrack,
  reorderTracks,
  searchPublicTracks,
};
