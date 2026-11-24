import { Link } from "react-router-dom";
import { Music2, Pause, Play, SkipBack, SkipForward, Volume2, X } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { formatTime } from "../lib/format";

// Player fixo no rodapé, como no redesign: capa, faixa, controles e barra de progresso.
function GlobalPlayer() {
  const player = usePlayer();
  const { current, isPlaying, progress, duration, volume, setVolume, togglePlay, seek, stop, queue = [], next, previous } =
    player || {};

  if (!current) return null;
  const inQueue = queue.length > 1;

  return (
    <div
      role="region"
      aria-label="Player"
      className="fixed inset-x-0 bottom-[64px] z-40 border-t border-th-line bg-th-sidebar lg:bottom-0 lg:left-[260px]"
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 sm:px-6 lg:px-10">
        <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
          <span className="flex h-11 w-11 flex-none items-center justify-center overflow-hidden rounded-lg bg-white text-th-bg">
            {current.coverUrl ? (
              <img src={current.coverUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Music2 size={20} aria-hidden="true" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-th-text">{current.title}</span>
            <span className="block truncate text-xs text-th-muted">{current.subtitle || current.projectName || ""}</span>
          </span>
        </div>

        <div className="flex flex-[2] basis-80 items-center gap-3">
          {inQueue && (
            <button type="button" onClick={previous} aria-label="Faixa anterior" className="btn-ghost h-10 w-10 px-0">
              <SkipBack size={18} aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pausar" : "Tocar"}
            className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-th-text text-th-bg transition hover:bg-white"
          >
            {isPlaying ? <Pause size={18} fill="currentColor" aria-hidden="true" /> : <Play size={18} fill="currentColor" aria-hidden="true" />}
          </button>
          {inQueue && (
            <button type="button" onClick={next} aria-label="Próxima faixa" className="btn-ghost h-10 w-10 px-0">
              <SkipForward size={18} aria-hidden="true" />
            </button>
          )}
          <span className="w-10 text-right text-xs tabular-nums text-th-muted">{formatTime(progress)}</span>
          <label className="flex-1">
            <span className="sr-only">Posição na faixa</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step="0.1"
              value={progress}
              onChange={(event) => seek(Number(event.target.value))}
              className="w-full accent-th-accent"
            />
          </label>
          <span className="w-10 text-xs tabular-nums text-th-muted">{formatTime(duration)}</span>
        </div>

        <div className="flex items-center gap-3">
          <label className="hidden items-center gap-2 text-th-muted md:flex">
            <Volume2 size={16} aria-hidden="true" />
            <span className="sr-only">Volume</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
              className="w-20 accent-th-accent"
            />
          </label>
          {current.projectId && (
            <Link to={`/projects/${current.projectId}`} className="text-[13px]">
              Abrir projeto
            </Link>
          )}
          <button type="button" onClick={stop} aria-label="Fechar player" className="btn-ghost h-10 w-10 px-0">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default GlobalPlayer;
