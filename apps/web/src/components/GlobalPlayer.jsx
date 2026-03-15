import { ChevronUp, Pause, Play, Volume2, X } from "lucide-react";
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
    stop,
    drawerOpen,
    setDrawerOpen,
  } = usePlayer() || {};

  if (!current) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-100 bg-white/95 shadow-lg backdrop-blur dark:border-brand-darkOutline dark:bg-brand-dark/95">
        {/* Progress bar */}
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 pt-2 text-xs text-gray-400 dark:text-brand-textMuted">
          <span className="w-8 text-right">{formatTime(progress)}</span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={progress}
            onChange={(event) => seek(Number(event.target.value))}
            className="flex-1 accent-brand-primary"
          />
          <span className="w-8">{formatTime(duration)}</span>
        </div>

        {/* Main controls row */}
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
          {/* Cover */}
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-brand-darkOutline">
            {current.coverUrl ? (
              <img src={current.coverUrl} alt={current.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400 dark:text-brand-textMuted">♪</div>
            )}
          </div>

          {/* Title + artist */}
          <button
            className="min-w-0 flex-1 text-left"
            onClick={() => setDrawerOpen(true)}
            type="button"
          >
            <p className="truncate text-sm font-semibold text-gray-800 dark:text-brand-text">{current.title}</p>
            <p className="truncate text-xs text-gray-500 dark:text-brand-textMuted">
              {current.projectName || current.creatorName || "Projeto"}
            </p>
          </button>

          {/* Play / Pause */}
          <button
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white shadow"
            type="button"
            onClick={togglePlay}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>

          {/* Volume — hidden on mobile */}
          <div className="hidden items-center gap-1 text-gray-400 dark:text-brand-textMuted md:flex">
            <Volume2 size={15} />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
              className="w-20 accent-brand-primary"
            />
          </div>

          {/* Details — hidden on mobile */}
          <button
            className="btn-secondary hidden md:flex"
            type="button"
            onClick={() => setDrawerOpen(true)}
          >
            <ChevronUp size={15} />
            Detalhes
          </button>

          {/* Close */}
          <button
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-brand-darkOutline"
            type="button"
            onClick={stop}
            aria-label="Fechar player"
          >
            <X size={16} />
          </button>
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
              <div className="flex h-56 items-center justify-center text-gray-400 dark:text-brand-textMuted">Sem capa</div>
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
              <p className="text-xs font-semibold text-gray-500 dark:text-brand-textMuted">Parceiros</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-brand-textMuted">
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
