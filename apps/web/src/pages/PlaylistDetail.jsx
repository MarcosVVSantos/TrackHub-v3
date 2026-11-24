import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Play, Pause, Plus, Trash2, Pencil, Globe, Lock,
  Music, ArrowLeft, Loader2, GripVertical, X, Check,
} from "lucide-react";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { usePlayer } from "../context/PlayerContext";
import AddTrackModal from "../components/playlists/AddTrackModal";

function EditableField({ value, onSave, multiline = false, className = "" }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (draft === value) { setEditing(false); return; }
    setLoading(true);
    try {
      await onSave(draft);
      setEditing(false);
    } finally {
      setLoading(false);
    }
  }

  if (editing) {
    const Tag = multiline ? "textarea" : "input";
    return (
      <div className="flex items-center gap-2">
        <Tag
          className={`input ${multiline ? "resize-none" : ""} ${className}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={multiline ? 2 : undefined}
          autoFocus
          onKeyDown={(e) => {
            if (!multiline && e.key === "Enter") handleSave();
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <button onClick={handleSave} disabled={loading} className="text-stage-finished hover:text-stage-finished">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
        </button>
        <button onClick={() => setEditing(false)} className="text-th-muted hover:text-th-text2">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => { setDraft(value || ""); setEditing(true); }}
      className={`text-left hover:underline decoration-dashed underline-offset-2 ${className}`}
    >
      {value || <span className="text-th-muted italic">Adicionar descrição</span>}
    </button>
  );
}

function TrackRow({ entry, index, isOwner, isPlaying, onPlay, onRemove }) {
  const track = entry.track;

  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition group ${isPlaying ? "bg-th-raised " : "hover:bg-th-raised "}`}>
      {isOwner && (
        <GripVertical size={14} className="text-th-muted shrink-0 cursor-grab" />
      )}
      <span className="text-xs text-th-muted w-5 text-right shrink-0">{index + 1}</span>

      <button
        onClick={() => onPlay(entry)}
        className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition ${
          isPlaying
            ? "bg-th-lilac text-th-bg"
            : "bg-th-raised  text-th-muted group-hover:bg-th-raised group-hover:text-th-lilac "
        }`}
      >
        {isPlaying ? <Pause size={13} /> : <Play size={13} />}
      </button>

      <div className="h-9 w-9 rounded-lg overflow-hidden shrink-0 bg-th-raised flex items-center justify-center">
        {track.project?.coverUrl ? (
          <img src={track.project.coverUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Music size={14} className="text-th-muted" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isPlaying ? "text-th-lilac " : "text-th-text "}`}>
          {track.title}
        </p>
        <p className="text-xs text-th-muted truncate">
          <Link to={`/projects/${track.project?.id}`} className="hover:underline">
            {track.project?.name}
          </Link>
          {" · "}
          <Link to={`/profile/${track.project?.owner?.username}`} className="hover:underline">
            {track.project?.owner?.name}
          </Link>
        </p>
      </div>

      {isOwner && (
        <button
          onClick={() => onRemove(track.id)}
          className="opacity-0 group-hover:opacity-100 text-th-muted hover:text-th-danger transition p-1"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

export default function PlaylistDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const player = usePlayer();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddTrack, setShowAddTrack] = useState(false);
  const [deletingPlaylist, setDeletingPlaylist] = useState(false);

  const isOwner = playlist?.creatorId === user?.id;

  async function load() {
    try {
      setLoading(true);
      const data = await apiRequest(`/playlists/${id}`);
      setPlaylist(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function handleUpdateField(field, value) {
    const updated = await apiRequest(`/playlists/${id}`, {
      method: "PUT",
      body: { [field]: value },
    });
    setPlaylist((prev) => ({ ...prev, ...updated }));
  }

  async function handleRemoveTrack(trackId) {
    await apiRequest(`/playlists/${id}/tracks/${trackId}`, { method: "DELETE" });
    setPlaylist((prev) => ({
      ...prev,
      tracks: prev.tracks.filter((e) => e.track.id !== trackId),
      _count: { ...prev._count, tracks: prev._count.tracks - 1 },
    }));
  }

  async function handleDeletePlaylist() {
    if (!window.confirm("Deletar esta playlist permanentemente?")) return;
    setDeletingPlaylist(true);
    try {
      await apiRequest(`/playlists/${id}`, { method: "DELETE" });
      navigate("/playlists");
    } catch (err) {
      setError(err.message);
      setDeletingPlaylist(false);
    }
  }

  function handlePlay(entry) {
    const track = entry.track;
    if (player?.current?.id === track.id) {
      player.togglePlay();
      return;
    }
    player?.playTrack({
      id: track.id,
      title: track.title,
      audioUrl: track.audioUrl,
      coverUrl: track.project?.coverUrl,
      projectId: track.project?.id,
      projectName: track.project?.name,
      creatorName: track.project?.owner?.name,
    });
  }

  // Toca a playlist inteira em sequência (fila do player).
  function handlePlayAll() {
    const queue = playlist.tracks.map(({ track }) => ({
      id: track.id,
      title: track.title,
      subtitle: track.project?.owner?.name,
      audioUrl: track.audioUrl,
      coverUrl: track.project?.coverUrl,
      projectId: track.project?.id,
    }));
    player.playQueue(queue, 0);
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1240px] px-4 pt-7 sm:px-6 lg:px-10 lg:pt-9 space-y-4">
        <div className="h-8 w-48 bg-th-line2 rounded animate-pulse" />
        <div className="h-4 w-64 bg-th-raised rounded animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-[1240px] px-4 pt-7 sm:px-6 lg:px-10 lg:pt-9">
        <p className="text-th-danger">{error}</p>
      </div>
    );
  }

  if (!playlist) return null;

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 pt-7 sm:px-6 lg:px-10 lg:pt-9 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-th-muted hover:text-th-text2">
          <ArrowLeft size={20} />
        </button>
        <span className="text-sm text-th-muted">Playlists</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-5">
        {/* Capa */}
        <div className="h-36 w-36 rounded-xl overflow-hidden bg-th-raised shrink-0 flex items-center justify-center">
          {playlist.tracks?.[0]?.track?.project?.coverUrl ? (
            <img
              src={playlist.tracks[0].track.project.coverUrl}
              alt={playlist.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Music size={32} className="text-th-muted" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-1">
          {isOwner ? (
            <EditableField
              value={playlist.name}
              onSave={(v) => handleUpdateField("name", v)}
              className="text-2xl font-bold text-th-text w-full"
            />
          ) : (
            <h1 className="text-2xl font-bold text-th-text">{playlist.name}</h1>
          )}

          <div className="flex items-center gap-2 text-xs text-th-muted">
            {playlist.isPublic
              ? <><Globe size={12} /> Pública</>
              : <><Lock size={12} /> Privada</>
            }
            <span>·</span>
            <span>{playlist._count?.tracks ?? 0} tracks</span>
            <span>·</span>
            <Link to={`/profile/${playlist.creator?.username}`} className="hover:underline">
              {playlist.creator?.name}
            </Link>
          </div>

          {isOwner ? (
            <EditableField
              value={playlist.description}
              onSave={(v) => handleUpdateField("description", v)}
              multiline
              className="text-sm text-th-muted w-full"
            />
          ) : playlist.description ? (
            <p className="text-sm text-th-muted">{playlist.description}</p>
          ) : null}

          {playlist.tracks.length > 0 && (
            <div className="pt-2">
              <button className="btn-primary" type="button" onClick={handlePlayAll}>
                <Play size={14} fill="currentColor" />
                Tocar tudo
              </button>
            </div>
          )}

          {isOwner && (
            <div className="flex items-center gap-2 pt-2">
              <button className="btn-primary text-sm" onClick={() => setShowAddTrack(true)}>
                <Plus size={14} />
                Adicionar tracks
              </button>
              <button
                className="btn-secondary text-sm"
                onClick={() => handleUpdateField("isPublic", !playlist.isPublic)}
              >
                <Pencil size={13} />
                {playlist.isPublic ? "Tornar privada" : "Tornar pública"}
              </button>
              <button
                className="btn-secondary text-sm text-th-danger hover:text-th-danger"
                onClick={handleDeletePlaylist}
                disabled={deletingPlaylist}
              >
                {deletingPlaylist ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                Deletar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tracks */}
      <div className="space-y-1">
        {playlist.tracks.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-3 text-center">
            <Music size={32} className="text-th-muted" />
            <p className="text-sm text-th-muted">
              {isOwner
                ? "Nenhuma track ainda. Clique em \"Adicionar tracks\" para começar."
                : "Esta playlist está vazia."}
            </p>
          </div>
        ) : (
          playlist.tracks.map((entry, index) => (
            <TrackRow
              key={entry.track.id}
              entry={entry}
              index={index}
              isOwner={isOwner}
              isPlaying={player?.current?.id === entry.track.id && player?.isPlaying}
              onPlay={handlePlay}
              onRemove={handleRemoveTrack}
            />
          ))
        )}
      </div>

      <AddTrackModal
        open={showAddTrack}
        playlistId={id}
        onClose={() => setShowAddTrack(false)}
        onChanged={load}
      />
    </div>
  );
}
