import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Heart,
  MessageCircle,
  Play,
  Pause,
  Bookmark,
  Users,
  UserPlus,
  Check,
  Music,
  Layers,
  Camera,
} from "lucide-react";
import { API_URL, apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { usePlayer } from "../context/PlayerContext";
import Skeleton from "../components/Skeleton";

const TABS = [
  { id: "productions", label: "Produções" },
  { id: "projects", label: "Projetos" },
  { id: "posts", label: "Posts" },
  { id: "playlists", label: "Playlists" },
];

function Profile() {
  const { id: identifier } = useParams();
  const { user } = useAuth() || {};
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("productions");
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(true);
  const [error, setError] = useState("");
  const [productions, setProductions] = useState([]);
  const [publicProjects, setPublicProjects] = useState([]);
  const [posts, setPosts] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [editingBio, setEditingBio] = useState(false);
  const [bioValue, setBioValue] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileRef = useRef(null);
  const player = usePlayer();
  const currentTrack = player?.current;
  const isPlaying = player?.isPlaying;
  const progress = player?.progress || 0;
  const duration = player?.duration || 0;

  const isOwner = user?.id === profile?.id;

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        setError("");
        const data = await apiRequest(`/profiles/${identifier}`);
        setProfile(data);
        setBioValue(data.bio || "");
        setNameValue(data.name || "");
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (user) loadProfile();
  }, [identifier, user]);

  useEffect(() => {
    async function loadTab() {
      if (!user) return;
      try {
        setTabLoading(true);
        if (tab === "posts") {
          const data = await apiRequest(`/profiles/${identifier}/posts`);
          setPosts(data);
        } else if (tab === "projects") {
          const data = await apiRequest(`/profiles/${identifier}/projects`);
          setPublicProjects(data);
        } else if (tab === "playlists") {
          const data = await apiRequest(`/profiles/${identifier}/playlists`);
          setPlaylists(data);
        } else {
          const data = await apiRequest(`/profiles/${identifier}/productions`);
          setProductions(data);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setTabLoading(false);
      }
    }

    loadTab();
  }, [tab, identifier, user]);

  async function handlePlay(track) {
    if (!track) return;
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

  function handlePlayProject(project) {
    if (!project?.files?.length) return;
    const audio = project.files[0];
    if (player?.current?.id === project.id) {
      player.togglePlay();
      return;
    }
    player?.playTrack({
      id: project.id,
      title: project.name,
      audioUrl: audio.url,
      coverUrl: project.coverUrl,
      projectId: project.id,
      projectName: project.name,
      creatorName: project.owner?.name,
      description: project.description,
      tags: project.tags || [],
      partners: (project.members || []).map((member) => member.user).filter(Boolean),
    });
  }

  function handlePlayProject(project) {
    if (!project?.files?.length) return;
    const audio = project.files[0];
    if (player?.current?.id === project.id) {
      player.togglePlay();
      return;
    }
    player?.playTrack({
      id: project.id,
      title: project.name,
      audioUrl: audio.url,
      coverUrl: project.coverUrl,
      projectId: project.id,
      projectName: project.name,
      creatorName: project.owner?.name,
      description: project.description,
      tags: project.tags || [],
      partners: (project.members || []).map((member) => member.user).filter(Boolean),
    });
  }

  async function handleSavePlaylist(playlist) {
    if (!playlist) return;
    if (playlist.saved) {
      await apiRequest(`/feed/playlists/${playlist.id}/save`, { method: "DELETE" });
      setPlaylists((prev) => prev.map((item) => (item.id === playlist.id ? { ...item, saved: false } : item)));
    } else {
      await apiRequest(`/feed/playlists/${playlist.id}/save`, { method: "POST" });
      setPlaylists((prev) => prev.map((item) => (item.id === playlist.id ? { ...item, saved: true } : item)));
    }
  }

  async function handleFollow() {
    if (!profile) return;
    if (profile.isFollowing) {
      await apiRequest(`/follows/${profile.id}`, { method: "DELETE" });
      setProfile({ ...profile, isFollowing: false, followers: profile.followers - 1 });
    } else {
      await apiRequest(`/follows/${profile.id}`, { method: "POST" });
      setProfile({ ...profile, isFollowing: true, followers: profile.followers + 1 });
    }
  }

  async function handleSaveBio() {
    const updated = await apiRequest("/users/me", { method: "PUT", body: { bio: bioValue } });
    setProfile({ ...profile, bio: updated.bio });
    setEditingBio(false);
  }

  async function handleSaveName() {
    const updated = await apiRequest("/users/me", { method: "PUT", body: { name: nameValue } });
    setProfile({ ...profile, name: updated.name });
    setEditingName(false);
  }

  async function handleAvatarUpload(file) {
    if (!file) return;
    setAvatarError("");
    setAvatarLoading(true);
    if (!/image\/(png|jpeg)/.test(file.type)) {
      setAvatarError("Envie uma imagem JPG ou PNG.");
      setAvatarLoading(false);
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("O arquivo deve ter no máximo 2MB.");
      setAvatarLoading(false);
      return;
    }
    const formData = new FormData();
    formData.append("avatar", file);
    const response = await fetch(`${API_URL}/users/avatar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({ message: "Erro ao enviar avatar" }));
      setAvatarError(data.message);
      setAvatarLoading(false);
      return;
    }
    const updated = await response.json();
    setProfile({ ...profile, avatarUrl: updated.avatarUrl });
    setAvatarLoading(false);
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <div className="card">Faça login para visualizar perfis públicos.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <Skeleton lines={8} />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <div className="card border border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200">
          {error || "Perfil não encontrado."}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <div className="card flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar user={profile} size="lg" />
            {isOwner && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(event) => handleAvatarUpload(event.target.files[0])}
                />
                <button
                  className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full border border-brand-primary/30 bg-white text-brand-primary shadow-sm dark:border-brand-text/30 dark:bg-brand-dark"
                  onClick={() => fileRef.current?.click()}
                  title="Alterar avatar"
                  type="button"
                  disabled={avatarLoading}
                >
                  <Camera size={16} />
                </button>
              </>
            )}
          </div>
          <div>
            {editingName ? (
              <div className="flex flex-col gap-2">
                <input
                  className="input"
                  value={nameValue}
                  onChange={(event) => setNameValue(event.target.value)}
                />
                <div className="flex gap-2">
                  <button className="btn-secondary" onClick={() => setEditingName(false)}>
                    Cancelar
                  </button>
                  <button className="btn-primary" onClick={handleSaveName}>
                    Salvar nome
                  </button>
                </div>
              </div>
            ) : (
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-brand-text">{profile.name}</h2>
            )}
            <p className="text-sm text-gray-400 dark:text-brand-textMuted">@{profile.username}</p>
            {avatarError && <p className="mt-2 text-xs text-rose-500">{avatarError}</p>}
            {isOwner && editingBio ? (
              <div className="mt-2 flex flex-col gap-2">
                <textarea
                  className="input"
                  value={bioValue}
                  onChange={(event) => setBioValue(event.target.value)}
                />
                <div className="flex gap-2">
                  <button className="btn-secondary" onClick={() => setEditingBio(false)}>
                    Cancelar
                  </button>
                  <button className="btn-primary" onClick={handleSaveBio}>
                    Salvar bio
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-600 dark:text-brand-textMuted">
                {profile.bio || "Este criador ainda não adicionou uma bio."}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Stat icon={Users} label="Seguidores" value={profile.followers} />
          <Stat icon={Users} label="Seguindo" value={profile.following} />
          <Stat icon={Layers} label="Projetos públicos" value={profile.publicProjects} />
          {isOwner ? (
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary" onClick={() => setEditingName((value) => !value)}>
                Editar nome
              </button>
              <button className="btn-secondary" onClick={() => setEditingBio((value) => !value)}>
                Editar bio
              </button>
            </div>
          ) : (
            <button className="btn-primary" onClick={handleFollow}>
              {profile.isFollowing ? <Check size={16} /> : <UserPlus size={16} />}
              {profile.isFollowing ? "Seguindo" : "Seguir"}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {TABS.map((item) => (
          <button
            key={item.id}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              tab === item.id
                ? "border-brand-primary bg-brand-primary/10 text-brand-primary dark:border-brand-text dark:bg-brand-darkOutline dark:text-brand-text"
                : "border-transparent bg-gray-100 text-gray-600 hover:text-brand-primary dark:bg-brand-darkOutline dark:text-brand-textMuted"
            }`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tabLoading ? (
        <Skeleton lines={8} />
      ) : null}

      {!tabLoading && tab === "productions" && (
        <div className="space-y-4">
          {productions.length === 0 ? (
            <EmptyState message="Este usuário ainda não publicou produções." />
          ) : (
            productions.map((track) => (
              <div key={track.id} className="card space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 overflow-hidden rounded-xl bg-gray-100 dark:bg-brand-darkOutline">
                      {track.coverUrl ? (
                        <img src={track.coverUrl} alt={track.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-400 dark:text-brand-textMuted">
                          <Music size={18} />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-base font-semibold text-gray-800 dark:text-brand-text">{track.title}</p>
                      <p className="text-xs text-gray-500 dark:text-brand-textMuted">{track.project?.name}</p>
                    </div>
                  </div>
                  <TagList tags={track.project?.tags} />
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <button className="btn-secondary" onClick={() => handlePlay(track)}>
                    {currentTrack?.id === track.id && isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    {currentTrack?.id === track.id && isPlaying ? "Pausar" : "Tocar"}
                  </button>
                  <span className="text-xs text-gray-400 dark:text-brand-textMuted">
                    {track._count?.plays || 0} plays · {track._count?.likes || 0} curtidas · {track._count?.comments || 0} comentários
                  </span>
                </div>
                {currentTrack?.id === track.id && (
                  <div className="h-1 w-full rounded-full bg-gray-100 dark:bg-brand-darkOutline">
                    <div
                      className="h-1 rounded-full bg-brand-primary"
                      style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {!tabLoading && tab === "projects" && (
        <div className="space-y-4">
          {publicProjects.length === 0 ? (
            <EmptyState message="Este usuário ainda não publicou projetos." />
          ) : (
            publicProjects.map((project) => (
              <div key={project.id} className="card space-y-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-16 w-16 overflow-hidden rounded-2xl bg-gray-100 dark:bg-brand-darkOutline">
                      {project.coverUrl ? (
                        <img src={project.coverUrl} alt={project.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-400 dark:text-brand-textMuted">
                          <Layers size={18} />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-base font-semibold text-gray-800 dark:text-brand-text">{project.name}</p>
                      <p className="text-xs text-gray-500 dark:text-brand-textMuted">Projeto público</p>
                    </div>
                  </div>
                  <TagList tags={project.tags} />
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <button className="btn-secondary" onClick={() => handlePlayProject(project)}>
                    <Play size={16} />
                    Tocar
                  </button>
                  <span className="text-xs text-gray-400 dark:text-brand-textMuted">
                    {project.counts?.likes || 0} curtidas · {project.counts?.comments || 0} comentários
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {!tabLoading && tab === "posts" && (
        <div className="space-y-4">
          {posts.length === 0 ? (
            <EmptyState message="Este usuário ainda não publicou posts." />
          ) : (
            posts.map((post) => (
              <div key={post.id} className="card space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar user={post.author} />
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-brand-text">{post.author?.name}</p>
                    <p className="text-xs text-gray-400 dark:text-brand-textMuted">@{post.author?.username}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-brand-textMuted">{post.content}</p>
                <PostReference post={post} />
                <div className="text-xs text-gray-400 dark:text-brand-textMuted">
                  {post._count?.likes || 0} curtidas · {post._count?.comments || 0} comentários
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {!tabLoading && tab === "playlists" && (
        <div className="space-y-4">
          {playlists.length === 0 ? (
            <EmptyState message="Este usuário ainda não compartilhou playlists." />
          ) : (
            playlists.map((playlist) => (
              <div key={playlist.id} className="card space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-gray-800 dark:text-brand-text">{playlist.name}</p>
                    <p className="text-xs text-gray-400 dark:text-brand-textMuted">
                      {playlist._count?.tracks || 0} faixas
                    </p>
                  </div>
                  <TagList tags={playlist.tags} />
                </div>
                <div className="flex flex-wrap gap-3">
                  <button className="btn-secondary" onClick={() => handlePlay(playlist.tracks[0]?.track)}>
                    <Play size={16} />
                    Tocar amostra
                  </button>
                  <button className="btn-secondary" onClick={() => handleSavePlaylist(playlist)}>
                    <Bookmark size={16} />
                    {playlist.saved ? "Salvo" : "Salvar"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function Avatar({ user, size = "sm" }) {
  const classes = size === "lg" ? "h-20 w-20" : "h-10 w-10";
  if (user?.avatarUrl) {
    return <img src={user.avatarUrl} alt={user.name} className={`${classes} rounded-full object-cover`} />;
  }
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
    : "";
  return (
    <div className={`${classes} flex items-center justify-center rounded-full bg-brand-primary/20 text-sm font-semibold text-brand-primary`}>
      {initials}
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-brand-textMuted">
      <Icon size={14} />
      <span>{label}:</span>
      <span className="font-semibold text-gray-800 dark:text-brand-text">{value}</span>
    </div>
  );
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
        <span className="rounded-full bg-gray-100 px-2 py-1 dark:bg-brand-darkOutline">
          <Music size={12} className="mr-1 inline" />
          {post.track.title}
        </span>
      )}
    </div>
  );
}

function EmptyState({ message }) {
  return <div className="card text-sm text-gray-500 dark:text-brand-textMuted">{message}</div>;
}

export default Profile;