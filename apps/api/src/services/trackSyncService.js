const prisma = require("../lib/prisma");
const config = require("../config");
const { resolveFileUrl } = require("./storageService");
const logger = require("../utils/logger");

// A "faixa pública" (model Track) é o que entra em playlists, no feed e no perfil.
// Antes ninguém criava esse registro: um projeto público nunca virava faixa.
// Agora ela é mantida automaticamente a partir do projeto:
//  - projeto público + capa + pelo menos um áudio  -> existe uma Track pública
//  - projeto privado/arquivado/sem áudio            -> Track fica escondida (isPublic=false)
// O audioUrl aponta para /tracks/:id/audio, que redireciona para a versão de áudio
// mais recente (com link assinado quando o arquivo é privado).
async function syncProjectTrack(projectId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      description: true,
      coverUrl: true,
      isPublic: true,
      archivedAt: true,
      files: { where: { type: { startsWith: "audio/" } }, select: { id: true }, take: 1 },
      tracks: { select: { id: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!project) return null;

  const visible = project.isPublic && !project.archivedAt && Boolean(project.coverUrl) && project.files.length > 0;
  if (!visible) {
    if (project.tracks.length) {
      await prisma.track.updateMany({ where: { projectId }, data: { isPublic: false } });
    }
    return null;
  }

  const data = { title: project.name, description: project.description, coverUrl: project.coverUrl, isPublic: true };
  const track = project.tracks[0] || (await prisma.track.create({ data: { ...data, projectId, audioUrl: "" } }));
  return prisma.track.update({
    where: { id: track.id },
    data: { ...data, audioUrl: `${config.publicUrl}/tracks/${track.id}/audio` },
  });
}

// Versão que nunca derruba a requisição principal (upload, edição do projeto...).
async function syncProjectTrackSafe(projectId) {
  try {
    return await syncProjectTrack(projectId);
  } catch (error) {
    logger.warn("track_sync_failed", { projectId, error: error.message });
    return null;
  }
}

// Corrige projetos que já eram públicos antes desta mudança (roda sob demanda, é barato).
async function backfillPublicTracks(limit = 50) {
  try {
    const pending = await prisma.project.findMany({
      where: {
        isPublic: true,
        archivedAt: null,
        coverUrl: { not: null },
        tracks: { none: {} },
        files: { some: { type: { startsWith: "audio/" } } },
      },
      select: { id: true },
      take: limit,
    });
    for (const project of pending) {
      await syncProjectTrackSafe(project.id);
    }
  } catch {
    // backfill é "melhor esforço"
  }
}

// Para /tracks/:id/audio: só toca faixa pública de projeto público.
async function getPublicTrackAudioUrl(trackId) {
  const track = await prisma.track.findUnique({
    where: { id: trackId },
    select: {
      isPublic: true,
      audioUrl: true,
      project: {
        select: {
          isPublic: true,
          archivedAt: true,
          files: {
            where: { type: { startsWith: "audio/" } },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { url: true },
          },
        },
      },
    },
  });
  if (!track || !track.isPublic || !track.project?.isPublic || track.project.archivedAt) return null;
  const latest = track.project.files[0]?.url;
  if (latest) return resolveFileUrl(latest);
  // Faixas antigas (seed) guardavam a URL direto no audioUrl.
  return track.audioUrl && !track.audioUrl.includes(`/tracks/${trackId}/audio`) ? resolveFileUrl(track.audioUrl) : null;
}

module.exports = { syncProjectTrack, syncProjectTrackSafe, backfillPublicTracks, getPublicTrackAudioUrl };
