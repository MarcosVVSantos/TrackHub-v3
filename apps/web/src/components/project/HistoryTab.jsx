import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { stageOf, timeAgo } from "../../lib/format";
import { Avatar } from "../ui/Avatar";
import { ErrorNote } from "../ui/States";

// Linha do tempo: mudanças de etapa + versões enviadas + comentários gerais do projeto.
export default function HistoryTab({ project, onComment }) {
  const [log, setLog] = useState(project.statusLog || []);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest(`/projects/${project.id}/history`).then(setLog).catch(() => {});
  }, [project.id, project.status]);

  const items = [
    ...log.map((entry) => ({
      id: `s-${entry.id}`,
      at: entry.createdAt,
      text: `Etapa mudou de ${stageOf(entry.fromStatus).label} para ${stageOf(entry.toStatus).label}`,
      color: stageOf(entry.toStatus).color,
    })),
    ...(project.files || []).map((file) => ({
      id: `f-${file.id}`,
      at: file.createdAt,
      user: file.uploader,
      text: `${file.uploader?.name || "Alguém"} enviou ${file.versions?.[0]?.version || "uma versão"} (${file.name})`,
    })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at));

  async function send(event) {
    event.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setError("");
    try {
      await apiRequest(`/projects/${project.id}/comments`, { method: "POST", body: { content: text } });
      setText("");
      await onComment();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="card" aria-labelledby="linha">
        <h2 id="linha" className="mb-4 font-semibold">
          Linha do tempo
        </h2>
        {items.length === 0 ? (
          <p className="text-sm text-th-muted">Nada aconteceu ainda.</p>
        ) : (
          <ol className="relative flex flex-col gap-4 border-l border-th-line pl-5">
            {items.map((item) => (
              <li key={item.id} className="relative">
                <span aria-hidden="true" className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full" style={{ background: item.color || "#8796C4" }} />
                <p className="text-sm text-th-text2">{item.text}</p>
                <p className="text-xs text-th-muted">{timeAgo(item.at)}</p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="card flex flex-col gap-4" aria-labelledby="mural">
        <h2 id="mural" className="font-semibold">
          Mural do projeto
        </h2>
        <form onSubmit={send} className="flex gap-2">
          <label htmlFor="mural-text" className="sr-only">
            Recado para a equipe
          </label>
          <input id="mural-text" className="input" maxLength={1000} placeholder="Recado para a equipe" value={text} onChange={(event) => setText(event.target.value)} />
          <button type="submit" className="btn-primary" disabled={sending || !text.trim()}>
            Enviar
          </button>
        </form>
        <ErrorNote>{error}</ErrorNote>
        <ul className="flex flex-col gap-3">
          {[...(project.comments || [])]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map((comment) => (
              <li key={comment.id} className="flex gap-3">
                <Avatar user={comment.user} size="sm" />
                <div>
                  <p className="text-sm">
                    <span className="font-semibold">{comment.user?.name}</span> <span className="text-xs text-th-muted">{timeAgo(comment.createdAt)}</span>
                  </p>
                  <p className="whitespace-pre-wrap break-words text-sm text-th-text2">{comment.content}</p>
                </div>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
