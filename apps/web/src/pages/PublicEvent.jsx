import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CalendarDays, ExternalLink, MapPin, Share2 } from "lucide-react";
import { apiRequest } from "../api/client";
import PublicShell from "../components/events/PublicShell";
import Flyer from "../components/events/Flyer";
import { Avatar } from "../components/ui/Avatar";
import { SkeletonBlock } from "../components/ui/States";
import { APPLICATION_STATUS, countdown, eventTypeOf, publicEventUrl } from "../lib/events";

function longDate(iso) {
  return new Date(iso)
    .toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })
    .replace(/^\w/, (c) => c.toUpperCase());
}

function hourRange(startsAt, endsAt) {
  const hour = (date) => {
    const value = new Date(date);
    const m = value.getMinutes();
    return m ? `${value.getHours()}h${String(m).padStart(2, "0")}` : `${value.getHours()}h`;
  };
  return endsAt ? `${hour(startsAt)} às ${hour(endsAt)}` : hour(startsAt);
}

function CallSection({ event, slug }) {
  const info = event.eventInfo;
  const viewer = event.viewer;
  const deadline = info.callDeadline ? new Date(info.callDeadline).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "";
  const application = viewer?.application;
  const status = application ? APPLICATION_STATUS[application.status] : null;

  let action;
  if (viewer?.isTeam) {
    action = <p className="text-[15px] font-semibold text-[#4A4452]">Você faz parte da equipe deste evento.</p>;
  } else if (application) {
    action = (
      <p className="rounded-2xl bg-th-bg px-6 py-4 text-[15px] font-semibold text-white">
        Inscrição enviada · {application.status === "pending" ? "aguardando a produção" : status.one.toLowerCase()}
      </p>
    );
  } else {
    action = (
      <Link to={`/e/${slug}/inscricao`} className="flex min-h-[60px] items-center gap-2.5 rounded-2xl bg-th-bg px-8 text-lg font-bold text-white no-underline hover:bg-black hover:text-white">
        Quero me inscrever
      </Link>
    );
  }

  return (
    <section aria-labelledby="pub-chamada" className="px-6 py-16">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-end gap-8 rounded-[32px] bg-th-text p-8 text-th-bg sm:p-14">
        <div className="flex flex-[1_1_420px] flex-col gap-3.5">
          <p className="font-mono text-[13px] tracking-[0.06em] text-[#5C5566]">CHAMADA ABERTA</p>
          <h2 id="pub-chamada" className="text-[clamp(2rem,4.5vw,3.5rem)] font-extrabold leading-none tracking-tight">
            Quer se apresentar? Inscreva-se{deadline ? ` até ${deadline}` : ""}.
          </h2>
          <p className="max-w-[34rem] text-[17px] leading-relaxed text-[#4A4452]">
            {info.callSlots ? `${info.callSlots} vagas. ` : ""}Mande uma amostra do seu som e uma mensagem curta: a produção responde por notificação no TrackHub.
          </p>
        </div>
        {action}
      </div>
    </section>
  );
}

// Página aberta do evento: qualquer pessoa com o link vê, sem login.
export default function PublicEvent() {
  const { slug } = useParams();
  const [event, setEvent] = useState(null);
  const [missing, setMissing] = useState(false);
  const [shared, setShared] = useState("");

  useEffect(() => {
    apiRequest(`/public/events/${encodeURIComponent(slug)}`)
      .then((data) => {
        setEvent(data);
        document.title = `${data.name} · TrackHub`;
      })
      .catch(() => setMissing(true));
    return () => {
      document.title = "TrackHub";
    };
  }, [slug]);

  async function share() {
    const url = publicEventUrl(slug);
    try {
      if (navigator.share) {
        await navigator.share({ title: event.name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShared("Link copiado.");
    } catch {
      // A pessoa fechou o compartilhamento: nada a fazer.
    }
  }

  if (missing) {
    return (
      <PublicShell>
        <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-6 py-24 text-center">
          <h1 className="text-3xl font-bold">Evento não encontrado</h1>
          <p className="text-th-text2">O link pode estar errado, ou a produção ainda não publicou a página.</p>
          <Link to="/" className="btn-secondary no-underline">
            Conhecer o TrackHub
          </Link>
        </div>
      </PublicShell>
    );
  }

  if (!event) {
    return (
      <PublicShell>
        <div className="mx-auto flex max-w-[1200px] flex-wrap gap-12 px-6 py-14">
          <SkeletonBlock className="aspect-[4/5] w-full max-w-[460px]" />
          <SkeletonBlock className="h-64 flex-1" />
        </div>
      </PublicShell>
    );
  }

  const info = event.eventInfo;
  const type = eventTypeOf(info.type);
  const ticketHost = info.ticketUrl ? new URL(info.ticketUrl).hostname.replace(/^www\./, "") : "";

  return (
    <PublicShell>
      <section aria-labelledby="pub-nome" className="mx-auto flex max-w-[1200px] flex-wrap items-start gap-12 px-6 py-14">
        <div className="w-full max-w-[460px] flex-[1_1_340px]">
          <Flyer
            event={event}
            className="aspect-[4/5] w-full rounded-[28px]"
            titleClass="text-[clamp(2.5rem,6vw,4.25rem)]"
            kindLabel={`${type.label} · ${new Date(info.startsAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`}
          />
        </div>

        <div className="flex flex-[1_1_420px] flex-col gap-5">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-xl bg-th-raised px-3 py-1 text-[13px] font-semibold text-th-text2">{type.label}</span>
            {event.callOpenNow && (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#2B2236] px-3 py-1 text-[13px] font-semibold text-[#E6CCEE]">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-th-lilac" />
                Inscrições abertas
              </span>
            )}
          </div>
          <h1 id="pub-nome" className="break-words text-[clamp(2.5rem,5vw,4rem)] font-extrabold leading-none tracking-tight">
            {event.name}
          </h1>
          <dl className="flex flex-col gap-3.5">
            <div className="flex items-start gap-3.5">
              <dt className="sr-only">Data</dt>
              <CalendarDays size={22} aria-hidden="true" className="mt-0.5 flex-none text-th-lilac" />
              <dd className="flex flex-col gap-0.5">
                <span className="text-lg font-semibold">{longDate(info.startsAt)}</span>
                <span className="text-[15px] text-th-text2">
                  {hourRange(info.startsAt, info.endsAt)} · {countdown(info.startsAt).toLowerCase()}
                </span>
              </dd>
            </div>
            {(info.venueName || info.venueAddress) && (
              <div className="flex items-start gap-3.5">
                <dt className="sr-only">Local</dt>
                <MapPin size={22} aria-hidden="true" className="mt-0.5 flex-none text-th-lilac" />
                <dd className="flex flex-col gap-0.5">
                  {info.venueName && <span className="text-lg font-semibold">{info.venueName}</span>}
                  {info.venueAddress && <span className="text-[15px] text-th-text2">{info.venueAddress}</span>}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(info.venueAddress || info.venueName)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 text-[15px]"
                  >
                    Ver no mapa ↗
                  </a>
                </dd>
              </div>
            )}
          </dl>
          {event.description && <p className="max-w-xl whitespace-pre-line text-[15px] leading-relaxed text-th-text2">{event.description}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            {info.ticketUrl && (
              <a href={info.ticketUrl} target="_blank" rel="noopener noreferrer" className="btn-primary min-h-[56px] rounded-[14px] px-7 text-[17px] font-bold no-underline hover:text-th-bg">
                Comprar ingresso <ExternalLink size={18} aria-hidden="true" />
              </a>
            )}
            <button type="button" className="btn-secondary min-h-[56px] rounded-[14px]" onClick={share}>
              <Share2 size={18} aria-hidden="true" /> Compartilhar
            </button>
            <span role="status" className="text-sm text-stage-finished">
              {shared}
            </span>
          </div>
          {info.ticketUrl && <p className="text-[13px] text-th-muted">A compra acontece em {ticketHost}, fora do TrackHub.</p>}
        </div>
      </section>

      {event.lineup.length > 0 && (
        <section aria-labelledby="pub-lineup" className="border-t border-th-line bg-th-sidebar">
          <div className="mx-auto flex max-w-[1200px] flex-wrap gap-10 px-6 py-16">
            <div className="flex flex-[1_1_260px] flex-col gap-3">
              <p className="font-mono text-[13px] tracking-[0.06em] text-th-muted">LINE-UP</p>
              <h2 id="pub-lineup" className="text-[clamp(2rem,4vw,3rem)] font-extrabold leading-[1.05] tracking-tight">
                Quem sobe no palco
              </h2>
              <p className="text-[15px] leading-relaxed text-th-text2">Quem tem conta no TrackHub tem o nome ligado ao perfil.</p>
            </div>
            <ol className="flex flex-[2_1_560px] flex-col gap-1">
              {event.lineup.map((slot) => (
                <li key={slot.id} className="flex items-center gap-4 rounded-2xl p-3 hover:bg-[#221F28]">
                  <span className="w-[60px] font-mono text-lg font-semibold">{slot.startTime || ""}</span>
                  <Avatar user={slot.user || { id: slot.id, name: slot.name }} size="lg" />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    {slot.user ? (
                      <Link to={`/profile/${slot.user.username}`} className="truncate text-[19px] font-bold text-th-text no-underline hover:text-th-text hover:underline">
                        {slot.name}
                      </Link>
                    ) : (
                      <span className="truncate text-[19px] font-bold">{slot.name}</span>
                    )}
                    <span className="text-sm text-th-muted">{[slot.user && `@${slot.user.username}`, slot.role].filter(Boolean).join(" · ")}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {event.callOpenNow && <CallSection event={event} slug={slug} />}
    </PublicShell>
  );
}
