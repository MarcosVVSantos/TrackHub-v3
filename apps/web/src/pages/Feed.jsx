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
  UserPlus,
  Check,
} from "lucide-react";
import { API_URL, apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { usePlayer } from "../context/PlayerContext";
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
  const [projectPosts, setProjectPosts] = useState([]);
  const [socialPosts, setSocialPosts] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const player = usePlayer();
  const [playlistPlaying, setPlaylistPlaying] = useState(null);
  const [playlistIndex, setPlaylistIndex] = useState(0);
  const [playlistProgress, setPlaylistProgress] = useState(0);
  const [playlistDuration, setPlaylistDuration] = useState(0);
  const [showPostModal, setShowPostModal] = useState(false);
  const [commentsByPost, setCommentsByPost] = useState({});
  const [commentMenuId, setCommentMenuId] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [removingCommentId, setRemovingCommentId] = useState(null);
  const playlistAudioRef = useRef(null);
  const currentTrack = player?.current;
  const isPlaying = player?.isPlaying;
  const progress = player?.progress || 0;
  const duration = player?.duration || 0;

  async function loadTab(tabId) {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError("");
      if (tabId === "social") {
        const data = await apiRequest("/feed/social");
        setSocialPosts(data);
      } else if (tabId === "playlists") {
        const data = await apiRequest("/feed/playlists");
        setPlaylists(data);
      } else {
        const [trackData, projectData] = await Promise.all([
          apiRequest("/feed/productions"),
          apiRequest("/feed/projects"),
        ]);
        setProductions(trackData);
        setProjectPosts(projectData);
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

  function handlePlaylistTimeUpdate() {
    const audio = playlistAudioRef.current;
    if (!audio) return;
    setPlaylistProgress(audio.currentTime);
    setPlaylistDuration(audio.duration || 0);
  }

  async function handlePlayTrack(track) {
    if (!user) return;
    if (playlistAudioRef.current) {
      playlistAudioRef.current.pause();
      setPlaylistPlaying(null);
    }
    await apiRequest(`/tracks/${track.id}/play`, { method: "POST" });
    if (player?.current?.id === track.id) {
      player.togglePlay();
      return;
    }
    player?.playTrack({
      id: track.id,
      title: track.title,
      audioUrl: track.audioUrl,
      coverUrl: track.coverUrl,
      projectId: track.project?.id,
      projectName: track.project?.name,
      creatorName: track.project?.owner?.name,
      description: track.project?.description,
      tags: track.project?.tags || [],
      partners: (track.project?.members || []).map((member) => member.user).filter(Boolean),
    });
  }

  async function handlePlayProject(project) {
    if (!user) return;
    if (playlistAudioRef.current) {
      playlistAudioRef.current.pause();
      setPlaylistPlaying(null);
    }
    const response = await fetch(`${API_URL}/projects/${project.id}/audio`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("trackhub_access")}` },
    });
    if (!response.ok) {
      setError("Não foi possível reproduzir o áudio do projeto");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    if (player?.current?.id === project.id) {
      player.togglePlay();
      return;
    }
    player?.playTrack({
      id: project.id,
      title: project.name,
      audioUrl: url,
      isObjectUrl: true,
      coverUrl: project.coverUrl,
      projectId: project.id,
      projectName: project.name,
      creatorName: project.owner?.name,
      description: project.description,
      tags: project.tags || [],
      partners: (project.members || []).map((member) => member.user).filter(Boolean),
    });
  }

  function handlePauseTrack() {
    player?.togglePlay();
  }

  async function handleLikeTrack(trackId) {
    if (!user) return;
    setProductions((prev) =>
      prev.map((track) =>
        track.id === trackId
          ? {
              ...track,
              liked: !track.liked,
              _count: {
                ...track._count,
                likes: (track._count?.likes || 0) + (track.liked ? -1 : 1),
              },
            }
          : track
      )
    );
    await apiRequest(`/tracks/${trackId}/like`, { method: "POST" });
  }

  async function handleSaveTrack(track) {
    if (!user) return;
    if (track.saved) {
      await apiRequest(`/tracks/${track.id}/save`, { method: "DELETE" });
    } else {
      await apiRequest(`/tracks/${track.id}/save`, { method: "POST" });
    }
    loadTab("productions");
  }

  async function handleCommentTrack(trackId, content) {
    if (!user) return;
    await apiRequest(`/tracks/${trackId}/comment`, { method: "POST", body: { content } });
    loadTab("productions");
  }

  async function handleLikeProjectPost(postId) {
    if (!user) return;
    setProjectPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              liked: !post.liked,
              _count: {
                ...post._count,
                likes: (post._count?.likes || 0) + (post.liked ? -1 : 1),
              },
            }
          : post
      )
    );
    await apiRequest(`/feed/social/${postId}/like`, { method: "POST" });
  }

  async function handleSaveProjectPost(postId, saved) {
    if (!user) return;
    if (saved) {
      await apiRequest(`/feed/social/${postId}/save`, { method: "DELETE" });
    } else {
      await apiRequest(`/feed/social/${postId}/save`, { method: "POST" });
    }
    loadTab("productions");
  }

  async function handleCommentProjectPost(postId, content) {
    if (!user) return;
    await apiRequest(`/feed/social/${postId}/comment`, { method: "POST", body: { content } });
    loadTab("productions");
  }

  async function handleUpdateTrackTitle(trackId, title) {
    if (!user) return;
    await apiRequest(`/tracks/${trackId}`, { method: "PATCH", body: { title } });
    loadTab("productions");
  }

  async function handleCreatePost(payload) {
    if (!user) return;
    await apiRequest("/feed/social", { method: "POST", body: payload });
    setShowPostModal(false);
    loadTab("social");
  }

  async function handleLikePost(postId) {
    if (!user) return;
    setSocialPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              liked: !post.liked,
              _count: {
                ...post._count,
                likes: (post._count?.likes || 0) + (post.liked ? -1 : 1),
              },
            }
          : post
      )
    );
    await apiRequest(`/feed/social/${postId}/like`, { method: "POST" });
  }

  async function handleSavePost(post) {
    if (!user) return;
    if (post.saved) {
      await apiRequest(`/feed/social/${post.id}/save`, { method: "DELETE" });
    } else {
      await apiRequest(`/feed/social/${post.id}/save`, { method: "POST" });
    }
    loadTab("social");
  }

  async function handleCommentPost(postId, content) {
    if (!user) return;
    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      content,
      createdAt: new Date().toISOString(),
      user: {
        id: user?.id,
        name: user?.name,
        username: user?.username,
        avatarUrl: user?.avatarUrl,
      },
    };
    setCommentsByPost((prev) => {
      const current = prev[postId] || { items: [] };
      return {
        ...prev,
        [postId]: {
          ...current,
          items: [...(current.items || []), optimistic],
        },
      };
    });
    setSocialPosts((prev) =>
      prev.map((item) =>
        item.id === postId
          ? { ...item, _count: { ...item._count, comments: (item._count?.comments || 0) + 1 } }
          : item
      )
    );
    try {
      const created = await apiRequest(`/feed/social/${postId}/comment`, {
        method: "POST",
        body: { content },
      });
      setCommentsByPost((prev) => {
        const current = prev[postId] || { items: [] };
        return {
          ...prev,
          [postId]: {
            ...current,
            items: (current.items || []).map((item) => (item.id === tempId ? created : item)),
          },
        };
      });
    } catch (err) {
      setCommentsByPost((prev) => {
        const current = prev[postId] || { items: [] };
        return {
          ...prev,
          [postId]: {
            ...current,
            error: err.message,
            items: (current.items || []).filter((item) => item.id !== tempId),
          },
        };
      });
      setSocialPosts((prev) =>
        prev.map((item) =>
          item.id === postId
            ? { ...item, _count: { ...item._count, comments: Math.max((item._count?.comments || 1) - 1, 0) } }
            : item
        )
      );
    }
  }

  function startEditComment(postId, comment) {
    setEditingComment({ postId, id: comment.id });
    setCommentDraft(comment.content);
    setCommentMenuId(null);
  }

  function cancelEditComment() {
    setEditingComment(null);
    setCommentDraft("");
  }

  async function handleUpdateComment(postId, commentId) {
    if (!user) return;
    const trimmed = commentDraft.trim();
    if (!trimmed) return;
    await apiRequest(`/comments/${commentId}`, {
      method: "PATCH",
      body: { content: trimmed },
    });
    setCommentsByPost((prev) => {
      const current = prev[postId] || { items: [] };
      return {
        ...prev,
        [postId]: {
          ...current,
          items: (current.items || []).map((item) =>
            item.id === commentId ? { ...item, content: trimmed } : item
          ),
        },
      };
    });
    cancelEditComment();
  }

  async function handleDeleteComment(postId, commentId) {
    if (!user) return;
    setRemovingCommentId(commentId);
    await apiRequest(`/comments/${commentId}`, { method: "DELETE" });
    setTimeout(() => {
      setCommentsByPost((prev) => {
        const current = prev[postId] || { items: [] };
        return {
          ...prev,
          [postId]: {
            ...current,
            items: (current.items || []).filter((item) => item.id !== commentId),
          },
        };
      });
      setSocialPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                _count: {
                  ...post._count,
                  comments: Math.max((post._count?.comments || 1) - 1, 0),
                },
              }
            : post
        )
      );
      setRemovingCommentId(null);
      setConfirmDeleteId(null);
    }, 200);
  }

  async function toggleComments(postId) {
    setCommentsByPost((prev) => {
      const current = prev[postId] || { open: false, items: [] };
      return {
        ...prev,
        [postId]: {
          ...current,
          open: !current.open,
        },
      };
    });

    const current = commentsByPost[postId];
    if (current?.items?.length || current?.loading) return;
    setCommentsByPost((prev) => ({
      ...prev,
      [postId]: { ...prev[postId], loading: true, error: "" },
    }));
    try {
      const data = await apiRequest(`/feed/social/${postId}/comments`);
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: { ...prev[postId], loading: false, items: data.items || [] },
      }));
    } catch (err) {
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: { ...prev[postId], loading: false, error: err.message },
      }));
    }
  }

  async function handlePlayPlaylist(playlist) {
    if (!user) return;
    const audio = playlistAudioRef.current;
    if (!audio || playlist.tracks.length === 0) return;
    player?.stop();
    setPlaylistPlaying(playlist);
    setPlaylistIndex(0);
    audio.src = playlist.tracks[0].track.audioUrl;
    audio.play();
  }

  function handlePlaylistEnded() {
    const audio = playlistAudioRef.current;
    if (!audio || !playlistPlaying) return;
    const nextIndex = playlistIndex + 1;
    if (nextIndex >= playlistPlaying.tracks.length) {
      setPlaylistPlaying(null);
      return;
    }
    setPlaylistIndex(nextIndex);
    audio.src = playlistPlaying.tracks[nextIndex].track.audioUrl;
    audio.play();
  }

  async function handleSavePlaylist(playlist) {
    if (!user) return;
    if (playlist.saved) {
      await apiRequest(`/feed/playlists/${playlist.id}/save`, { method: "DELETE" });
    } else {
      await apiRequest(`/feed/playlists/${playlist.id}/save`, { method: "POST" });
    }
    loadTab("playlists");
  }

  async function handleToggleFollow(ownerId, isFollowing) {
    if (!user || !ownerId) return;
    if (isFollowing) {
      await apiRequest(`/follows/${ownerId}`, { method: "DELETE" });
    } else {
      await apiRequest(`/follows/${ownerId}`, { method: "POST" });
    }
    setProductions((prev) =>
      prev.map((item) =>
        item.project?.ownerId === ownerId ? { ...item, isFollowing: !isFollowing } : item
      )
    );
  }

  if (!user) {
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
        <div className="flex flex-wrap gap-2">
          <Link className="btn-secondary" to="/explore">
            Explorar artistas
          </Link>
          {activeTab === "social" && (
            <button className="btn-primary w-fit" onClick={() => setShowPostModal(true)}>
              <Plus size={16} />
              Criar post
            </button>
          )}
        </div>
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
          {currentTrack && (
            <div className="card sticky top-24 z-10 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-brand-text">Tocando agora</p>
                  <p className="text-sm text-gray-500 dark:text-brand-textMuted">{currentTrack.title}</p>
                </div>
                <button className="btn-secondary" onClick={handlePauseTrack}>
                  <Pause size={16} />
                  Pausar
                </button>
              </div>
              <div className="h-1 w-full rounded-full bg-gray-100 dark:bg-brand-darkOutline">
                <div
                  className="h-1 rounded-full bg-brand-primary"
                  style={{ width: `${playlistDuration ? (playlistProgress / playlistDuration) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {productions.length === 0 && projectPosts.length === 0 ? (
            <EmptyState
              title="Seu feed está vazio"
              description="Siga artistas para ver as produções mais recentes por aqui."
              cta={{ label: "Explorar artistas", href: "/explore" }}
            />
          ) : (
            <>
              {projectPosts.map((post) => (
                <div key={post.id} className="card space-y-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="flex gap-4">
                      <div className="h-20 w-20 overflow-hidden rounded-2xl bg-gray-100 dark:bg-brand-darkOutline">
                        {post.project?.coverUrl ? (
                          <img
                            src={post.project.coverUrl}
                            alt={post.project?.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-gray-400">
                            <Layers size={20} />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-gray-800 dark:text-brand-text">
                          {post.project?.name}
                        </p>
                        <Link
                          to={`/profile/${post.project?.owner?.username || post.project?.owner?.id}`}
                          className="text-xs font-semibold text-brand-primary"
                        >
                          {post.project?.owner?.name || "Autor"}
                        </Link>
                        <p className="text-sm text-gray-500 dark:text-brand-textMuted">
                          Projeto público
                        </p>
                      </div>
                    </div>
                    <TagList tags={post.project?.tags} />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button className="btn-secondary" onClick={() => handlePlayProject(post.project)}>
                      {currentTrack?.id === post.project?.id && isPlaying ? <Pause size={16} /> : <Play size={16} />}
                        {currentTrack?.id === post.project?.id && isPlaying ? "Pausar" : "Play"}
                    </button>
                    <button className="btn-secondary" onClick={() => handleLikeProjectPost(post.id)}>
                      <Heart size={16} className={post.liked ? "fill-rose-500 text-rose-500" : ""} />
                      Curtir ({post._count?.likes || 0})
                    </button>
                    <button className="btn-secondary" onClick={() => handleSaveProjectPost(post.id, post.saved)}>
                      <Bookmark size={16} />
                      {post.saved ? "Salvo" : "Salvar"}
                    </button>
                    {user?.id !== post.project?.ownerId && (
                      <button
                        className="btn-secondary"
                        onClick={() => handleToggleFollow(post.project?.ownerId, post.isFollowing)}
                      >
                        {post.isFollowing ? <Check size={16} /> : <UserPlus size={16} />}
                        {post.isFollowing ? "Seguindo" : "Seguir"}
                      </button>
                    )}
                  </div>

                  <TrackCommentBox onSubmit={(content) => handleCommentProjectPost(post.id, content)} />
                </div>
              ))}

              {productions.map((track) => (
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
                        <Link
                          to={`/profile/${track.project?.owner?.username || track.project?.owner?.id}`}
                          className="text-xs font-semibold text-brand-primary"
                        >
                          {track.project?.owner?.name || "Autor"}
                        </Link>
                        <p className="text-sm text-gray-500 dark:text-brand-textMuted">
                          {track.project?.name}
                        </p>
                      </div>
                    </div>
                    <TagList tags={track.project?.tags} />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button className="btn-secondary" onClick={() => handlePlayTrack(track)}>
                      {currentTrack?.id === track.id && isPlaying ? <Pause size={16} /> : <Play size={16} />}
                        {currentTrack?.id === track.id && isPlaying ? "Pausar" : "Tocar"}
                    </button>
                    <button className="btn-secondary" onClick={() => handleLikeTrack(track.id)}>
                      <Heart size={16} className={track.liked ? "fill-rose-500 text-rose-500" : ""} />
                      Curtir ({track._count?.likes || 0})
                    </button>
                    <button className="btn-secondary" onClick={() => handleSaveTrack(track)}>
                      <Bookmark size={16} />
                      {track.saved ? "Salvo" : "Salvar"}
                    </button>
                    {user?.id !== track.project?.ownerId && (
                      <button
                        className="btn-secondary"
                        onClick={() => handleToggleFollow(track.project?.ownerId, track.isFollowing)}
                      >
                        {track.isFollowing ? <Check size={16} /> : <UserPlus size={16} />}
                        {track.isFollowing ? "Seguindo" : "Seguir"}
                      </button>
                    )}
                    <span className="text-xs text-gray-400 dark:text-brand-textMuted">
                      {track._count?.plays || 0} plays
                    </span>
                  </div>

                  <TrackCommentBox onSubmit={(content) => handleCommentTrack(track.id, content)} />
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {!loading && activeTab === "social" && (
        <div className="space-y-4">
          {socialPosts.length === 0 ? (
            <EmptyState
              title="Nenhuma interação ainda"
              description="Crie um post ou siga artistas para ver os bastidores criativos."
              cta={{ label: "Explorar artistas", href: "/explore" }}
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
                    <Heart size={16} className={post.liked ? "fill-rose-500 text-rose-500" : ""} />
                    Curtir ({post._count?.likes || 0})
                  </button>
                  <button className="btn-secondary" onClick={() => toggleComments(post.id)}>
                    <MessageCircle size={16} />
                    Comentários ({post._count?.comments || 0})
                  </button>
                  <button className="btn-secondary" onClick={() => handleSavePost(post)}>
                    <Bookmark size={16} />
                    {post.saved ? "Salvo" : "Salvar"}
                  </button>
                </div>
                {commentsByPost[post.id]?.open && (
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-brand-darkOutline dark:bg-brand-darkOutline/60">
                    {commentsByPost[post.id]?.loading && (
                      <div className="text-xs text-gray-400 dark:text-brand-textMuted">Carregando comentários...</div>
                    )}
                    {commentsByPost[post.id]?.error && (
                      <div className="text-xs text-rose-500">{commentsByPost[post.id].error}</div>
                    )}
                    {!commentsByPost[post.id]?.loading &&
                      (!commentsByPost[post.id]?.items || commentsByPost[post.id].items.length === 0) && (
                        <p className="text-xs text-gray-500 dark:text-brand-textMuted">
                          Nenhum comentário ainda. Seja o primeiro.
                        </p>
                      )}
                    <div className="mt-3 space-y-3">
                      {(commentsByPost[post.id]?.items || []).map((comment) => {
                        const isAuthor = comment.user?.id === user?.id;
                        const isEditing = editingComment?.id === comment.id;
                        return (
                          <div
                            key={comment.id}
                            className={`group flex gap-3 rounded-lg p-2 transition ${
                              removingCommentId === comment.id ? "opacity-50" : "opacity-100"
                            }`}
                          >
                            <Avatar user={comment.user} />
                            <div className="flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-xs font-semibold text-gray-700 dark:text-brand-text">
                                    @{comment.user?.username}
                                  </p>
                                  {isEditing ? (
                                    <div className="mt-1 space-y-2">
                                      <input
                                        className="input"
                                        value={commentDraft}
                                        onChange={(event) => setCommentDraft(event.target.value)}
                                      />
                                      <div className="flex gap-2">
                                        <button
                                          className="btn-secondary"
                                          type="button"
                                          onClick={cancelEditComment}
                                        >
                                          Cancelar
                                        </button>
                                        <button
                                          className="btn-primary"
                                          type="button"
                                          onClick={() => handleUpdateComment(post.id, comment.id)}
                                        >
                                          Salvar
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-600 dark:text-brand-textMuted">
                                      {comment.content}
                                    </p>
                                  )}
                                </div>
                                {isAuthor && !isEditing && (
                                  <div className="relative">
                                    <button
                                      className="rounded-full p-1 text-gray-400 opacity-0 transition hover:bg-gray-100 group-hover:opacity-100"
                                      onClick={() =>
                                        setCommentMenuId((prev) => (prev === comment.id ? null : comment.id))
                                      }
                                    >
                                      <span className="text-lg">⋯</span>
                                    </button>
                                    {commentMenuId === comment.id && (
                                      <div className="absolute right-0 mt-1 w-28 rounded-lg border border-gray-100 bg-white p-1 shadow-md dark:border-brand-darkOutline dark:bg-brand-darkSecondary">
                                        <button
                                          className="w-full rounded-md px-2 py-1 text-left text-xs hover:bg-gray-50 dark:hover:bg-brand-darkOutline"
                                          onClick={() => startEditComment(post.id, comment)}
                                        >
                                          Editar
                                        </button>
                                        <button
                                          className="w-full rounded-md px-2 py-1 text-left text-xs text-rose-500 hover:bg-rose-50"
                                          onClick={() => setConfirmDeleteId(comment.id)}
                                        >
                                          Excluir
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              {!isEditing && (
                                <p className="mt-1 text-xs text-gray-400 dark:text-brand-textMuted">
                                  {formatRelativeTime(comment.createdAt)}
                                </p>
                              )}
                              {confirmDeleteId === comment.id && (
                                <div className="mt-2 flex items-center gap-2 text-xs">
                                  <span className="text-gray-500">Excluir comentário?</span>
                                  <button
                                    className="btn-secondary"
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    className="btn-primary"
                                    type="button"
                                    onClick={() => handleDeleteComment(post.id, comment.id)}
                                  >
                                    Excluir
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4">
                      <CommentComposer
                        onSubmit={(content) => handleCommentPost(post.id, content)}
                        placeholder="Escreva um comentário..."
                      />
                    </div>
                  </div>
                )}
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
                  style={{ width: `${playlistDuration ? (playlistProgress / playlistDuration) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
          {playlists.length === 0 ? (
            <EmptyState
              title="Sem playlists por aqui"
              description="Siga artistas para descobrir as playlists públicas deles."
              cta={{ label: "Explorar artistas", href: "/explore" }}
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

function CommentComposer({ onSubmit, placeholder }) {
  const [value, setValue] = useState("");

  function submit() {
    if (!value.trim()) return;
    onSubmit(value.trim());
    setValue("");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        className="input flex-1"
        placeholder={placeholder}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            submit();
          }
        }}
      />
      <button className="btn-primary" type="button" onClick={submit}>
        Publicar
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
  const { user } = useAuth() || {};
  const [content, setContent] = useState("");
  const [projectId, setProjectId] = useState("");
  const [trackId, setTrackId] = useState("");
  const [playlistId, setPlaylistId] = useState("");
  const [projects, setProjects] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [playlists, setPlaylists] = useState([]);

  useEffect(() => {
    async function loadProjects() {
      if (!user) return;
      const data = await apiRequest("/projects");
      setProjects(data);
    }
    loadProjects();
  }, [user]);

  useEffect(() => {
    async function loadPlaylists() {
      if (!user) return;
      const data = await apiRequest("/feed/playlists");
      setPlaylists(data);
    }
    loadPlaylists();
  }, [user]);

  useEffect(() => {
    async function loadTracks() {
      if (!user || !projectId) {
        setTracks([]);
        setTrackId("");
        return;
      }
      const project = await apiRequest(`/projects/${projectId}`);
      setTracks(project.tracks || []);
    }
    loadTracks();
  }, [projectId, user]);

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
