// Campos de usuário que podem aparecer para outras pessoas.
// Nunca use `include: { user: true }`: isso traz email e passwordHash.
const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
};

module.exports = { PUBLIC_USER_SELECT };
