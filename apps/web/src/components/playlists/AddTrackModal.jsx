import { useEffect, useState, useRef } from "react";
import { X, Search, Loader2, Plus, Check, Music } from "lucide-react";
import { apiRequest } from "../../api/client";

function TrackRow({ track, onAdd, onRemove }) {
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    try {
      if (track.inPlaylist) {
        await onRemove(track.id);
      } else {
        await onAdd(track.id);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3 py-2.5 px-1 rounded-lg hover:bg-th-raised transition">
      <div className="h-10 w-10 rounded-lg overflow-hidden shrink-0 bg-th-raised flex items-center justify-center">
        {track.project?.coverUrl ? (
          <img src={track.project.coverUrl} alt={track.project.name} className="h-full w-full object-cover" />
        ) : (
          <Music size={16} className="text-th-muted" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-th-text truncate">{track.title}</p>
        <p className="text-xs text-th-muted truncate">
          {track.project?.name} · {track.project?.owner?.name}
        </p>
      </div>
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition ${
          track.inPlaylist
            ? "bg-th-raised  text-th-lilac"
            : "bg-th-raised  text-th-muted hover:bg-th-raised hover:text-th-lilac "
        }`}
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : track.inPlaylist ? (
          <Check size={14} />
        ) : (
          <Plus size={14} />
        )}
      </button>
    </div>
  );
}

export default function AddTrackModal({ open, playlistId, onClose, onChanged }) {
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setTracks([]);
      return;
    }
    fetchTracks("");
  }, [open, playlistId]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchTracks(query);
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  async function fetchTracks(q) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ q, playlistId });
      const data = await apiRequest(`/playlists/tracks/search?${params}`);
      setTracks(data);
    } catch {
      setTracks([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(trackId) {
    await apiRequest(`/playlists/${playlistId}/tracks`, {
      method: "POST",
      body: { trackId },
    });
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, inPlaylist: true } : t))
    );
    onChanged?.();
  }

  async function handleRemove(trackId) {
    await apiRequest(`/playlists/${playlistId}/tracks/${trackId}`, { method: "DELETE" });
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, inPlaylist: false } : t))
    );
    onChanged?.();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-th-surface shadow-xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-th-lilac">Adicionar tracks</h3>
            <p className="text-xs text-th-muted">Projetos públicos de outros artistas</p>
          </div>
          <button type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pb-3 shrink-0">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-th-muted" />
            <input
              className="input pl-9"
              placeholder="Buscar por título, projeto ou artista..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-4">
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-th-muted" />
            </div>
          )}
          {!loading && tracks.length === 0 && (
            <p className="text-center text-sm text-th-muted py-8">
              {query ? "Nenhuma track encontrada." : "Nenhuma track pública disponível no momento."}
            </p>
          )}
          {!loading && tracks.map((track) => (
            <TrackRow
              key={track.id}
              track={track}
              onAdd={handleAdd}
              onRemove={handleRemove}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
