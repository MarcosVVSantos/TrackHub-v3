import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Mic2, MapPin, CalendarDays } from "lucide-react";
import { apiRequest } from "../api/client";
import { Page } from "../components/layout/AppShell";
import { EmptyState, ErrorNote, PageHeader, SkeletonBlock } from "../components/ui/States";
import Flyer from "../components/events/Flyer";
import { APPLICATION_STATUS, LINEUP_STATUS, countdown, eventDateLabel } from "../lib/events";

function InviteRow({ slot, busy, respond }) {
  const event = slot.project;
  const info = event.eventInfo || {};
  const status = LINEUP_STATUS[slot.status];
  return (
    <li className="card flex flex-wrap items-center gap-4 p-4">
      <Flyer event={{ ...event, type: info.type }} className="h-[100px] w-20 flex-none rounded-xl" titleClass="text-[13px]" showKind={false} />
      <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1.5">
        <span className="text-base font-semibold">{event.name}</span>
        <span className="text-[13px] text-th-muted">
          Organizado por {event.owner?.name} · você como <b className="text-th-text2">{slot.role}</b>
          {slot.startTime ? ` às ${slot.startTime}` : ""}
        </span>
        <span className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-th-text2">
          <span className="flex items-center gap-1.5">
            <CalendarDays size={14} aria-hidden="true" /> {eventDateLabel(info.startsAt, info.endsAt)} · {countdown(info.startsAt)}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin size={14} aria-hidden="true" /> {info.venueName || "Local a definir"}
          </span>
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {slot.status !== "invited" && (
          <span className="text-[13px] font-semibold" style={{ color: status.color }}>
            {status.label === "Recusou" ? "Você recusou" : "Você confirmou"}
          </span>
        )}
        {slot.status !== "declined" && (
          <button type="button" className="btn-secondary min-h-[40px] text-sm" disabled={busy === slot.id} onClick={() => respond(slot, false)}>
            {slot.status === "confirmed" ? "Desistir" : "Recusar"}
          </button>
        )}
        {slot.status !== "confirmed" && (
          <button type="button" className="btn-primary min-h-[40px] text-sm" disabled={busy === slot.id} onClick={() => respond(slot, true)}>
            {slot.status === "declined" ? "Mudei de ideia: vou" : "Confirmar presença"}
          </button>
        )}
      </div>
    </li>
  );
}


// Lado do artista: convites para tocar em eventos de outras pessoas.
export default function LineupInvites() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [applications, setApplications] = useState([]);

  async function load() {
    try {
      setItems(await apiRequest("/events/lineup-invites"));
    } catch (err) {
      setError(err.message);
      setItems([]);
    }
  }

  useEffect(() => {
    load();
    apiRequest("/events/my-applications").then(setApplications).catch(() => {});
  }, []);

  async function respond(slot, accept) {
    setBusy(slot.id);
    setError("");
    try {
      await apiRequest(`/events/lineup-invites/${slot.id}/respond`, { method: "POST", body: { accept } });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  const now = Date.now();
  const upcoming = (items || []).filter((slot) => new Date(slot.project.eventInfo?.startsAt).getTime() >= now - 24 * 3600 * 1000);
  const past = (items || []).filter((slot) => !upcoming.includes(slot));

  return (
    <Page>
      <PageHeader title="Convites e inscrições" subtitle="Eventos em que alguém te colocou no line-up e as chamadas em que você se inscreveu." />
      <ErrorNote>{error}</ErrorNote>
      {!items && <SkeletonBlock className="h-32" />}
      {items?.length === 0 && applications.length === 0 && (
        <EmptyState
          icon={Mic2}
          title="Nenhum convite por enquanto"
          text="Quando alguém te chamar para o line-up de um evento, o convite aparece aqui."
          action={
            <Link to="/eventos" className="btn-secondary no-underline">
              Ver meus eventos
            </Link>
          }
        />
      )}
      {upcoming.length > 0 && (
        <ul className="flex flex-col gap-3">
          {upcoming.map((slot) => (
            <InviteRow key={slot.id} slot={slot} busy={busy} respond={respond} />
          ))}
        </ul>
      )}
      {past.length > 0 && (
        <section aria-labelledby="passados" className="flex flex-col gap-3">
          <h2 id="passados" className="text-base font-semibold text-th-text2">
            Já aconteceram
          </h2>
          <ul className="flex flex-col gap-3 opacity-80">
            {past.map((slot) => (
              <li key={slot.id} className="card flex items-center gap-3 p-3.5 text-sm">
                <span className="flex-1">
                  <b>{slot.project.name}</b> · {eventDateLabel(slot.project.eventInfo?.startsAt)}
                </span>
                <span style={{ color: LINEUP_STATUS[slot.status].color }}>{LINEUP_STATUS[slot.status].label}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {applications.length > 0 && (
        <section aria-labelledby="inscricoes" className="flex flex-col gap-3">
          <h2 id="inscricoes" className="text-lg font-semibold">
            Minhas inscrições
          </h2>
          <ul className="flex flex-col gap-2.5">
            {applications.map((item) => {
              const status = APPLICATION_STATUS[item.status];
              const info = item.project.eventInfo || {};
              return (
                <li key={item.id} className="card flex flex-wrap items-center gap-3 p-3.5 text-sm">
                  <span className="min-w-0 flex-1">
                    {info.published ? (
                      <Link to={`/e/${info.slug}`} className="font-semibold text-th-text">
                        {item.project.name}
                      </Link>
                    ) : (
                      <b>{item.project.name}</b>
                    )}
                    <span className="block text-th-muted">
                      {item.role} · {eventDateLabel(info.startsAt)}
                    </span>
                  </span>
                  <span className="font-semibold" style={{ color: status.color }}>
                    {item.status === "pending" ? "Aguardando a produção" : status.one}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </Page>
  );
}
