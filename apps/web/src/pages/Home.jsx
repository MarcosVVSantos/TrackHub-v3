import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Mail, MessageSquare, Mic2, Play, Pause, Columns3, UsersRound } from "lucide-react";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { usePlayer } from "../context/PlayerContext";
import { Page } from "../components/layout/AppShell";
import { Avatar, AvatarStack } from "../components/ui/Avatar";
import { StageBadge, StageBars } from "../components/ui/Stage";
import { EmptyState, ErrorNote, SkeletonBlock } from "../components/ui/States";
import { dayLabel, formatTime, greeting, hourLabel, joinNames, plural, timeAgo } from "../lib/format";
import { countdown, eventDateLabel, eventStageOf } from "../lib/events";
import Flyer from "../components/events/Flyer";

// Agenda de um evento abre no cronograma do evento; de uma faixa, na agenda do projeto.
const agendaLink = (project) => (project?.kind === "event" ? `/eventos/${project.id}?tab=cronograma` : `/projects/${project?.id}?tab=agenda`);

const GUIDE_KEY = "trackhub_guide_hidden";

function readGuideHidden() {
  try {
    return localStorage.getItem(GUIDE_KEY) === "1";
  } catch {
    return false;
  }
}

const STEPS = [
  { title: "Crie o projeto", text: "Nome, gênero e se é público ou privado." },
  { title: "Convide parceiros", text: "Cada um entra com uma função: beat, voz, mix." },
  { title: "Suba e comente versões", text: "v1, v2, v3, com comentário no segundo exato." },
  { title: "Finalize a faixa", text: "Mova para Finalizado e publique na comunidade." },
];

function Guide({ projectCount, onHide }) {
  const done = [projectCount > 0, false, false, false];
  return (
    <section aria-labelledby="guia" className="flex flex-col gap-4 rounded-2xl border border-th-line bg-th-surface px-6 py-5">
      <div className="flex items-center gap-3">
        <h2 id="guia" className="flex-1 text-base font-semibold">
          Como uma faixa nasce no TrackHub
        </h2>
        <button type="button" onClick={onHide} className="btn-ghost min-h-[36px] border border-th-line text-[13px]">
          Ocultar guia
        </button>
      </div>
      <ol className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex items-start gap-3">
            <span
              className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-[13px] font-bold ${
                done[index] ? "bg-stage-finished text-th-sidebar" : "bg-th-raised text-th-text"
              }`}
            >
              {index + 1}
              {done[index] && <span className="sr-only"> (feito)</span>}
            </span>
            <span>
              <span className="block text-sm font-semibold">{step.title}</span>
              <span className="block text-[13px] leading-snug text-th-muted">{step.text}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ActionRow({ tint, color, icon: Icon, title, text, children }) {
  return (
    <div className="flex flex-wrap items-center gap-3.5 rounded-[14px] border border-th-line bg-th-surface px-4 py-3.5">
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px]" style={{ background: tint, color }}>
        <Icon size={20} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 basis-56">
        <span className="block text-[15px] font-semibold">{title}</span>
        <span className="block text-[13px] text-th-muted">{text}</span>
      </span>
      <span className="flex flex-wrap gap-2">{children}</span>
    </div>
  );
}

function ProjectCard({ project, onPlay, playing }) {
  const latest = project.latest;
  const last = latest
    ? `${latest.versions?.[0]?.version || "v1"} enviada por ${latest.uploader?.name?.split(" ")[0] || "alguém"}`
    : "Ainda sem áudio";
  return (
    <div className="card-link relative flex flex-col gap-3.5 p-[18px]">
      <span className="flex items-center gap-2">
        <StageBadge status={project.status} />
        <span className="ml-auto text-xs text-th-muted">{timeAgo(project.updatedAt)}</span>
      </span>
      <Link to={`/projects/${project.id}`} className="text-th-text no-underline after:absolute after:inset-0 hover:text-th-text">
        <span className="block text-[17px] font-semibold">{project.name}</span>
        <span className="block text-[13px] text-th-muted">{last}</span>
      </Link>
      <StageBars status={project.status} />
      <span className="flex items-center">
        <AvatarStack users={project.team} />
        {latest && (
          <button
            type="button"
            onClick={() => onPlay(project)}
            aria-label={playing ? `Pausar ${project.name}` : `Tocar a versão mais recente de ${project.name}`}
            className="relative z-10 ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-th-text text-th-bg transition hover:bg-white"
          >
            {playing ? <Pause size={15} fill="currentColor" aria-hidden="true" /> : <Play size={15} fill="currentColor" aria-hidden="true" />}
          </button>
        )}
      </span>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const player = usePlayer();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [guideHidden, setGuideHidden] = useState(readGuideHidden);
  const [events, setEvents] = useState([]);
  const [gigs, setGigs] = useState([]);

  async function load() {
    // Eventos ficam fora do /home para não atrasar o resto da tela; se falharem, o bloco só não aparece.
    apiRequest("/events?when=upcoming").then((list) => setEvents(list.slice(0, 3))).catch(() => {});
    apiRequest("/events/lineup-invites")
      .then((list) => setGigs(list.filter((item) => item.status === "invited")))
      .catch(() => {});
    try {
      setData(await apiRequest("/home"));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function hideGuide() {
    setGuideHidden(true);
    try {
      localStorage.setItem(GUIDE_KEY, "1");
    } catch {
      // Sem armazenamento local: o guia volta na próxima visita.
    }
  }

  async function answerGig(slot, accept) {
    setBusy(slot.id);
    try {
      await apiRequest(`/events/lineup-invites/${slot.id}/respond`, { method: "POST", body: { accept } });
      setGigs((list) => list.filter((item) => item.id !== slot.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function answerInvite(invite, accept) {
    setBusy(invite.id);
    try {
      await apiRequest(`/projects/invites/${invite.id}/${accept ? "accept" : "decline"}`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  function playProject(project) {
    if (player.current?.id === project.latest.id) {
      player.togglePlay();
      return;
    }
    player.playTrack({
      id: project.latest.id,
      title: project.name,
      subtitle: `${project.latest.versions?.[0]?.version || "v1"} · ${project.latest.uploader?.name || ""}`,
      audioUrl: project.latest.url,
      coverUrl: project.coverUrl,
      projectId: project.id,
    });
  }

  const firstName = user?.name?.split(" ")[0] || "";
  const actions = data ? data.invites.length + data.comments.length + data.today.length + gigs.length : 0;

  return (
    <Page>
      <div>
        <h1 className="text-[28px] font-bold tracking-tight sm:text-[32px]">
          {greeting()}, {firstName}
        </h1>
        <p className="mt-1.5 text-base text-th-text2">
          {!data
            ? "Carregando o seu dia…"
            : actions
              ? `${plural(actions, "coisa pede", "coisas pedem")} sua atenção hoje.`
              : "Tudo em dia por aqui."}
        </p>
      </div>

      <ErrorNote>{error}</ErrorNote>

      {!guideHidden && <Guide projectCount={data?.counts?.projects || 0} onHide={hideGuide} />}

      <div className="flex flex-wrap items-start gap-8">
        <div className="flex min-w-0 flex-[999_1_480px] flex-col gap-8">
          <section aria-labelledby="atencao" className="flex flex-col gap-3.5">
            <h2 id="atencao" className="text-lg font-semibold">
              Precisa de você
            </h2>
            {!data && [1, 2].map((key) => <SkeletonBlock key={key} className="h-[72px]" />)}
            {data && actions === 0 && (
              <p className="rounded-[14px] border border-th-line px-4 py-4 text-sm text-th-muted">
                Nenhum convite, comentário ou sessão pendente. Que tal subir uma versão nova?
              </p>
            )}
            {data?.invites.map((invite) => (
              <ActionRow
                key={invite.id}
                icon={Mail}
                tint="#262A3A"
                color="#AEB9DE"
                title={`${invite.invitedBy?.name || "Alguém"} te convidou para “${invite.project?.name}”`}
                text={invite.roleLabel ? `Função proposta: ${invite.roleLabel}` : `Papel: ${invite.role === "viewer" ? "ouvinte" : "editor"}`}
              >
                <button type="button" disabled={busy === invite.id} onClick={() => answerInvite(invite, false)} className="btn-secondary min-h-[40px] text-sm">
                  Recusar
                </button>
                <button type="button" disabled={busy === invite.id} onClick={() => answerInvite(invite, true)} className="btn-primary min-h-[40px] text-sm">
                  Aceitar
                </button>
              </ActionRow>
            ))}
            {data &&
              gigs.map((slot) => (
                <ActionRow
                  key={slot.id}
                  icon={Mic2}
                  tint="#3A2F22"
                  color="#E9B872"
                  title={`${slot.project.owner?.name || "Alguém"} te chamou para tocar em “${slot.project.name}”`}
                  text={[slot.role, slot.startTime && `às ${slot.startTime}`, eventDateLabel(slot.project.eventInfo?.startsAt)].filter(Boolean).join(" · ")}
                >
                  <button type="button" disabled={busy === slot.id} onClick={() => answerGig(slot, false)} className="btn-secondary min-h-[40px] text-sm">
                    Recusar
                  </button>
                  <button type="button" disabled={busy === slot.id} onClick={() => answerGig(slot, true)} className="btn-primary min-h-[40px] text-sm">
                    Confirmar
                  </button>
                </ActionRow>
              ))}
            {data?.comments.map((group) => (
              <ActionRow
                key={group.fileId}
                icon={MessageSquare}
                tint="#2B2236"
                color="#D49AE6"
                title={`${plural(group.count, "comentário novo", "comentários novos")} na ${group.version} de “${group.projectName}”`}
                text={
                  group.times.length
                    ? `${joinNames(group.people)} marcaram trechos em ${group.times.map(formatTime).join(", ")}`
                    : `De ${joinNames(group.people)}`
                }
              >
                <Link to={`/projects/${group.projectId}?file=${group.fileId}`} className="btn-primary min-h-[40px] text-sm no-underline hover:text-th-bg">
                  Ouvir e responder
                </Link>
              </ActionRow>
            ))}
            {data?.today.map((event) => (
              <ActionRow
                key={event.id}
                icon={CalendarDays}
                tint="#4A3520"
                color="#E9B872"
                title={`${event.title} hoje às ${hourLabel(event.startsAt)}`}
                text={event.project?.name}
              >
                <Link to={agendaLink(event.project)} className="btn-primary min-h-[40px] text-sm no-underline hover:text-th-bg">
                  Ver detalhes
                </Link>
              </ActionRow>
            ))}
          </section>

          <section aria-labelledby="continue" className="flex flex-col gap-3.5">
            <div className="flex items-baseline gap-3">
              <h2 id="continue" className="flex-1 text-lg font-semibold">
                Continue de onde parou
              </h2>
              <Link to="/projects" className="text-sm">
                Ver todos os projetos
              </Link>
            </div>
            {!data && <SkeletonBlock className="h-44" />}
            {data && data.continue.length === 0 && (
              <EmptyState
                icon={Columns3}
                title="Seu primeiro projeto começa aqui"
                text="Crie um projeto, suba um beat ou uma guia e convide quem vai colaborar."
                action={
                  <Link to="/projects?novo=1" className="btn-primary no-underline hover:text-th-bg">
                    Criar projeto
                  </Link>
                }
              />
            )}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3.5">
              {data?.continue.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onPlay={playProject}
                  playing={player.isPlaying && player.current?.id === project.latest?.id}
                />
              ))}
            </div>
          </section>
        </div>

        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-6">
          {events.length > 0 && (
            <section aria-labelledby="eventos" className="card flex flex-col gap-3.5">
              <div className="flex items-baseline">
                <h2 id="eventos" className="flex-1 text-base font-semibold">
                  Seus próximos eventos
                </h2>
                <Link to="/eventos" className="text-[13px]">
                  Ver todos
                </Link>
              </div>
              <ul className="flex flex-col gap-3">
                {events.map((event) => {
                  const stage = eventStageOf(event.status);
                  const { total, confirmed } = event.lineup;
                  return (
                    <li key={event.id}>
                      <Link to={`/eventos/${event.id}`} className="flex items-center gap-3 text-th-text no-underline hover:text-th-text">
                        <Flyer event={event} className="h-14 w-11 flex-none rounded-lg" titleClass="text-[8px]" showKind={false} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{event.name}</span>
                          <span className="block truncate text-xs text-th-muted">
                            {eventDateLabel(event.eventInfo?.startsAt)} · {countdown(event.eventInfo?.startsAt)}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-th-text2">
                            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: stage.color }} />
                            {stage.label} · {total ? `${confirmed}/${total} no line-up` : "line-up vazio"}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section aria-labelledby="agenda" className="card flex flex-col gap-3.5">
            <div className="flex items-baseline">
              <h2 id="agenda" className="flex-1 text-base font-semibold">
                Próximos na agenda
              </h2>
              <Link to="/calendar" className="text-[13px]">
                Abrir agenda
              </Link>
            </div>
            {data && data.agenda.length === 0 && <p className="text-sm text-th-muted">Nenhuma sessão marcada.</p>}
            <ul className="flex flex-col gap-3">
              {data?.agenda.map((event) => (
                <li key={event.id} className="flex items-center gap-3">
                  <span className="flex w-12 flex-none flex-col items-center rounded-[10px] bg-th-raised py-1.5">
                    <span className="text-[11px] font-semibold uppercase text-th-lilac">{dayLabel(event.startsAt)}</span>
                    <span className="text-[15px] font-bold">{hourLabel(event.startsAt)}</span>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{event.title}</span>
                    <span className="block truncate text-xs text-th-muted">{event.project?.name}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="sugeridos" className="card flex flex-col gap-3.5">
            <div>
              <h2 id="sugeridos" className="text-base font-semibold">
                Parceiros para o seu som
              </h2>
              <p className="mt-1 text-[13px] text-th-muted">Pessoas abertas a colaborar, com gêneros dos seus projetos.</p>
            </div>
            {data && data.suggestions.length === 0 && (
              <p className="text-sm text-th-muted">Ninguém por perto ainda. Veja quem está aberto a colaborar.</p>
            )}
            <ul className="flex flex-col gap-3">
              {data?.suggestions.map((person) => (
                <li key={person.id} className="flex items-center gap-3">
                  <Avatar user={person} />
                  <span className="min-w-0 flex-1">
                    <Link to={`/profile/${person.username}`} className="block truncate text-sm font-semibold text-th-text">
                      {person.name}
                    </Link>
                    <span className="block truncate text-xs text-th-muted">
                      {[person.role, person.genres.join(", ")].filter(Boolean).join(" · ") || `@${person.username}`}
                    </span>
                  </span>
                  <Link to={`/explore?convidar=${person.id}`} className="btn-secondary min-h-[36px] px-3 text-[13px] no-underline">
                    Convidar
                  </Link>
                </li>
              ))}
            </ul>
            <Link to="/explore" className="flex items-center gap-1.5 text-[13px]">
              <UsersRound size={14} aria-hidden="true" /> Ver mais parceiros
            </Link>
          </section>
        </div>
      </div>
    </Page>
  );
}
