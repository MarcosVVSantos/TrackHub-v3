import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Heart,
  MessageCircle,
  Play,
  Pause,
  Bookmark,
  Plus,
  Music,
  Layers,
  Sparkles,
  Send,
} from "lucide-react";
import { apiRequest, getAccessToken } from "../api/client";
import { useAuth } from "../context/AuthContext";
import Skeleton from "../components/Skeleton";

const TABS = [
  { id: "productions", label: "Feed" },
  { id: "social", label: "Social" },
  { id: "playlists", label: "Playlists" },
];

function formatRelativeTime(dateString) {
  if (!dateString) return "";
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ontem";
  return `há ${days} dias`;
}

function TagList({ tags }) {
  if (!Array.isArray(tags) || tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full border border-brand-primary/20 bg-brand-primary/5 px-2.5 py-1 text-xs font-medium text-brand-primary dark:border-brand-text/20 dark:bg-brand-darkOutline/60 dark:text-brand-text"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

function EmptyState({ title, description, cta }) {
  return (
    <div className="card flex flex-col gap-3 text-sm text-gray-500 dark:text-brand-textMuted">
      <p className="text-base font-semibold text-gray-700 dark:text-brand-text">{title}</p>
      <p>{description}</p>
      {cta && (
        <Link className="btn-secondary w-fit" to={cta.href}>
          {cta.label}
        </Link>
      )}
    </div>
  );
}

function Feed() {
  const { user } = useAuth() || {};
  const [activeTab, setActiveTab] = useState("productions");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [productions, setProductions] = useState([]);
  const [socialPosts, setSocialPosts] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playlistPlaying, setPlaylistPlaying] = useState(null);
  const [playlistIndex, setPlaylistIndex] = useState(0);
  const [showPostModal, setShowPostModal] = useState(false);
  const audioRef = useRef(null);
  const playlistAudioRef = useRef(null);
  const token = getAccessToken();

  async function loadTab(tabId) {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError("");
      if (tabId === "social") {
        const data = await apiRequest("/feed/social", { token });
        setSocialPosts(data);
      } else if (tabId === "playlists") {
        const data = await apiRequest("/feed/playlists", { token });
        setPlaylists(data);
      } else {
        const data = await apiRequest("/feed/productions", { token });
        setProductions(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTab(activeTab);
  }, [activeTab]);

  function handleTimeUpdate() {
    const audio = audioRef.current;
    if (!audio) return;
    setProgress(audio.currentTime);
    setDuration(audio.duration || 0);
  }

  function handlePlaylistTimeUpdate() {
    const audio = playlistAudioRef.current;
    if (!audio) return;
    setProgress(audio.currentTime);
    setDuration(audio.duration || 0);
  }

  async function handlePlayTrack(track) {
    if (!token) return;
    const audio = audioRef.current;
    if (!audio) return;
    if (playlistAudioRef.current) {
      playlistAudioRef.current.pause();
      setPlaylistPlaying(null);
    }
    if (nowPlaying?.id === track.id && isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }
    if (audio.src !== track.audioUrl) {
      audio.src = track.audioUrl;
    }
    await apiRequest(`/tracks/${track.id}/play`, { method: "POST", token });
    audio.play();
    setNowPlaying(track);
    setIsPlaying(true);
  }

  function handlePauseTrack() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setIsPlaying(false);
  }

  async function handleLikeTrack(trackId) {
    if (!token) return;
    await apiRequest(`/tracks/${trackId}/like`, { method: "POST", token });
    loadTab("productions");
  }

  async function handleSaveTrack(track) {
    if (!token) return;
    if (track.saved) {
      await apiRequest(`/tracks/${track.id}/save`, { method: "DELETE", token });
    } else {
      await apiRequest(`/tracks/${track.id}/save`, { method: "POST", token });
    }
    loadTab("productions");
  }

  async function handleCommentTrack(trackId, content) {
    if (!token) return;
    await apiRequest(`/tracks/${trackId}/comment`, { method: "POST", body: { content }, token });
    loadTab("productions");
  }

  async function handleUpdateTrackTitle(trackId, title) {
    if (!token) return;
    await apiRequest(`/tracks/${trackId}`, { method: "PATCH", body: { title }, token });
    loadTab("productions");
  }

  async function handleCreatePost(payload) {
    if (!token) return;
    await apiRequest("/feed/social", { method: "POST", body: payload, token });
    setShowPostModal(false);
    loadTab("social");
  }

  async function handleLikePost(postId) {
    if (!token) return;
    await apiRequest(`/feed/social/${postId}/like`, { method: "POST", token });
    loadTab("social");
  }

  async function handleSavePost(post) {
    if (!token) return;
    if (post.saved) {
      await apiRequest(`/feed/social/${post.id}/save`, { method: "DELETE", token });
    } else {
      await apiRequest(`/feed/social/${post.id}/save`, { method: "POST", token });
    }
    loadTab("social");
  }

  async function handleCommentPost(postId, content) {
    if (!token) return;
    await apiRequest(`/feed/social/${postId}/comment`, { method: "POST", body: { content }, token });
    loadTab("social");
  }

  async function handlePlayPlaylist(playlist) {
    if (!token) return;
    const audio = playlistAudioRef.current;
    if (!audio || playlist.tracks.length === 0) return;
    if (audioRef.current) {
      audioRef.current.pause();
      setNowPlaying(null);
    }
    setPlaylistPlaying(playlist);
    setPlaylistIndex(0);
    audio.src = playlist.tracks[0].track.audioUrl;
    audio.play();
    setIsPlaying(true);
  }

  function handlePlaylistEnded() {
    const audio = playlistAudioRef.current;
    if (!audio || !playlistPlaying) return;
    const nextIndex = playlistIndex + 1;
    if (nextIndex >= playlistPlaying.tracks.length) {
      setIsPlaying(false);
      return;
    }
    setPlaylistIndex(nextIndex);
    audio.src = playlistPlaying.tracks[nextIndex].track.audioUrl;
    audio.play();
  }

  async function handleSavePlaylist(playlist) {
    if (!token) return;
    if (playlist.saved) {
      await apiRequest(`/feed/playlists/${playlist.id}/save`, { method: "DELETE", token });
    } else {
      await apiRequest(`/feed/playlists/${playlist.id}/save`, { method: "POST", token });
    }
    loadTab("playlists");
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 p-6">
        <EmptyState
          title="Entre para ver seu feed"
          description="Siga artistas e comece a descobrir novas produções no TrackHub."
          cta={{ label: "Fazer login", href: "/login" }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <div className="card flex flex-col gap-3 border border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200">
          <p>{error}</p>
          <button className="btn-secondary w-fit" onClick={() => loadTab(activeTab)}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onEnded={() => setIsPlaying(false)} className="hidden" />
      <audio
        ref={playlistAudioRef}
        onTimeUpdate={handlePlaylistTimeUpdate}
        onEnded={handlePlaylistEnded}
        className="hidden"
      />
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-brand-text">Feed</h2>
          <p className="text-sm text-gray-500 dark:text-brand-textMuted">
            Descubra produções, interaja e acompanhe playlists dos artistas que você segue.
          </p>
        </div>
        {activeTab === "social" && (
          <button className="btn-primary w-fit" onClick={() => setShowPostModal(true)}>
            <Plus size={16} />
            Criar post
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.id
                ? "border-brand-primary bg-brand-primary/10 text-brand-primary dark:border-brand-text dark:bg-brand-darkOutline dark:text-brand-text"
                : "border-transparent bg-gray-100 text-gray-600 hover:text-brand-primary dark:bg-brand-darkOutline dark:text-brand-textMuted"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton lines={10} />
        </div>
      ) : null}

      {!loading && activeTab === "productions" && (
        <div className="space-y-4">
          {nowPlaying && (
            <div className="card sticky top-24 z-10 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-brand-text">Tocando agora</p>
                  <p className="text-sm text-gray-500 dark:text-brand-textMuted">{nowPlaying.title}</p>
                </div>
                <button className="btn-secondary" onClick={handlePauseTrack}>
                  <Pause size={16} />
                  Pausar
                </button>
              </div>
              <div className="h-1 w-full rounded-full bg-gray-100 dark:bg-brand-darkOutline">
                <div
                  className="h-1 rounded-full bg-brand-primary"
                  style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {productions.length === 0 ? (
            <EmptyState
              title="Seu feed está vazio"
              description="Siga artistas para ver as produções mais recentes por aqui."
              cta={{ label: "Explorar artistas", href: "/feed" }}
            />
          ) : (
            productions.map((track) => (
              <div key={track.id} className="card space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex gap-4">
                    <div className="h-16 w-16 overflow-hidden rounded-xl bg-gray-100 dark:bg-brand-darkOutline">
                      {track.coverUrl ? (
                        <img
                          src={track.coverUrl}
                          alt={track.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-400">
                          <Music size={20} />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        {user?.id === track.project?.ownerId ? (
                          <EditableTitle
                            value={track.title}
                            onSave={(value) => handleUpdateTrackTitle(track.id, value)}
                          />
                        ) : (
                          <h3 className="text-lg font-semibold text-gray-800 dark:text-brand-text">{track.title}</h3>
                        )}
                      </div>
                      <button className="text-xs font-semibold text-brand-primary">
                        {track.project?.owner?.name || "Autor"}
                      </button>
                      <p className="text-sm text-gray-500 dark:text-brand-textMuted">
                        {track.project?.name}
                      </p>
                    </div>
                  </div>
                  <TagList tags={track.project?.tags} />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button className="btn-secondary" onClick={() => handlePlayTrack(track)}>
                    {nowPlaying?.id === track.id && isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    {nowPlaying?.id === track.id && isPlaying ? "Pausar" : "Tocar"}
                  </button>
                  <button className="btn-secondary" onClick={() => handleLikeTrack(track.id)}>
                    <Heart size={16} />
                    Curtir ({track._count?.likes || 0})
                  </button>
                  <button className="btn-secondary" onClick={() => handleSaveTrack(track)}>
                    <Bookmark size={16} />
                    {track.saved ? "Salvo" : "Salvar"}
                  </button>
                  <span className="text-xs text-gray-400 dark:text-brand-textMuted">
                    {track._count?.plays || 0} plays
                  </span>
                </div>

                <TrackCommentBox onSubmit={(content) => handleCommentTrack(track.id, content)} />
              </div>
            ))
          )}
        </div>
      )}

      {!loading && activeTab === "social" && (
        <div className="space-y-4">
          {socialPosts.length === 0 ? (
            <EmptyState
              title="Nenhuma interação ainda"
              description="Crie um post ou siga artistas para ver os bastidores criativos."
              cta={{ label: "Encontrar projetos", href: "/projects" }}
            />
          ) : (
            socialPosts.map((post) => (
              <div key={post.id} className="card space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar user={post.author} />
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-brand-text">
                      {post.author?.name}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-brand-textMuted">
                      @{post.author?.username} · {formatRelativeTime(post.createdAt)}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-brand-textMuted">{post.content}</p>
                <PostReference post={post} />
                <div className="flex flex-wrap gap-3">
                  <button className="btn-secondary" onClick={() => handleLikePost(post.id)}>
                    <Heart size={16} />
                    Curtir ({post._count?.likes || 0})
                  </button>
                  <button className="btn-secondary" onClick={() => handleSavePost(post)}>
                    <Bookmark size={16} />
                    {post.saved ? "Salvo" : "Salvar"}
                  </button>
                </div>
                <TrackCommentBox
                  placeholder="Comente este post"
                  onSubmit={(content) => handleCommentPost(post.id, content)}
                />
              </div>
            ))
          )}
        </div>
      )}

      {!loading && activeTab === "playlists" && (
        <div className="space-y-4">
          {playlistPlaying && (
            <div className="card sticky top-24 z-10 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-brand-text">Playlist tocando</p>
                  <p className="text-sm text-gray-500 dark:text-brand-textMuted">
                    {playlistPlaying.name} · {playlistPlaying.tracks[playlistIndex]?.track?.title}
                  </p>
                </div>
                <button className="btn-secondary" onClick={() => playlistAudioRef.current?.pause()}>
                  <Pause size={16} />
                  Pausar
                </button>
              </div>
              <div className="h-1 w-full rounded-full bg-gray-100 dark:bg-brand-darkOutline">
                <div
                  className="h-1 rounded-full bg-brand-primary"
                  style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
          {playlists.length === 0 ? (
            <EmptyState
              title="Sem playlists por aqui"
              description="Siga artistas para descobrir as playlists públicas deles."
              cta={{ label: "Explorar artistas", href: "/feed" }}
            />
          ) : (
            playlists.map((playlist) => (
              <div key={playlist.id} className="card space-y-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-gray-800 dark:text-brand-text">{playlist.name}</p>
                    <p className="text-sm text-gray-500 dark:text-brand-textMuted">
                      {playlist.creator?.name}
                    </p>
                  </div>
                  <TagList tags={playlist.tags} />
                </div>
                <p className="text-xs text-gray-400 dark:text-brand-textMuted">
                  {playlist._count?.tracks || 0} faixas
                </p>
                <div className="flex flex-wrap gap-3">
                  <button className="btn-secondary" onClick={() => handlePlayPlaylist(playlist)}>
                    <Play size={16} />
                    Ouvir sequência
                  </button>
                  <button className="btn-secondary" onClick={() => handleSavePlaylist(playlist)}>
                    <Bookmark size={16} />
                    {playlist.saved ? "Salvo" : "Salvar"}
                  </button>
                </div>
                <div className="space-y-2 text-sm text-gray-500 dark:text-brand-textMuted">
                  {playlist.tracks.slice(0, 3).map((entry) => (
                    <div key={entry.track.id} className="flex items-center gap-2">
                      <Music size={14} />
                      <span>{entry.track.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showPostModal && (
        <CreatePostModal onClose={() => setShowPostModal(false)} onSubmit={handleCreatePost} />
      )}
    </div>
  );
}

function Avatar({ user }) {
  if (!user) return null;
  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt={user.name} className="h-10 w-10 rounded-full object-cover" />;
  }
  const initials = user.name
    ? user.name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
    : "";
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary/20 text-sm font-semibold text-brand-primary">
      {initials}
    </div>
  );
}

function EditableTitle({ value, onSave }) {
  const [title, setTitle] = useState(value);

  useEffect(() => {
    setTitle(value);
  }, [value]);

  return (
    <input
      className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-lg font-semibold text-gray-800 focus:border-brand-primary dark:text-brand-text"
      value={title}
      onChange={(event) => setTitle(event.target.value)}
      onBlur={() => {
        if (title.trim() && title !== value) onSave(title.trim());
      }}
    />
  );
}

function TrackCommentBox({ onSubmit, placeholder = "Adicionar comentário" }) {
  const [content, setContent] = useState("");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        className="input flex-1"
        placeholder={placeholder}
        value={content}
        onChange={(event) => setContent(event.target.value)}
      />
      <button
        className="btn-primary"
        onClick={() => {
          if (!content.trim()) return;
          onSubmit(content.trim());
          setContent("");
        }}
      >
        <Send size={16} />
        Enviar
      </button>
    </div>
  );
}

function PostReference({ post }) {
  if (!post.project && !post.track && !post.playlist) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-500 dark:text-brand-textMuted">
      {post.project && (
        <Link to={`/projects/${post.project.id}`} className="rounded-full bg-gray-100 px-2 py-1 dark:bg-brand-darkOutline">
          <Layers size={12} className="mr-1 inline" />
          {post.project.name}
        </Link>
      )}
      {post.track && (
        post.track.projectId ? (
          <Link
            to={`/projects/${post.track.projectId}`}
            className="rounded-full bg-gray-100 px-2 py-1 dark:bg-brand-darkOutline"
          >
            <Music size={12} className="mr-1 inline" />
            {post.track.title}
          </Link>
        ) : (
          <span className="rounded-full bg-gray-100 px-2 py-1 dark:bg-brand-darkOutline">
            <Music size={12} className="mr-1 inline" />
            {post.track.title}
          </span>
        )
      )}
      {post.playlist && (
        <span className="rounded-full bg-gray-100 px-2 py-1 dark:bg-brand-darkOutline">
          <Sparkles size={12} className="mr-1 inline" />
          {post.playlist.name}
        </span>
      )}
    </div>
  );
}

function CreatePostModal({ onClose, onSubmit }) {
  const [content, setContent] = useState("");
  const [projectId, setProjectId] = useState("");
  const [trackId, setTrackId] = useState("");
  const [playlistId, setPlaylistId] = useState("");
  const [projects, setProjects] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const token = getAccessToken();

  useEffect(() => {
    async function loadProjects() {
      if (!token) return;
      const data = await apiRequest("/projects", { token });
      setProjects(data);
    }
    loadProjects();
  }, [token]);

  useEffect(() => {
    async function loadPlaylists() {
      if (!token) return;
      const data = await apiRequest("/feed/playlists", { token });
      setPlaylists(data);
    }
    loadPlaylists();
  }, [token]);

  useEffect(() => {
    async function loadTracks() {
      if (!token || !projectId) {
        setTracks([]);
        setTrackId("");
        return;
      }
      const project = await apiRequest(`/projects/${projectId}`, { token });
      setTracks(project.tracks || []);
    }
    loadTracks();
  }, [projectId, token]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl dark:bg-brand-darkSecondary">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-brand-text">Criar post</h3>
          <button className="text-sm text-gray-400" onClick={onClose}>
            Fechar
          </button>
        </div>
        <textarea
          className="input mt-4 min-h-[120px]"
          placeholder="Compartilhe o que está criando..."
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <select className="input" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <option value="">Referenciar projeto (opcional)</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <select className="input" value={trackId} onChange={(event) => setTrackId(event.target.value)}>
            <option value="">Referenciar track (opcional)</option>
            {tracks.map((track) => (
              <option key={track.id} value={track.id}>
                {track.title}
              </option>
            ))}
          </select>
          <select className="input" value={playlistId} onChange={(event) => setPlaylistId(event.target.value)}>
            <option value="">Referenciar playlist (opcional)</option>
            {playlists.map((playlist) => (
              <option key={playlist.id} value={playlist.id}>
                {playlist.name}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4 rounded-lg border border-dashed border-brand-primary/30 bg-brand-primary/5 p-3 text-xs text-gray-500 dark:border-brand-text/30 dark:bg-brand-darkOutline/60 dark:text-brand-textMuted">
          Preview: {content || "Seu post vai aparecer aqui."}
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn-primary"
            onClick={() =>
              onSubmit({
                content,
                projectId: projectId || null,
                trackId: trackId || null,
                playlistId: playlistId || null,
              })
            }
            disabled={!content.trim()}
          >
            Publicar
          </button>
        </div>
      </div>
    </div>
  );
}

export default Feed;
