import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Ticket, Mail, Mic2 } from "lucide-react";
import { apiRequest } from "../api/client";
import { Page } from "../components/layout/AppShell";
import { AvatarStack } from "../components/ui/Avatar";
import { EmptyState, ErrorNote, PageHeader, SkeletonBlock } from "../components/ui/States";
import EventFormModal from "../components/events/EventFormModal";
import Flyer from "../components/events/Flyer";
import { EVENT_STAGES, EVENT_TYPES, countdown, eventDateLabel, eventStageOf, eventTypeOf } from "../lib/events";
import { plural } from "../lib/format";

function lineupLabel(event) {
  const { total, confirmed } = event.lineup;
  if (!total) return "Line-up vazio";
  return confirmed === total ? `${plural(total, "atração", "atrações")} no line-up` : `${confirmed} de ${total} confirmados`;
}

function EventCard({ event }) {
  const info = event.eventInfo;
  const place = info.venueName || "Local a definir";
  const people = event.lineupPreview.map((item) => item.user || { id: item.name, name: item.name });
  return (
    <Link
      to={`/eventos/${event.id}`}
      aria-label={`${event.name}, ${eventDateLabel(info.startsAt)}, ${place}, ${countdown(info.startsAt)}`}
      className="card-link flex flex-col overflow-hidden"
    >
      <Flyer event={event} className="h-[118px] w-full" titleClass="text-[24px]" />
      <span className="flex flex-col gap-2.5 p-3.5">
        <span className="text-base font-semibold">{event.name}</span>
        <span className="flex flex-col gap-0.5 text-[13px] text-th-text2">
          <span>{eventDateLabel(info.startsAt)}</span>
          <span className="text-th-muted">{place}</span>
        </span>
        <span className="flex flex-wrap gap-1.5">
          <span className="rounded-[10px] bg-th-raised px-2.5 py-1 text-xs font-semibold">{countdown(info.startsAt)}</span>
          {info.callOpen && (
            <span className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#2B2236] px-2.5 py-1 text-xs font-semibold text-[#E6CCEE]">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-th-lilac" />
              Inscrições abertas
            </span>
          )}
        </span>
        <span className="flex items-center gap-3">
          {people.length > 0 && <AvatarStack users={people} max={3} />}
          <span className="text-xs text-th-muted">{lineupLabel(event)}</span>
        </span>
      </span>
    </Link>
  );
}

export default function Events() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [events, setEvents] = useState(null);
  const [invites, setInvites] = useState([]);
  const [gigs, setGigs] = useState([]);
  const [error, setError] = useState("");
  const [view, setView] = useState("board");
  const [type, setType] = useState("all");

  const creating = params.get("novo") === "1";

  useEffect(() => {
    apiRequest("/events?when=all")
      .then(setEvents)
      .catch((err) => {
        setError(err.message);
        setEvents([]);
      });
    apiRequest("/events/lineup-invites")
      .then((list) => {
        setInvites(list.filter((item) => item.status === "invited"));
        // Onde você vai se apresentar: line-ups em que você está confirmado e que ainda não passaram.
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        setGigs(
          list
            .filter((item) => item.status === "confirmed" && new Date(item.project.eventInfo?.startsAt) >= startOfToday)
            .sort((a, b) => new Date(a.project.eventInfo.startsAt) - new Date(b.project.eventInfo.startsAt))
        );
      })
      .catch(() => {});
  }, []);

  function closeCreate() {
    const copy = new URLSearchParams(params);
    copy.delete("novo");
    setParams(copy, { replace: true });
  }

  const filtered = useMemo(
    () => (events || []).filter((event) => type === "all" || event.eventInfo?.type === type),
    [events, type]
  );

  const usedTypes = EVENT_TYPES.filter((item) => (events || []).some((event) => event.eventInfo?.type === item.id));

  return (
    <Page wide>
      <PageHeader
        title="Eventos"
        subtitle="Do planejamento ao dia do show: line-up, cronograma, checklist e equipe."
        actions={
          <>
            {events?.length > 0 && (
              <div role="group" aria-label="Visualização" className="flex rounded-[10px] border border-th-line bg-th-surface p-1">
                {[
                  ["board", "Quadro"],
                  ["list", "Lista"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={view === id}
                    onClick={() => setView(id)}
                    className={`min-h-[36px] rounded-[7px] px-3.5 text-sm font-semibold ${view === id ? "bg-white text-th-bg" : "text-th-text2"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            <Link to="/eventos?novo=1" className="btn-primary no-underline hover:text-th-bg">
              <Plus size={18} aria-hidden="true" /> Novo evento
            </Link>
          </>
        }
      />

      <ErrorNote>{error}</ErrorNote>

      {invites.length > 0 && (
        <Link to="/eventos/convites" className="card-link flex items-center gap-3 px-4 py-3.5">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-[#262A3A] text-th-link">
            <Mail size={18} aria-hidden="true" />
          </span>
          <span className="flex-1 text-sm">
            <b>{plural(invites.length, "convite", "convites")} para tocar</b>
            <span className="block text-th-muted">Responda para quem organiza saber se você vai.</span>
          </span>
          <span className="text-sm text-th-link">Ver convites</span>
        </Link>
      )}

      {!events && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
          {[1, 2, 3, 4].map((key) => (
            <SkeletonBlock key={key} className="h-72" />
          ))}
        </div>
      )}

      {gigs.length > 0 && (
        <section aria-labelledby="gigs" className="flex flex-col gap-3">
          <h2 id="gigs" className="flex items-center gap-2 text-lg font-semibold">
            <Mic2 size={18} aria-hidden="true" className="text-th-lilac" /> Onde você vai se apresentar
          </h2>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3">
            {gigs.map((slot) => {
              const event = slot.project;
              const info = event.eventInfo || {};
              const to = info.published ? `/e/${info.slug}` : "/eventos/convites";
              return (
                <li key={slot.id}>
                  <Link to={to} className="card-link flex items-center gap-3.5 p-3">
                    <Flyer event={{ ...event, type: info.type }} className="h-[72px] w-14 flex-none rounded-lg" titleClass="text-[10px]" showKind={false} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">{event.name}</span>
                      <span className="block truncate text-[13px] text-th-text2">
                        {eventDateLabel(info.startsAt)} · {countdown(info.startsAt)}
                      </span>
                      <span className="block truncate text-xs text-th-muted">
                        Você como {slot.role}
                        {slot.startTime ? ` às ${slot.startTime}` : ""} · {info.venueName || "local a definir"} · por {event.owner?.name}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {events?.length > 0 && <h2 className="mt-3 text-lg font-semibold">Eventos que você organiza</h2>}
        </section>
      )}

      {events?.length === 0 && !error && gigs.length > 0 && (
        <p className="rounded-[14px] border border-th-line px-4 py-4 text-sm text-th-muted">
          Você ainda não organiza nenhum evento.{" "}
          <Link to="/eventos?novo=1">Criar um evento</Link>
        </p>
      )}

      {events?.length === 0 && !error && gigs.length === 0 && (
        <EmptyState
          icon={Ticket}
          title="Seu primeiro evento começa aqui"
          text="Batalha, show, open mic ou festa: monte o line-up, o cronograma do dia e o checklist com a equipe."
          action={
            <Link to="/eventos?novo=1" className="btn-primary no-underline hover:text-th-bg">
              Criar evento
            </Link>
          }
        />
      )}

      {usedTypes.length > 1 && (
        <div role="group" aria-label="Filtrar por tipo" className="flex flex-wrap gap-2">
          {[{ id: "all", label: "Todos" }, ...usedTypes].map((item) => (
            <button key={item.id} type="button" className="chip min-h-[40px] px-4" aria-pressed={type === item.id} onClick={() => setType(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
      )}

      {events?.length > 0 && view === "board" && (
        <div className="-mx-1 overflow-x-auto px-1 pb-2">
          <div className="grid min-w-[1080px] grid-cols-4 items-start gap-4">
            {EVENT_STAGES.map((stage) => {
              const items = filtered.filter((event) => event.status === stage.id);
              return (
                <section key={stage.id} aria-label={stage.label} className="flex flex-col gap-3 rounded-2xl border border-th-line bg-th-sidebar p-3.5">
                  <div className="flex flex-col gap-1 px-1 pt-3" style={{ borderTop: `3px solid ${stage.color}` }}>
                    <div className="flex items-center gap-2">
                      <h2 className="flex-1 text-[15px] font-semibold">{stage.label}</h2>
                      <span className="text-xs text-th-muted">{items.length}</span>
                    </div>
                    <p className="text-xs leading-snug text-th-muted">{stage.hint}</p>
                  </div>
                  {items.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </section>
              );
            })}
          </div>
        </div>
      )}

      {events?.length > 0 && view === "list" && (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.06em] text-th-muted">
                {["Evento", "Data", "Local", "Etapa", "Line-up"].map((label) => (
                  <th key={label} scope="col" className="border-b border-th-line px-4 py-3.5 font-semibold">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((event) => {
                const stage = eventStageOf(event.status);
                return (
                  <tr key={event.id}>
                    <td className="border-b border-th-line px-4 py-3">
                      <Link to={`/eventos/${event.id}`} className="flex items-center gap-3 text-th-text no-underline hover:text-th-text">
                        <Flyer event={event} className="h-[54px] w-11 flex-none rounded-lg" titleClass="text-[8px]" showKind={false} />
                        <span className="flex flex-col gap-0.5">
                          <span className="font-semibold">{event.name}</span>
                          <span className="text-xs text-th-muted">{eventTypeOf(event.eventInfo?.type).label}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="border-b border-th-line px-4 py-3">
                      <span className="block">{eventDateLabel(event.eventInfo?.startsAt)}</span>
                      <span className="text-xs text-th-muted">{countdown(event.eventInfo?.startsAt)}</span>
                    </td>
                    <td className="border-b border-th-line px-4 py-3 text-th-text2">{event.eventInfo?.venueName || "—"}</td>
                    <td className="border-b border-th-line px-4 py-3">
                      <span className="inline-flex items-center gap-2">
                        <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: stage.color }} />
                        {stage.label}
                      </span>
                    </td>
                    <td className="border-b border-th-line px-4 py-3 text-th-text2">{lineupLabel(event)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <EventFormModal open={creating} onClose={closeCreate} onSaved={(saved, warning) => navigate(`/eventos/${saved.id}`, { replace: true, state: warning ? { notice: warning } : undefined })} />
    </Page>
  );
}
