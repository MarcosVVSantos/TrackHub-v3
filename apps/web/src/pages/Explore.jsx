import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, UserPlus, Check, Users, Layers } from "lucide-react";
import { apiRequest, getAccessToken } from "../api/client";
import Skeleton from "../components/Skeleton";

function Explore() {
  const token = getAccessToken();
  const [query, setQuery] = useState("");
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const trimmedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        setLoading(true);
        setError("");
        const data = await apiRequest(`/users/explore?q=${encodeURIComponent(trimmedQuery)}`, { token });
        setArtists(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [trimmedQuery, token]);

  async function handleToggleFollow(artist) {
    if (!token) return;
    if (artist.isFollowing) {
      await apiRequest(`/follows/${artist.id}`, { method: "DELETE", token });
    } else {
      await apiRequest(`/follows/${artist.id}`, { method: "POST", token });
    }
    setArtists((prev) =>
      prev.map((item) =>
        item.id === artist.id
          ? {
              ...item,
              isFollowing: !artist.isFollowing,
              followersCount: item.followersCount + (artist.isFollowing ? -1 : 1),
            }
          : item
      )
    );
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <div className="card">Faça login para explorar artistas.</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <div className="card border border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200">
          <p>{error}</p>
          <button className="btn-secondary mt-3" onClick={() => setQuery((value) => value)}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-brand-text">Explorar artistas</h2>
        <p className="text-sm text-gray-500 dark:text-brand-textMuted">
          Descubra criadores ativos e comece novas conexões.
        </p>
      </div>

      <div className="card flex items-center gap-3">
        <Search size={16} className="text-gray-400" />
        <input
          className="w-full bg-transparent text-sm text-gray-700 outline-none dark:text-brand-text"
          placeholder="Buscar por nome ou username"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {loading ? (
        <Skeleton lines={8} />
      ) : null}

      {!loading && artists.length === 0 ? (
        <div className="card text-sm text-gray-500 dark:text-brand-textMuted">Nenhum artista encontrado.</div>
      ) : null}

      <div className="grid gap-4">
        {artists.map((artist) => (
          <div key={artist.id} className="card flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Avatar artist={artist} />
              <div>
                <Link
                  to={`/profile/${artist.username}`}
                  className="text-base font-semibold text-gray-800 hover:text-brand-primary dark:text-brand-text"
                >
                  {artist.name}
                </Link>
                <p className="text-xs text-gray-400 dark:text-brand-textMuted">@{artist.username}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-brand-textMuted">
                  <span className="flex items-center gap-1">
                    <Users size={12} />
                    {artist.followersCount} seguidores
                  </span>
                  <span className="flex items-center gap-1">
                    <Layers size={12} />
                    {artist.projectsCount} produções públicas
                  </span>
                </div>
              </div>
            </div>
            <button className="btn-secondary" onClick={() => handleToggleFollow(artist)}>
              {artist.isFollowing ? <Check size={16} /> : <UserPlus size={16} />}
              {artist.isFollowing ? "Seguindo" : "Seguir"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Avatar({ artist }) {
  if (artist.avatarUrl) {
    return <img src={artist.avatarUrl} alt={artist.name} className="h-14 w-14 rounded-full object-cover" />;
  }
  const initials = artist.name
    ? artist.name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
    : "";
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary/20 text-sm font-semibold text-brand-primary">
      {initials}
    </div>
  );
}

export default Explore;