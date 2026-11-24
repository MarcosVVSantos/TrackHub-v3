import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ListMusic, Lock, Globe, Music } from "lucide-react";
import { apiRequest } from "../api/client";
import CreatePlaylistModal from "../components/playlists/CreatePlaylistModal";
import Skeleton from "../components/Skeleton";

function PlaylistCard({ playlist }) {
  const cover = playlist.tracks?.[0]?.track?.project?.coverUrl || null;

  return (
    <Link
      to={`/playlists/${playlist.id}`}
      className="group rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden hover:shadow-md transition"
    >
      <div className="aspect-square bg-gray-100 dark:bg-white/10 relative overflow-hidden">
        {cover ? (
          <img src={cover} alt={playlist.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ListMusic size={32} className="text-gray-300 dark:text-gray-600" />
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-sm text-gray-900 dark:text-brand-text truncate">{playlist.name}</p>
          {playlist.isPublic
            ? <Globe size={13} className="text-gray-400 shrink-0 mt-0.5" />
            : <Lock size={13} className="text-gray-400 shrink-0 mt-0.5" />
          }
        </div>
        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
          <Music size={11} />
          {playlist._count?.tracks ?? 0} track{playlist._count?.tracks !== 1 ? "s" : ""}
        </p>
        {playlist.description && (
          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{playlist.description}</p>
        )}
      </div>
    </Link>
  );
}

export default function Playlists() {
  const [playlists, setPlaylists] = useState(null);
  const [openCreate, setOpenCreate] = useState(false);

  async function load() {
    try {
      const data = await apiRequest("/playlists/mine");
      setPlaylists(data);
    } catch {
      setPlaylists([]);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-brand-primary">Minhas Playlists</h2>
          <p className="text-sm text-gray-500 dark:text-brand-textMuted">
            Curate tracks de projetos públicos de outros artistas
          </p>
        </div>
        <button className="btn-primary" onClick={() => setOpenCreate(true)}>
          <Plus size={16} />
          Nova playlist
        </button>
      </div>

      {playlists === null ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      ) : playlists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <ListMusic size={40} className="text-gray-300 dark:text-gray-600" />
          <div>
            <p className="font-medium text-gray-700 dark:text-gray-300">Nenhuma playlist ainda</p>
            <p className="text-sm text-gray-400 mt-1">Crie sua primeira playlist e adicione tracks de outros artistas</p>
          </div>
          <button className="btn-primary" onClick={() => setOpenCreate(true)}>
            <Plus size={15} />
            Criar playlist
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {playlists.map((pl) => <PlaylistCard key={pl.id} playlist={pl} />)}
        </div>
      )}

      <CreatePlaylistModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreated={() => load()}
      />
    </div>
  );
}
