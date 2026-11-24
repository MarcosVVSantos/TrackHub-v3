import { useMemo, useRef, useState } from "react";
import { avatarColor, formatTime, initials } from "../../lib/format";

const BARS = 120;

function resample(peaks, size) {
  if (!Array.isArray(peaks) || !peaks.length) return null;
  return Array.from({ length: size }, (_, i) => {
    const start = Math.floor((i / size) * peaks.length);
    const end = Math.max(start + 1, Math.floor(((i + 1) / size) * peaks.length));
    return Math.max(...peaks.slice(start, end));
  });
}

// Forma de onda clicável. Clicar leva o player para aquele ponto e,
// se onPick existir, abre o comentário naquele momento.
// Os marcadores mostram onde há comentários.
export default function Waveform({ peaks, duration, progress = 0, markers = [], onSeek, onPick, onMarker, activeMarkerId }) {
  const ref = useRef(null);
  const [hover, setHover] = useState(null);
  const bars = useMemo(() => resample(peaks, BARS), [peaks]);
  const ratio = duration ? Math.min(1, progress / duration) : 0;

  function secondsAt(clientX) {
    const rect = ref.current.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    return duration ? (x / rect.width) * duration : 0;
  }

  function handleClick(event) {
    if (!duration) return;
    const seconds = secondsAt(event.clientX);
    onSeek?.(seconds);
    onPick?.(seconds);
  }

  function handleKey(event) {
    if (!duration) return;
    if (event.key === "ArrowRight") onSeek?.(Math.min(duration, progress + 5));
    if (event.key === "ArrowLeft") onSeek?.(Math.max(0, progress - 5));
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onPick?.(progress);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={ref}
        role="slider"
        tabIndex={0}
        aria-label="Posição na faixa. Clique ou use Enter para comentar neste ponto"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration || 0)}
        aria-valuenow={Math.round(progress)}
        aria-valuetext={`${formatTime(progress)} de ${formatTime(duration)}`}
        onClick={handleClick}
        onKeyDown={handleKey}
        onMouseMove={(event) => duration && setHover(secondsAt(event.clientX))}
        onMouseLeave={() => setHover(null)}
        className="relative flex h-24 cursor-pointer items-center gap-[2px] rounded-xl px-1 outline-offset-4"
      >
        {bars ? (
          bars.map((value, index) => {
            const played = index / BARS < ratio;
            return (
              <span
                key={index}
                aria-hidden="true"
                className="flex-1 rounded-full"
                style={{ height: `${Math.max(6, value * 100)}%`, background: played ? "#D49AE6" : "#3D3746" }}
              />
            );
          })
        ) : (
          <span aria-hidden="true" className="relative h-1.5 w-full rounded-full bg-th-line">
            <span className="absolute inset-y-0 left-0 rounded-full bg-stage-production" style={{ width: `${ratio * 100}%` }} />
          </span>
        )}

        {hover !== null && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-7 -translate-x-1/2 rounded-md bg-th-raised px-2 py-0.5 text-xs text-th-text"
            style={{ left: `${(hover / duration) * 100}%` }}
          >
            {formatTime(hover)}
          </span>
        )}
      </div>

      {duration > 0 && markers.length > 0 && (
        <div className="relative h-7">
          {markers.map((marker) => (
            <button
              key={marker.id}
              type="button"
              onClick={() => onMarker?.(marker)}
              aria-label={`Comentário de ${marker.user?.name} em ${formatTime(marker.atSeconds)}`}
              className={`absolute top-0 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border-2 text-[10px] font-bold text-th-sidebar transition ${
                activeMarkerId === marker.id ? "border-white" : "border-th-bg"
              }`}
              style={{ left: `${(marker.atSeconds / duration) * 100}%`, background: avatarColor(marker.user?.id) }}
            >
              {initials(marker.user?.name)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
