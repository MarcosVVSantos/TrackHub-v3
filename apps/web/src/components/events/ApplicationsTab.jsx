import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Inbox, Pause, Play } from "lucide-react";
import { apiRequest } from "../../api/client";
import { usePlayer } from "../../context/PlayerContext";
import { Avatar } from "../ui/Avatar";
import { EmptyState, ErrorNote, SkeletonBlock } from "../ui/States";
import { APPLICATION_STATUS } from "../../lib/events";
import { timeAgo } from "../../lib/format";

// Próximas ações possíveis em cada coluna.
const ACTIONS = {
  pending: [
    ["shortlisted", "Pré-selecionar"],
    ["rejected", "Recusar"],
    ["approved", "Aprovar"],
  ],
  shortlisted: [
    ["pending", "Voltar para novas"],
    ["rejected", "Recusar"],
    ["approved", "Aprovar"],
  ],
  approved: [["shortlisted", "Desfazer aprovação"]],
  rejected: [["pending", "Reconsiderar"]],
};

function Sample({ item }) {
  const player = usePlayer();
  if (item.track?.audioUrl) {
    const playing = player.isPlaying && player.current?.id === `app-${item.id}`;
    return (
      <button
        type="button"
        className="btn-secondary min-h-[40px] justify-start text-sm"
        aria-label={`${playing ? "Pausar" : "Ouvir"} amostra de ${item.artistName}`}
        onClick={() =>
          player.current?.id === `app-${item.id}`
            ? player.togglePlay()
            : player.playTrack({
                id: `app-${item.id}`,
                title: item.track.title,
                subtitle: `Inscrição de ${item.artistName}`,
                audioUrl: item.track.audioUrl,
                coverUrl: item.track.coverUrl,
              })
        }
      >
        {playing ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
        <span className="truncate">{item.track.title}</span>
      </button>
    );
  }
  if (item.sampleUrl) {
    let host = "link";
    try {
      host = new URL(item.sampleUrl).hostname.replace(/^www\./, "");
    } catch {
      // link guardado sempre é válido; se não for, mostra só "link".
    }
    return (
      <a href={item.sampleUrl} target="_blank" rel="noopener noreferrer nofollow" className="btn-secondary min-h-[40px] justify-start text-sm no-underline">
        <ExternalLink size={15} aria-hidden="true" /> Ouvir em {host}
      </a>
    );
  }
  return <span className="text-xs text-th-muted">Sem amostra</span>;
}

function Card({ item, busy, onSet }) {
  return (
    <li className="flex flex-col gap-3 rounded-[14px] border border-th-line bg-th-surface p-3.5">
      <div className="flex items-start gap-3">
        <Avatar user={item.user} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">{item.artistName}</span>
          <span className="block truncate text-xs text-th-muted">{[item.role, item.city].filter(Boolean).join(" · ")}</span>
          <Link to={`/profile/${item.user?.username}`} className="text-xs">
            @{item.user?.username}
          </Link>
        </span>
        <span className="text-[11px] text-th-muted">{timeAgo(item.createdAt)}</span>
      </div>
      {item.message && <p className="whitespace-pre-line break-words text-sm text-th-text2">“{item.message}”</p>}
      <Sample item={item} />
      <div className="flex flex-wrap gap-1.5">
        {ACTIONS[item.status].map(([status, label]) => (
          <button
            key={status}
            type="button"
            disabled={busy}
            onClick={() => onSet(item, status)}
            className={`${status === "approved" ? "btn-primary" : "btn-ghost border border-th-line"} min-h-[36px] px-3 text-[13px]`}
          >
            {label}
          </button>
        ))}
      </div>
    </li>
  );
}

// Quadro de inscrições: ouvir, pré-selecionar, aprovar (entra no line-up) ou recusar.
export default function ApplicationsTab({ event, onChange }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");

  async function load() {
    try {
      setItems(await apiRequest(`/events/${event.id}/applications`));
    } catch (err) {
      setError(err.message);
      setItems([]);
    }
  }

  useEffect(() => {
    load();
  }, [event.id]);

  async function setStatus(item, status) {
    if (item.status === "approved" && !window.confirm(`Desfazer a aprovação de ${item.artistName}? Se ele já estiver no line-up, tire pela aba Line-up.`)) return;
    setBusy(item.id);
    setError("");
    setNotice("");
    try {
      await apiRequest(`/events/${event.id}/applications/${item.id}`, { method: "PATCH", body: { status } });
      if (status === "approved") setNotice(`${item.artistName} foi aprovado, entrou no line-up como confirmado e recebeu um aviso.`);
      if (status === "rejected") setNotice(`${item.artistName} recebeu um aviso de que não foi selecionado desta vez.`);
      await load();
      if (status === "approved") onChange?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  const info = event.eventInfo || {};

  return (
    <div className="flex flex-col gap-3.5">
      {!info.callOpen && (
        <p className="rounded-xl border border-th-line px-4 py-3 text-sm text-th-text2">
          A chamada de inscrições está fechada. Para abrir, use <b>Editar</b> e marque “Aceitar inscrições de artistas”.
          {!info.published && " A página pública também precisa estar publicada."}
        </p>
      )}
      {info.callOpen && !info.published && (
        <p className="rounded-xl border border-th-warn/40 bg-th-warn/10 px-4 py-3 text-sm text-th-warn">
          A chamada está aberta, mas a página pública ainda não foi publicada. Publique no card ao lado para receber inscrições.
        </p>
      )}
      <ErrorNote>{error}</ErrorNote>
      {notice && (
        <p role="status" className="text-sm text-stage-finished">
          {notice}
        </p>
      )}
      {!items && <SkeletonBlock className="h-64" />}
      {items?.length === 0 && (
        <EmptyState icon={Inbox} title="Nenhuma inscrição ainda" text="Quando artistas se inscreverem pela página pública, eles aparecem aqui para você ouvir e decidir." />
      )}
      {items?.length > 0 && (
        <div className="-mx-1 overflow-x-auto px-1 pb-2">
          <div className="grid min-w-[1000px] grid-cols-4 items-start gap-3.5">
            {Object.entries(APPLICATION_STATUS).map(([status, meta]) => {
              const column = items.filter((item) => item.status === status);
              return (
                <section key={status} aria-label={meta.label} className="flex flex-col gap-3 rounded-2xl border border-th-line bg-th-sidebar p-3">
                  <div className="flex flex-col gap-1 px-1 pt-2.5" style={{ borderTop: `3px solid ${meta.color}` }}>
                    <div className="flex items-center gap-2">
                      <h3 className="flex-1 text-[15px] font-semibold">{meta.label}</h3>
                      <span className="text-xs text-th-muted">{column.length}</span>
                    </div>
                    <p className="text-xs text-th-muted">{meta.hint}</p>
                  </div>
                  <ul className="flex flex-col gap-2.5">
                    {column.map((item) => (
                      <Card key={item.id} item={item} busy={busy === item.id} onSet={setStatus} />
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
