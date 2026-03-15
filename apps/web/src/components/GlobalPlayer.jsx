import { ChevronUp, Pause, Play, SkipBack, SkipForward, Volume2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";

function formatTime(value) {
  if (!value || Number.isNaN(value)) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function GlobalPlayer() {
  const {
    current,
    isPlaying,
    progress,
    duration,
    volume,
    setVolume,
    togglePlay,
    seek,
    drawerOpen,
    setDrawerOpen,
  } = usePlayer() || {};

  if (!current) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-100 bg-white/95 shadow-lg backdrop-blur dark:border-brand-darkOutline dark:bg-brand-dark/95">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-xl bg-gray-100 dark:bg-brand-darkOutline">
              {current.coverUrl ? (
                <img src={current.coverUrl} alt={current.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">Audio</div>
              )}
            </div>
            <div>
              <button
                className="text-left text-sm font-semibold text-gray-800 hover:text-brand-primary dark:text-brand-text"
                onClick={() => setDrawerOpen(true)}
              >
                {current.title}
              </button>
              <button
                className="block text-left text-xs text-gray-500 hover:text-brand-primary dark:text-brand-textMuted"
                onClick={() => setDrawerOpen(true)}
              >
                {current.projectName || current.creatorName || "Projeto"}
              </button>
            </div>
          </div>

          <div className="flex flex-1 flex-col items-center gap-2">
            <div className="flex items-center gap-3">
              <button className="btn-secondary" type="button" disabled>
                <SkipBack size={16} />
              </button>
              <button className="btn-primary" type="button" onClick={togglePlay}>
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                {isPlaying ? "Pausar" : "Tocar"}
              </button>
              <button className="btn-secondary" type="button" disabled>
                <SkipForward size={16} />
              </button>
            </div>
            <div className="flex w-full items-center gap-2 text-xs text-gray-500">
              <span>{formatTime(progress)}</span>
              <input
                type="range"
                min={0}
                max={duration || 0}
                value={progress}
                onChange={(event) => seek(Number(event.target.value))}
                className="w-full accent-brand-primary"
              />
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Volume2 size={16} />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(event) => setVolume(Number(event.target.value))}
                className="w-24 accent-brand-primary"
              />
            </div>
            <button className="btn-secondary" type="button" onClick={() => setDrawerOpen(true)}>
              <ChevronUp size={16} />
              Detalhes
            </button>
          </div>
        </div>
      </div>

      {drawerOpen && <NowPlayingDrawer onClose={() => setDrawerOpen(false)} />}
    </>
  );
}

function NowPlayingDrawer({ onClose }) {
  const { current } = usePlayer();
  if (!current) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 p-4">
      <div className="h-full w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-brand-darkSecondary">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-brand-primary">Now Playing</p>
          <button className="btn-secondary" onClick={onClose} type="button">
            <X size={16} />
            Fechar
          </button>
        </div>
        <div className="mt-4 space-y-4">
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 dark:border-brand-darkOutline dark:bg-brand-darkOutline">
            {current.coverUrl ? (
              <img src={current.coverUrl} alt={current.title} className="h-56 w-full object-cover" />
            ) : (
              <div className="flex h-56 items-center justify-center text-gray-400">Sem capa</div>
            )}
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-800 dark:text-brand-text">{current.projectName}</p>
            <p className="text-sm text-gray-500 dark:text-brand-textMuted">{current.creatorName}</p>
            {current.description && (
              <p className="mt-2 text-sm text-gray-600 dark:text-brand-textMuted">{current.description}</p>
            )}
          </div>
          {current.tags?.length ? (
            <div className="flex flex-wrap gap-2">
              {current.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-brand-accent/20 px-2 py-1 text-xs text-brand-primary">
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
          {current.partners?.length ? (
            <div>
              <p className="text-xs font-semibold text-gray-500">Parceiros</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                {current.partners.map((partner) => (
                  <span key={partner.id}>@{partner.username || partner.name}</span>
                ))}
              </div>
            </div>
          ) : null}
          {current.projectId && (
            <Link to={`/projects/${current.projectId}`} className="btn-primary" onClick={onClose}>
              Abrir projeto completo
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default GlobalPlayer;
