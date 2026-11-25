import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Check, ChevronLeft } from "lucide-react";
import { apiRequest } from "../api/client";
import { useAuth } from "../context/AuthContext";
import PublicShell from "../components/events/PublicShell";
import Flyer from "../components/events/Flyer";
import { ErrorNote, SkeletonBlock } from "../components/ui/States";
import { Avatar } from "../components/ui/Avatar";
import { APPLICATION_STATUS, LINEUP_ROLES, eventDateLabel } from "../lib/events";

const STEPS = ["Entrar", "Sua inscrição", "Enviada"];

function Steps({ current }) {
  return (
    <ol aria-label="Etapas da inscrição" className="flex gap-2">
      {STEPS.map((label, index) => (
        <li key={label} aria-current={index === current ? "step" : undefined} className="flex flex-1 flex-col gap-2">
          <span className="h-1 rounded-sm" style={{ background: index <= current ? "#D9B8E3" : "#2C2833" }} />
          <span className={`text-[13px] ${index === current ? "font-bold" : "font-medium"} ${index <= current ? "text-th-text" : "text-th-muted"}`}>{label}</span>
        </li>
      ))}
    </ol>
  );
}

const MESSAGE_MAX = 280;

// Inscrição de artista na chamada aberta. Precisa de conta: assim cada pessoa
// se inscreve uma vez só e a produção tem um perfil para conhecer.
export default function PublicApply() {
  const { slug } = useParams();
  const location = useLocation();
  const { user, loading } = useAuth() || {};
  const [event, setEvent] = useState(null);
  const [missing, setMissing] = useState(false);
  const [form, setForm] = useState(null);
  const [sample, setSample] = useState("");
  const [tried, setTried] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (loading) return;
    apiRequest(`/public/events/${encodeURIComponent(slug)}`)
      .then((data) => {
        setEvent(data);
        const firstTrack = data.viewer?.tracks?.[0]?.id || "";
        setSample(firstTrack ? `track:${firstTrack}` : "link");
      })
      .catch(() => setMissing(true));
  }, [slug, loading, user?.id]);

  useEffect(() => {
    if (user && !form) {
      setForm({ artistName: user.name || "", role: user.role || "", city: user.city || "", link: "", message: "", accept: false });
    }
  }, [user, form]);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setTried(true);
    setError("");
    if (!form.accept) return;
    const body = {
      artistName: form.artistName.trim(),
      role: form.role.trim(),
      city: form.city.trim(),
      message: form.message.trim(),
      acceptRules: true,
      ...(sample.startsWith("track:") ? { trackId: sample.slice(6) } : { sampleUrl: form.link.trim() }),
    };
    setSending(true);
    try {
      await apiRequest(`/public/events/${encodeURIComponent(slug)}/apply`, { method: "POST", body });
      setSent(true);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  const back = (
    <Link to={`/e/${slug}`} className="btn-ghost no-underline">
      <ChevronLeft size={18} aria-hidden="true" /> Voltar ao evento
    </Link>
  );

  if (missing) {
    return (
      <PublicShell back={back}>
        <div className="mx-auto max-w-xl px-6 py-24 text-center">
          <h1 className="text-3xl font-bold">Evento não encontrado</h1>
        </div>
      </PublicShell>
    );
  }

  const info = event?.eventInfo;
  const deadline = info?.callDeadline ? new Date(info.callDeadline).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "";
  const existing = event?.viewer?.application;
  const step = sent || existing ? 2 : user ? 1 : 0;

  let content;
  if (!event || loading) {
    content = <SkeletonBlock className="h-80" />;
  } else if (!user) {
    content = (
      <div className="flex max-w-[440px] flex-col gap-3.5">
        <h1 id="ins-titulo" className="text-[30px] font-extrabold tracking-tight">
          Entre para se inscrever
        </h1>
        <p className="text-[15px] leading-relaxed text-th-text2">Seu perfil do TrackHub já preenche quase tudo. É rápido, e dá para entrar com o Google.</p>
        <Link to="/login" state={{ from: location.pathname }} className="btn-primary min-h-[52px] text-base no-underline hover:text-th-bg">
          Entrar
        </Link>
        <Link to="/register" state={{ from: location.pathname }} className="btn-secondary min-h-[52px] text-base no-underline">
          Criar conta grátis
        </Link>
      </div>
    );
  } else if (sent || existing) {
    const status = existing ? APPLICATION_STATUS[existing.status] : null;
    content = (
      <div role="status" className="card flex flex-col items-start gap-4 rounded-3xl p-10">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-stage-finished text-[#08261A]">
          <Check size={30} aria-hidden="true" strokeWidth={3} />
        </span>
        <h1 id="ins-titulo" className="text-[30px] font-extrabold tracking-tight">
          {sent ? "Inscrição enviada." : `Você já se inscreveu${status && existing.status !== "pending" ? ` · ${status.one.toLowerCase()}` : ""}.`}
        </h1>
        <p className="max-w-[32rem] text-base leading-relaxed text-th-text2">
          Você recebe a resposta por notificação no TrackHub. Enquanto isso, deixe seu perfil caprichado: é ele que a produção vai abrir.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <Link to={`/e/${slug}`} className="btn-primary no-underline hover:text-th-bg">
            Voltar para o evento
          </Link>
          <Link to="/eventos/convites" className="btn-secondary no-underline">
            Minhas inscrições
          </Link>
        </div>
      </div>
    );
  } else if (event.viewer?.isTeam) {
    content = <p className="text-th-text2">Você faz parte da equipe deste evento, então não precisa se inscrever.</p>;
  } else if (!event.callOpenNow) {
    content = (
      <div className="flex flex-col gap-3">
        <h1 id="ins-titulo" className="text-[30px] font-extrabold tracking-tight">
          Inscrições encerradas
        </h1>
        <p className="text-th-text2">A chamada deste evento não está recebendo inscrições agora.</p>
      </div>
    );
  } else if (form) {
    const tracks = event.viewer?.tracks || [];
    const invalid = tried && !form.accept;
    content = (
      <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
        <div className="flex flex-col gap-1.5">
          <h1 id="ins-titulo" className="text-[30px] font-extrabold tracking-tight">
            Sua inscrição
          </h1>
          <p className="text-[15px] text-th-text2">Revise seus dados, escolha uma amostra e mande um recado para a produção.</p>
        </div>

        <fieldset className="card flex flex-col gap-3.5 p-[18px]">
          <legend className="sr-only">Seus dados</legend>
          <div className="flex items-center gap-3">
            <Avatar user={user} size="lg" />
            <span className="flex flex-1 flex-col gap-0.5">
              <b className="text-base">Seus dados</b>
              <span className="text-[13px] text-th-muted">Vieram do seu perfil. Alterar aqui não muda o perfil.</span>
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-th-text2">
              Nome artístico
              <input className="input" required maxLength={80} value={form.artistName} onChange={set("artistName")} />
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-th-text2">
              Função
              <input className="input" list="apply-roles" required maxLength={40} value={form.role} onChange={set("role")} placeholder="MC" />
              <datalist id="apply-roles">
                {LINEUP_ROLES.map((role) => (
                  <option key={role} value={role} />
                ))}
              </datalist>
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-th-text2">
              Cidade
              <input className="input" maxLength={80} value={form.city} onChange={set("city")} />
            </label>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2.5 text-[15px] font-semibold text-th-text">Amostra do seu som</legend>
          <div role="radiogroup" aria-label="Escolha a amostra" className="flex flex-col gap-2">
            {tracks.map((track) => {
              const value = `track:${track.id}`;
              return (
                <label
                  key={track.id}
                  className={`flex min-h-[56px] cursor-pointer items-center gap-3 rounded-[14px] border px-3.5 ${sample === value ? "border-th-lilac bg-th-surface" : "border-th-line"}`}
                >
                  <input type="radio" name="sample" value={value} checked={sample === value} onChange={() => setSample(value)} className="h-5 w-5 accent-[#D9B8E3]" />
                  <span className="flex-1">
                    <span className="block text-[15px] font-semibold">{track.title}</span>
                    <span className="block text-xs text-th-muted">Faixa pública do seu perfil</span>
                  </span>
                </label>
              );
            })}
            <label className={`flex min-h-[56px] cursor-pointer items-center gap-3 rounded-[14px] border px-3.5 py-2 ${sample === "link" ? "border-th-lilac bg-th-surface" : "border-th-line"}`}>
              <input type="radio" name="sample" value="link" checked={sample === "link"} onChange={() => setSample("link")} className="h-5 w-5 accent-[#D9B8E3]" />
              <span className="flex flex-1 flex-col gap-1.5">
                <span className="text-[15px] font-semibold">Link de uma amostra</span>
                {sample === "link" && (
                  <input
                    type="url"
                    inputMode="url"
                    className="input"
                    aria-label="Link da amostra"
                    maxLength={500}
                    value={form.link}
                    onChange={set("link")}
                    placeholder="https://soundcloud.com/… ou YouTube, Instagram"
                  />
                )}
              </span>
            </label>
          </div>
          {tracks.length === 0 && <p className="text-xs text-th-muted">Dica: faixas que você publica no TrackHub aparecem aqui para escolher.</p>}
        </fieldset>

        <div className="flex flex-col gap-2">
          <label htmlFor="ins-msg" className="text-[15px] font-semibold">
            Mensagem para a produção
          </label>
          <textarea id="ins-msg" rows={3} className="input min-h-[96px]" maxLength={MESSAGE_MAX} aria-describedby="ins-msg-ajuda" value={form.message} onChange={set("message")} />
          <span id="ins-msg-ajuda" className="text-xs text-th-muted">
            Curta e direta. {form.message.length} de {MESSAGE_MAX} caracteres.
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-[15px]">
            <input type="checkbox" checked={form.accept} onChange={set("accept")} aria-invalid={invalid} aria-describedby={invalid ? "ins-erro" : undefined} className="h-[22px] w-[22px] accent-[#7ED6A2]" />
            <span>Li as informações do evento e aceito que a produção veja meu perfil e minha amostra</span>
          </label>
          {invalid && (
            <p id="ins-erro" role="alert" className="text-sm text-[#F2A7A0]">
              Para enviar, marque a caixa acima.
            </p>
          )}
        </div>

        <ErrorNote>{error}</ErrorNote>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn-primary min-h-[52px] px-7 text-base" disabled={sending}>
            {sending ? "Enviando…" : "Enviar inscrição"}
          </button>
          {deadline && <span className="text-[13px] text-th-muted">Inscrições até {deadline}.</span>}
        </div>
      </form>
    );
  }

  return (
    <PublicShell back={back}>
      <div className="mx-auto flex w-full max-w-[1120px] flex-wrap items-start gap-10 px-6 pb-16 pt-10">
        {event && (
          <aside aria-label="Evento" className="card flex max-w-[340px] flex-[1_1_280px] flex-col gap-3.5 rounded-[20px] p-[18px]">
            <Flyer event={event} className="h-[200px] w-full rounded-[14px]" titleClass="text-[30px]" showKind={false} />
            <h2 className="text-xl font-bold">{event.name}</h2>
            <span className="text-sm text-th-text2">
              {eventDateLabel(info.startsAt)}
              {info.venueName && (
                <>
                  <br />
                  {info.venueName}
                </>
              )}
            </span>
            {(deadline || info.callSlots) && (
              <span className="self-start rounded-[10px] bg-[#2B2236] px-2.5 py-1 text-[13px] font-semibold text-[#E6CCEE]">
                {[deadline && `Inscrições até ${deadline}`, info.callSlots && `${info.callSlots} vagas`].filter(Boolean).join(" · ")}
              </span>
            )}
          </aside>
        )}
        <section aria-labelledby="ins-titulo" className="flex min-w-0 flex-[999_1_480px] flex-col gap-6">
          <Steps current={step} />
          {content}
        </section>
      </div>
    </PublicShell>
  );
}
