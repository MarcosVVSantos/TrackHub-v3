const prisma = require("../lib/prisma");
const { httpError } = require("./accessService");
const { PUBLIC_USER_SELECT } = require("../utils/publicUser");

const ME_SELECT = {
  id: true,
  email: true,
  username: true,
  name: true,
  avatarUrl: true,
  bio: true,
  isActive: true,
  theme: true,
  createdAt: true,
  role: true,
  genres: true,
  city: true,
  openToCollab: true,
};

const PROFILE_SELECT = { ...PUBLIC_USER_SELECT, role: true, genres: true, city: true, openToCollab: true };

const MAX_GENRES = 8;

function parseGenres(value) {
  if (!Array.isArray(value) || value.length > MAX_GENRES) {
    throw httpError(400, `Escolha no máximo ${MAX_GENRES} gêneros`);
  }
  const genres = [...new Set(value.map((genre) => (typeof genre === "string" ? genre.trim() : "")))];
  if (genres.some((genre) => !genre || genre.length > 24)) throw httpError(400, "Cada gênero deve ter até 24 caracteres");
  return genres;
}

async function getMe(userId) {
  return prisma.user.findUnique({ where: { id: userId }, select: ME_SELECT });
}

async function updateMe(userId, data = {}) {
  const payload = {
    name: typeof data.name === "string" ? data.name.trim() : undefined,
    username: typeof data.username === "string" ? data.username.trim() : undefined,
    bio: data.bio,
    theme: data.theme,
  };

  if (payload.username) {
    if (!/^[a-zA-Z0-9_.]{3,30}$/.test(payload.username)) {
      throw httpError(400, "Username com 3 a 30 caracteres: letras, números, ponto e underline");
    }
    const existing = await prisma.user.findFirst({ where: { username: payload.username, NOT: { id: userId } } });
    if (existing) throw httpError(400, "Username já em uso");
  }
  if (payload.theme && !["light", "dark"].includes(payload.theme)) throw httpError(400, "Tema inválido. Use light ou dark.");
  if (payload.name !== undefined && (payload.name.length < 2 || payload.name.length > 60)) {
    throw httpError(400, "O nome deve ter entre 2 e 60 caracteres");
  }
  if (payload.bio != null && (typeof payload.bio !== "string" || payload.bio.length > 280)) {
    throw httpError(400, "A bio deve ter no máximo 280 caracteres");
  }

  // Perfil musical
  if (data.role !== undefined) {
    if (data.role !== null && (typeof data.role !== "string" || data.role.trim().length > 40)) {
      throw httpError(400, "Função com no máximo 40 caracteres");
    }
    payload.role = data.role ? data.role.trim() : null;
  }
  if (data.city !== undefined) {
    if (data.city !== null && (typeof data.city !== "string" || data.city.trim().length > 60)) {
      throw httpError(400, "Cidade com no máximo 60 caracteres");
    }
    payload.city = data.city ? data.city.trim() : null;
  }
  if (data.genres !== undefined) payload.genres = data.genres === null ? null : parseGenres(data.genres);
  if (data.openToCollab !== undefined) payload.openToCollab = Boolean(data.openToCollab);

  return prisma.user.update({ where: { id: userId }, data: payload, select: ME_SELECT });
}

async function updateAvatar(userId, avatarUrl) {
  return prisma.user.update({ where: { id: userId }, data: { avatarUrl }, select: ME_SELECT });
}

// Última faixa pública de cada usuário: serve de "amostra" no Encontrar parceiros.
async function latestPublicTracks(userIds) {
  if (!userIds.length) return new Map();
  const tracks = await prisma.track.findMany({
    where: { isPublic: true, project: { ownerId: { in: userIds }, archivedAt: null } },
    select: { id: true, title: true, audioUrl: true, coverUrl: true, createdAt: true, project: { select: { ownerId: true } } },
    orderBy: { createdAt: "desc" },
  });
  const map = new Map();
  for (const track of tracks) {
    if (!map.has(track.project.ownerId)) {
      map.set(track.project.ownerId, { id: track.id, title: track.title, audioUrl: track.audioUrl, coverUrl: track.coverUrl });
    }
  }
  return map;
}

function genreMatches(userGenres, genre) {
  if (!genre) return true;
  const target = genre.toLowerCase();
  return Array.isArray(userGenres) && userGenres.some((item) => String(item).toLowerCase() === target);
}

async function decorate(userId, users) {
  const userIds = users.map((item) => item.id);
  if (!userIds.length) return [];
  const [followers, following, samples] = await Promise.all([
    prisma.follow.groupBy({ by: ["followingId"], where: { followingId: { in: userIds } }, _count: { _all: true } }),
    prisma.follow.findMany({ where: { followerId: userId, followingId: { in: userIds } }, select: { followingId: true } }),
    latestPublicTracks(userIds),
  ]);
  const followersMap = new Map(followers.map((item) => [item.followingId, item._count._all]));
  const followingSet = new Set(following.map((item) => item.followingId));
  return users.map((item) => ({
    ...item,
    genres: Array.isArray(item.genres) ? item.genres : [],
    followersCount: followersMap.get(item.id) || 0,
    isFollowing: followingSet.has(item.id),
    sample: samples.get(item.id) || null,
  }));
}

// Encontrar parceiros: busca por nome, função, gênero e quem está aberto a colaborar.
async function listExplore(userId, { q = "", role = "", genre = "", open = false } = {}) {
  const query = String(q).trim().slice(0, 60);
  const users = await prisma.user.findMany({
    where: {
      id: { not: userId },
      isActive: true,
      ...(open ? { openToCollab: true } : {}),
      ...(role ? { role: { equals: String(role).slice(0, 40), mode: "insensitive" } } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { username: { contains: query, mode: "insensitive" } },
              { city: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: PROFILE_SELECT,
    orderBy: [{ openToCollab: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  const filtered = users.filter((item) => genreMatches(item.genres, genre)).slice(0, 48);
  return decorate(userId, filtered);
}

// Sugestões para o Início: abertos a colaborar, que ainda não estão nos seus projetos,
// priorizando quem tem gêneros em comum com as tags dos seus projetos.
async function listSuggestions(userId, limit = 3) {
  const [projects, memberships] = await Promise.all([
    prisma.project.findMany({ where: { ownerId: userId, archivedAt: null }, select: { id: true, tags: true } }),
    prisma.projectMember.findMany({
      where: { project: { ownerId: userId }, userId: { not: null } },
      select: { userId: true },
    }),
  ]);
  const myGenres = new Set(
    projects.flatMap((project) => (Array.isArray(project.tags) ? project.tags : [])).map((tag) => String(tag).toLowerCase())
  );
  const exclude = [userId, ...memberships.map((member) => member.userId)];

  const candidates = await prisma.user.findMany({
    where: { id: { notIn: exclude }, isActive: true, openToCollab: true },
    select: PROFILE_SELECT,
    take: 60,
    orderBy: { createdAt: "desc" },
  });

  const scored = candidates
    .map((item) => ({
      item,
      score: (Array.isArray(item.genres) ? item.genres : []).filter((g) => myGenres.has(String(g).toLowerCase())).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => item);

  return decorate(userId, scored);
}

module.exports = {
  getMe,
  updateMe,
  updateAvatar,
  listExplore,
  listSuggestions,
  PROFILE_SELECT,
};
