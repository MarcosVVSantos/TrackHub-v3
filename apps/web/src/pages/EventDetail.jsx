import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Archive, CalendarDays, Check, ChevronRight, Clock, ExternalLink, MapPin, Pencil, Plus } from "lucide-react";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Page } from "../components/layout/AppShell";
import { EmptyState, ErrorNote, SkeletonBlock } from "../components/ui/States";
import TasksTab from "../components/project/TasksTab";
import TeamTab from "../components/project/TeamTab";
import AgendaTab from "../components/project/AgendaTab";
import LineupTab from "../components/events/LineupTab";
import EventFilesTab from "../components/events/EventFilesTab";
import EventFormModal from "../components/events/EventFormModal";
import Flyer from "../components/events/Flyer";
import { EVENT_STAGES, countdown, eventDateLabel, eventTypeOf } from "../lib/events";

const TABS = [
  { id: "lineup", label: "Line-up" },
  { id: "cronograma", label: "Cronograma" },
  { id: "checklist", label: "Checklist" },
  { id: "arquivos", label: "Arquivos" },
  { id: "equipe", label: "Equipe" },
];

// Sugestões de tarefas conforme o tipo de evento. Viram tarefas normais do checklist.
const SUGGESTIONS = {
  battle: ["Definir jurados", "Sorteio das chaves", "Microfone sem fio e cronômetro", "Premiação dos MCs"],
  show: ["Rider técnico para a casa", "Passagem de som", "Divulgação no Instagram", "Contratar segurança"],
  open_mic: ["Lista de inscritos do microfone", "Caixa de som e microfones", "Divulgação no Instagram"],
  party: ["Fechar o DJ", "Bar e caixa", "Segurança e portaria", "Divulgação no Instagram"],
  other: ["Fechar o local", "Divulgação", "Confirmar equipe do dia"],
};

function nextStep(event) {
  const info = event.eventInfo || {};
  const summary = event.lineupSummary || {};
  const openTasks = (event.tasks || []).filter((task) => !task.done).length;
  if (!info.venueName) return "Defina o local do evento em Editar.";
  if (!summary.total) return "Monte o line-up: convide artistas do TrackHub ou adicione atrações sem conta.";
  if (summary.invited > 0) return `Faltam ${summary.invited} ${summary.invited === 1 ? "confirmação" : "confirmações"} no line-up.`;
  if (openTasks > 0) return `Ainda há ${openTasks} ${openTasks === 1 ? "tarefa aberta" : "tarefas abertas"} no checklist.`;
  const index = EVENT_STAGES.findIndex((stage) => stage.id === event.status);
  if (index < EVENT_STAGES.length - 1) return `Tudo em dia. Quando fizer sentido, avance para ${EVENT_STAGES[index + 1].label}.`;
  return "Evento realizado. Guarde fotos e números em Arquivos.";
}

function Suggestions({ event, onChange }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const existing = new Set((event.tasks || []).map((task) => task.title.trim().toLowerCase()));
  const type = eventTypeOf(event.eventInfo?.type);
  const items = (SUGGESTIONS[type.id] || []).filter((title) => !existing.has(title.toLowerCase()));
  if (!items.length) return null;

  async function add(title) {
    setBusy(title);
    setError("");
    try {
      await apiRequest(`/projects/${event.id}/tasks`, { method: "POST", body: { title } });
      await onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-[14px] border border-dashed border-th-line2 p-4">
      <span className="text-[13px] font-semibold text-th-text2">Sugestões para {type.id === "other" ? "eventos" : `${type.label.toLowerCase()}s`}</span>
      <span className="flex flex-wrap gap-2">
        {items.map((title) => (
          <button key={title} type="button" className="btn-secondary min-h-[40px] text-sm" disabled={Boolean(busy)} onClick={() => add(title)}>
            <Plus size={14} aria-hidden="true" /> {title}
          </button>
        ))}
      </span>
      <ErrorNote>{error}</ErrorNote>
    </div>
  );
}

export default function EventDetail() {
  const { id } = useParams();
  const { user } = useAuth() || {};
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [event, setEvent] = useState(null);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState(location.state?.notice || "");
  const [editOpen, setEditOpen] = useState(false);

  const tab = TABS.some((item) => item.id === params.get("tab")) ? params.get("tab") : "lineup";

  async function load() {
    try {
      setEvent(await apiRequest(`/events/${id}`));
    } catch (err) {
      setLoadError(err.message);
    }
  }

  useEffect(() => {
    setEvent(null);
    setLoadError("");
    load();
  }, [id]);

  function setTab(next) {
    const copy = new URLSearchParams(params);
    copy.set("tab", next);
    setParams(copy, { replace: true });
  }

  const isOwner = event?.myRole === "owner";
  const canEdit = event?.myRole === "owner" || event?.myRole === "editor";
  const currentMember = event?.members?.find((member) => member.userId === user?.id);
  const team = useMemo(() => {
    if (!event) return [];
    const people = [event.owner, ...(event.members || []).filter((m) => m.status === "accepted").map((m) => m.user)].filter(Boolean);
    return people.filter((person, index) => people.findIndex((other) => other.id === person.id) === index);
  }, [event]);

  async function update(body) {
    setError("");
    try {
      const updated = await apiRequest(`/events/${id}`, { method: "PUT", body });
      setEvent((prev) => ({ ...prev, ...updated }));
    } catch (err) {
      setError(err.message);
    }
  }

  async function archive() {
    if (!window.confirm("Arquivar este evento? Ele sai da sua lista de eventos.")) return;
    try {
      await apiRequest(`/events/${id}`, { method: "DELETE" });
      navigate("/eventos", { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  if (!event) {
    return (
      <Page>
        {loadError ? (
          <EmptyState title="Não deu para abrir o evento" text={loadError} action={<Link to="/eventos" className="btn-secondary">Voltar para eventos</Link>} />
        ) : (
          <div className="flex flex-col gap-4">
            <SkeletonBlock className="h-48" />
            <SkeletonBlock className="h-64" />
          </div>
        )}
      </Page>
    );
  }

  const info = event.eventInfo || {};
  const type = eventTypeOf(info.type);
  const currentStage = Math.max(0, EVENT_STAGES.findIndex((stage) => stage.id === event.status));
  const doneTasks = (event.tasks || []).filter((task) => task.done).length;
  const counts = {
    lineup: event.lineupSummary?.total || 0,
    checklist: event.tasks?.length ? `${doneTasks}/${event.tasks.length}` : "",
    arquivos: event._count?.files || 0,
    equipe: team.length,
  };
  const deadline = info.callDeadline ? new Date(info.callDeadline).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "";

  return (
    <Page wide>
      <nav aria-label="Caminho" className="-mb-3 flex items-center gap-2 text-sm text-th-muted">
        <Link to="/eventos">Eventos</Link>
        <ChevronRight size={14} aria-hidden="true" />
        <span aria-current="page" className="truncate text-th-text2">
          {event.name}
        </span>
      </nav>

      <header className="flex flex-wrap items-start gap-6">
        <Flyer event={event} className="h-[190px] w-[152px] flex-none rounded-2xl" titleClass="text-[22px]" kindLabel={`${type.label} · ${new Date(info.startsAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`} />
        <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-[10px] bg-th-raised px-2.5 py-1 text-xs font-semibold text-th-text2">{type.label}</span>
            {info.callOpen && (
              <span className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#2B2236] px-2.5 py-1 text-xs font-semibold text-[#E6CCEE]">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-th-lilac" />
                Inscrições abertas{deadline ? ` até ${deadline}` : ""}
              </span>
            )}
          </div>
          <h1 className="break-words text-[30px] font-bold leading-tight tracking-tight sm:text-[34px]">{event.name}</h1>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-[15px] text-th-text2">
            <span className="flex items-center gap-2">
              <CalendarDays size={16} aria-hidden="true" className="text-th-muted" />
              {eventDateLabel(info.startsAt, info.endsAt)}
            </span>
            <span className="flex items-center gap-2">
              <MapPin size={16} aria-hidden="true" className="text-th-muted" />
              {info.venueName || "Local a definir"}
            </span>
          </div>
          {event.description && <p className="max-w-2xl text-sm text-th-text2">{event.description}</p>}
          <span className="inline-flex items-center gap-2 self-start rounded-xl bg-white px-3.5 py-2 text-[15px] font-bold text-th-bg">
            <Clock size={16} aria-hidden="true" />
            {countdown(info.startsAt)}
          </span>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2.5">
            <button type="button" className="btn-secondary" onClick={() => setEditOpen(true)}>
              <Pencil size={16} aria-hidden="true" /> Editar
            </button>
            {isOwner && (
              <button type="button" className="btn-ghost" onClick={archive}>
                <Archive size={16} aria-hidden="true" /> Arquivar
              </button>
            )}
          </div>
        )}
      </header>

      <section aria-label="Etapa do evento" className="card flex flex-wrap items-center gap-3 px-4 py-3.5">
        <span className="text-[13px] font-semibold text-th-text2">Etapa</span>
        <div role="radiogroup" aria-label="Etapa do evento" className="grid flex-[1_1_520px] grid-cols-2 gap-2 sm:grid-cols-4">
          {EVENT_STAGES.map((stage, index) => {
            const active = index === currentStage;
            const done = index < currentStage;
            return (
              <button
                key={stage.id}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={!canEdit}
                onClick={() => !active && update({ status: stage.id })}
                className={`flex min-h-[52px] flex-col items-start gap-1.5 rounded-xl border px-3 py-2 text-left transition disabled:cursor-default ${
                  active ? "bg-th-bg" : "hover:border-th-hover"
                }`}
                style={{ borderColor: active ? stage.color : "#2C2833" }}
              >
                <span className="h-1 w-full rounded-sm" style={{ background: index <= currentStage ? stage.color : "#2C2833" }} />
                <span className={`flex items-center gap-1.5 text-[13px] ${active ? "font-bold" : "font-medium"} ${index <= currentStage ? "text-th-text" : "text-th-muted"}`}>
                  {done && <Check size={13} aria-hidden="true" />}
                  {stage.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div role="tablist" aria-label="Seções do evento" className="-mb-2 flex gap-1 overflow-x-auto border-b border-th-line">
        {TABS.map((item) => (
          <button
            key={item.id}
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls={`panel-${item.id}`}
            onClick={() => setTab(item.id)}
            className={`-mb-px flex min-h-[44px] items-center gap-2 whitespace-nowrap border-b-2 px-4 text-[15px] transition ${
              tab === item.id ? "border-th-lilac font-semibold text-white" : "border-transparent text-th-text2 hover:text-th-text"
            }`}
          >
            {item.label}
            {counts[item.id] ? <span className="rounded-[10px] bg-th-raised px-[7px] py-px text-xs text-th-text2">{counts[item.id]}</span> : null}
          </button>
        ))}
      </div>

      <ErrorNote>{error}</ErrorNote>
      {notice && (
        <p role="status" className="text-sm text-th-warn">
          {notice}{" "}
          <button type="button" className="underline" onClick={() => setNotice("")}>
            Ok
          </button>
        </p>
      )}

      <div className="flex flex-wrap items-start gap-6">
        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="flex min-w-0 flex-[999_1_520px] flex-col gap-3.5">
          {tab === "lineup" && <LineupTab event={event} canEdit={canEdit} onChange={load} />}
          {tab === "cronograma" && <AgendaTab project={event} team={team} canEdit={canEdit} onChange={load} />}
          {tab === "checklist" && (
            <>
              <TasksTab project={event} team={team} canEdit={canEdit} onChange={load} />
              {canEdit && <Suggestions event={event} onChange={load} />}
            </>
          )}
          {tab === "arquivos" && <EventFilesTab eventId={event.id} canEdit={canEdit} />}
          {tab === "equipe" && <TeamTab project={event} currentUser={user} isOwner={isOwner} currentMember={currentMember} onChange={load} />}
        </div>

        <aside aria-label="Resumo do evento" className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
          <section aria-labelledby="ev-prox" className="flex flex-col gap-2.5 rounded-2xl border border-th-hover bg-[#2B2236] p-[18px]">
            <h2 id="ev-prox" className="text-[15px] font-semibold">
              Próximo passo
            </h2>
            <p className="text-[15px] leading-relaxed text-th-text">{nextStep(event)}</p>
          </section>

          <section aria-labelledby="ev-local" className="card flex flex-col gap-1.5 p-[18px]">
            <h2 id="ev-local" className="text-[15px] font-semibold">
              Local
            </h2>
            <p className="text-sm text-th-text2">{info.venueName || "A definir"}</p>
            {info.venueAddress && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(info.venueAddress)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm"
              >
                {info.venueAddress} <ExternalLink size={13} aria-hidden="true" />
              </a>
            )}
          </section>

          <section aria-labelledby="ev-ing" className="card flex flex-col gap-2 p-[18px]">
            <h2 id="ev-ing" className="text-[15px] font-semibold">
              Ingressos
            </h2>
            {info.ticketUrl ? (
              <>
                <p className="text-sm text-th-text2">Vendidos fora do TrackHub, pelo link cadastrado.</p>
                <a href={info.ticketUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 break-all text-sm">
                  {info.ticketUrl.replace(/^https?:\/\//, "")} <ExternalLink size={13} aria-hidden="true" />
                </a>
              </>
            ) : (
              <p className="text-sm text-th-muted">Sem link de ingresso. {canEdit ? "Adicione em Editar, se houver venda." : ""}</p>
            )}
          </section>
        </aside>
      </div>

      <EventFormModal
        open={editOpen}
        event={event}
        canChangeFlyer={isOwner}
        onClose={() => setEditOpen(false)}
        onSaved={(saved, warning) => {
          setEditOpen(false);
          if (warning) setNotice(warning);
          setEvent((prev) => ({ ...prev, ...saved }));
          load();
        }}
      />
    </Page>
  );
}
