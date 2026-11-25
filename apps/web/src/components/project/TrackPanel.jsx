import { useEffect, useMemo, useState } from "react";
import { Pause, Play, Trash2 } from "lucide-react";
import { apiRequest } from "../../api/client";
import { usePlayer } from "../../context/PlayerContext";
import Waveform from "../ui/Waveform";
import { Avatar } from "../ui/Avatar";
import { ErrorNote } from "../ui/States";
import { formatTime, timeAgo } from "../../lib/format";

const versionOf = (file) => file?.versions?.[0]?.version || "v1";

// A faixa no centro da tela: escolher versão, ouvir, ver e deixar comentários num momento exato.
// canComment = false: visitante de um projeto público (só ouve, não vê nem deixa comentários).
export default function TrackPanel({ project, files, fileId, onSelectFile, currentUser, isOwner, onCommented, canComment = true }) {
  const player = usePlayer();
  const file = files.find((item) => item.id === fileId) || files[0];
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [at, setAt] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const isCurrent = player.current?.id === file?.id;
  const duration = file?.durationSec || (isCurrent ? player.duration : 0);
  const progress = isCurrent ? player.progress : 0;

  async function loadComments() {
    if (!file || !canComment) return;
    try {
      setComments(await apiRequest(`/projects/${project.id}/files/${file.id}/comments`));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    setComments([]);
    setAt(null);
    loadComments();
  }, [file?.id]);

  const track = useMemo(
    () =>
      file && {
        id: file.id,
        title: project.name,
        subtitle: `${versionOf(file)} · ${file.uploader?.name || ""}`,
        audioUrl: file.url,
        coverUrl: project.coverUrl,
        projectId: project.id,
      },
    [file, project]
  );

  async function playPause() {
    if (isCurrent) return player.togglePlay();
    return player.playTrack(track);
  }

  async function seekTo(seconds) {
    if (!isCurrent) await player.playTrack(track);
    player.seek(seconds);
  }

  async function send(event) {
    event.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setError("");
    try {
      const created = await apiRequest(`/projects/${project.id}/files/${file.id}/comments`, {
        method: "POST",
        body: { content: text, atSeconds: at },
      });
      setComments((list) => [...list, created].sort((a, b) => (a.atSeconds ?? 1e9) - (b.atSeconds ?? 1e9)));
      setText("");
      setAt(null);
      onCommented?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function remove(comment) {
    try {
      await apiRequest(`/projects/${project.id}/files/${file.id}/comments/${comment.id}`, { method: "DELETE" });
      setComments((list) => list.filter((item) => item.id !== comment.id));
    } catch (err) {
      setError(err.message);
    }
  }

  if (!file) return null;
  const markers = comments.filter((comment) => comment.atSeconds !== null);

  return (
    <section aria-labelledby="faixa" className="card flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="faixa" className="sr-only">
          Faixa
        </h2>
        <span className="eyebrow">Ouvindo</span>
        <div role="group" aria-label="Versões" className="flex flex-wrap gap-1.5">
          {files.map((item) => (
            <button
              key={item.id}
              type="button"
              className="chip"
              aria-pressed={item.id === file.id}
              onClick={() => onSelectFile(item.id)}
            >
              {versionOf(item)}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[13px] text-th-muted">
          {versionOf(file)} · {file.uploader?.name} · {timeAgo(file.createdAt)}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={playPause}
          aria-label={isCurrent && player.isPlaying ? "Pausar" : `Tocar ${versionOf(file)}`}
          className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-th-text text-th-bg transition hover:bg-white"
        >
          {isCurrent && player.isPlaying ? <Pause size={22} fill="currentColor" aria-hidden="true" /> : <Play size={22} fill="currentColor" aria-hidden="true" />}
        </button>
        <div className="min-w-0 flex-1">
          <Waveform
            peaks={file.peaks}
            duration={duration}
            progress={progress}
            markers={markers}
            activeMarkerId={activeId}
            onSeek={seekTo}
            onPick={canComment ? (seconds) => setAt(Math.round(seconds * 10) / 10) : undefined}
            onMarker={(marker) => {
              setActiveId(marker.id);
              seekTo(marker.atSeconds);
              document.getElementById(`c-${marker.id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
            }}
          />
        </div>
      </div>
      <p className="-mt-2 text-xs tabular-nums text-th-muted">
        {formatTime(progress)} / {formatTime(duration)}
        {canComment && " · Clique na onda para comentar num trecho"}
      </p>

      {canComment && (
        <>

      <form onSubmit={send} className="flex flex-col gap-2">
        <label htmlFor="comment" className="text-sm font-semibold">
          Comentários na {versionOf(file)}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {at !== null ? (
            <button type="button" onClick={() => setAt(null)} className="chip" aria-pressed="true" aria-label={`Comentando em ${formatTime(at)}. Clique para remover o momento`}>
              {formatTime(at)} ✕
            </button>
          ) : (
            <span className="text-xs text-th-muted">Sem momento marcado</span>
          )}
          <input
            id="comment"
            className="input min-w-0 flex-1 basis-60"
            value={text}
            maxLength={1000}
            onChange={(event) => setText(event.target.value)}
            placeholder={at !== null ? `O que acontece em ${formatTime(at)}?` : "Deixe um comentário sobre esta versão"}
          />
          <button type="submit" disabled={sending || !text.trim()} className="btn-primary">
            Enviar
          </button>
        </div>
        <ErrorNote>{error}</ErrorNote>
      </form>

      {comments.length === 0 ? (
        <p className="text-sm text-th-muted">Ninguém comentou esta versão ainda.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {comments.map((comment) => (
            <li
              key={comment.id}
              id={`c-${comment.id}`}
              className={`flex gap-3 rounded-xl px-3 py-3 ${activeId === comment.id ? "bg-th-raised" : ""}`}
            >
              <Avatar user={comment.user} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-sm font-semibold">{comment.user?.name}</span>
                  {comment.atSeconds !== null && (
                    <button type="button" onClick={() => seekTo(comment.atSeconds)} className="text-xs font-semibold tabular-nums text-th-link">
                      {formatTime(comment.atSeconds)}
                    </button>
                  )}
                  <span className="text-xs text-th-muted">{timeAgo(comment.createdAt)}</span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-th-text2">{comment.content}</p>
              </div>
              {(comment.user?.id === currentUser?.id || isOwner) && (
                <button type="button" onClick={() => remove(comment)} aria-label="Excluir comentário" className="btn-ghost h-9 w-9 flex-none px-0">
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
        </>
      )}
    </section>
  );
}

export { versionOf };
