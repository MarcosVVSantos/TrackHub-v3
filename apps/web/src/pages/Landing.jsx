import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

// Landing page (versão do design novo). As seções seguem a "estrutura de uma música":
// intro, verso, refrão, ponte e outro, cada uma com o tempo da faixa no topo.
const MONO = { fontFamily: "ui-monospace, 'JetBrains Mono', SFMono-Regular, Menlo, Consolas, monospace" };

const MARKERS = [
  { at: 0.19, i: "LA", bg: "#D49AE6", name: "Lia · voz", time: "0:42", text: "Tentei uma dobra aqui, vê se não ficou pesado." },
  { at: 0.38, i: "JM", bg: "#E9B872", name: "Jota · beat", time: "1:24", text: "O baixo tá embolando com o bumbo no refrão." },
  { at: 0.62, i: "NV", bg: "#7ED6A2", name: "Nina · mix", time: "2:17", text: "Abri espaço pra voz aqui. Bora fechar a master?" },
];
const STAGES = [
  ["Ideia", "#AEB9DE"],
  ["Em andamento", "#E9B872"],
  ["Produção", "#D49AE6"],
  ["Finalizado", "#7ED6A2"],
];
const WAVE = Array.from({ length: 72 }, (_, i) => Math.min(176, Math.round(26 + Math.abs(Math.sin(i * 0.41) * 90 + Math.sin(i * 0.13 + 2) * 50))));
const MINI_WAVE = Array.from({ length: 28 }, (_, i) => 14 + Math.round(Math.abs(Math.sin(i * 0.7) * 40)));
const clip = (left, width, label, color) => ({ left, width, label, color });
const LANES = [
  { i: "JM", bg: "#E9B872", role: "Beat", name: "Jota", clips: [clip(0, 34, "beat v1", "#E9B872"), clip(38, 56, "beat v2", "#E9B872")] },
  { i: "LA", bg: "#D49AE6", role: "Voz", name: "Lia", clips: [clip(14, 30, "guia", "#D49AE6"), clip(50, 44, "voz final", "#D49AE6")] },
  { i: "NV", bg: "#7ED6A2", role: "Mix", name: "Nina", clips: [clip(60, 36, "mix v1", "#7ED6A2")] },
];
const ROLES = ["Voz", "Beatmaker", "Produtor", "Compositor", "Mix e master", "Instrumentista"];

// Quem pediu "menos movimento" no sistema começa com a prévia parada.
const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function Timecode({ time, label, light = false }) {
  return (
    <p className="m-0 flex items-center gap-3 text-[13px] tracking-[0.06em]" style={{ ...MONO, color: light ? "#5C5566" : "#A39DAD" }}>
      <span style={{ color: light ? "#5B1669" : "#D9B8E3", fontWeight: light ? 600 : 400 }}>{time}</span>
      <span aria-hidden="true" className="h-px w-10" style={{ background: light ? "#CFCAD6" : "#3D3746" }} />
      {label}
    </p>
  );
}

function Initials({ i, bg, size = 34 }) {
  return (
    <span
      className="flex flex-none items-center justify-center rounded-full font-bold"
      style={{ width: size, height: size, background: bg, color: "#0E0D11", fontSize: size > 36 ? 13 : 11, border: "3px solid #1D1A22" }}
    >
      {i}
    </span>
  );
}

function Check() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7ED6A2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-none">
      <path d="m5 12 5 5 9-10" />
    </svg>
  );
}

function Arrow() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

const H2 = "m-0 text-[clamp(2rem,4vw,3.25rem)] font-extrabold leading-[1.04] tracking-[-0.035em]";
const TILE = "min-w-0 rounded-3xl border border-th-line bg-th-surface p-7 transition-colors hover:border-[#4A4058]";

export default function Landing() {
  const [progress, setProgress] = useState(0.28);
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());

  // A "prévia" anda sozinha, como uma faixa tocando.
  useEffect(() => {
    if (!playing) return undefined;
    const timer = setInterval(() => setProgress((value) => (value + 0.004 > 1 ? 0 : value + 0.004)), 120);
    return () => clearInterval(timer);
  }, [playing]);

  const view = useMemo(() => {
    let bubble = MARKERS[0];
    MARKERS.forEach((marker) => {
      if (progress >= marker.at) bubble = marker;
    });
    const seconds = Math.round(progress * 221);
    return { bubble, timecode: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` };
  }, [progress]);

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-th-bg text-th-text">
      <header className="border-b border-th-line">
        <nav aria-label="Principal" className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-8 gap-y-3 px-6 py-[18px]">
          <Link to="/" className="flex items-center gap-2.5 text-th-text hover:text-th-text">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-white text-th-bg">
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l11-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="17" cy="16" r="3" />
              </svg>
            </span>
            <span className="text-[19px] font-bold tracking-[-0.01em]">TrackHub</span>
            <span className="rounded-[10px] bg-[#2B2236] px-2 py-[3px] text-[11px] font-bold tracking-[0.12em] text-th-lilac">BETA</span>
          </Link>
          <span className="flex flex-auto flex-wrap gap-x-6 gap-y-1 text-[15px]">
            <a className="text-th-text2 hover:text-white" href="#como-funciona">Como funciona</a>
            <a className="text-th-text2 hover:text-white" href="#recursos">Recursos</a>
            <a className="text-th-text2 hover:text-white" href="#pra-quem">Pra quem é</a>
          </span>
          <span className="flex items-center gap-2">
            <Link to="/login" className="flex min-h-[44px] items-center rounded-[10px] px-4 text-[15px] text-th-text hover:bg-th-surface hover:text-th-text">
              Entrar
            </Link>
            <Link to="/register" className="flex min-h-[44px] items-center rounded-[10px] bg-white px-[18px] text-[15px] font-semibold text-th-bg hover:bg-[#E9E4EE] hover:text-th-bg">
              Criar conta grátis
            </Link>
          </span>
        </nav>
      </header>

      <main className="flex-1">
        {/* INTRO */}
        <section aria-labelledby="hero-titulo" className="mx-auto flex max-w-[1200px] flex-col gap-7 px-6 pb-10 pt-[72px]">
          <Timecode time="0:00" label="INTRO" />
          <h1 id="hero-titulo" className="m-0 max-w-[15ch] text-[clamp(2.75rem,7vw,6.25rem)] font-extrabold leading-[0.98] tracking-[-0.045em]">
            Toda faixa começa num rascunho. <span className="text-th-lilac">Termine a sua em parceria.</span>
          </h1>
          <p className="m-0 max-w-[40rem] text-[clamp(1.05rem,1.6vw,1.3rem)] leading-[1.55] text-th-text2">
            O TrackHub junta produtores e artistas no mesmo projeto: versões de áudio, comentários no segundo exato da música e cada etapa visível, do primeiro beat à master final.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/register" className="flex min-h-[56px] items-center gap-2.5 rounded-[14px] bg-white px-7 text-[17px] font-bold text-th-bg hover:bg-[#E9E4EE] hover:text-th-bg">
              Criar conta grátis <Arrow />
            </Link>
            <button
              type="button"
              onClick={() => setPlaying((value) => !value)}
              aria-pressed={playing}
              className="flex min-h-[56px] items-center gap-3 rounded-[14px] border border-th-line2 bg-transparent pl-2.5 pr-[22px] text-base font-medium text-th-text hover:bg-th-surface"
            >
              <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-th-line">
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24">
                  <path d={playing ? "M7 5h4v14H7zM13 5h4v14h-4z" : "M8 5v14l11-7z"} fill="#F4F2F6" />
                </svg>
              </span>
              {playing ? "Pausar a prévia" : "Ouvir a prévia"}
            </button>
          </div>
        </section>

        {/* Prévia animada */}
        <section aria-label="Prévia: uma faixa sendo feita em parceria" className="mx-auto max-w-[1200px] px-6 pb-24 pt-6">
          <div className="flex flex-col gap-[22px] rounded-[28px] border border-th-line bg-th-surface p-[clamp(20px,3vw,36px)]">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <span className="flex flex-col gap-0.5">
                <span className="text-xl font-bold">Noite em SP</span>
                <span className="text-[13px] text-th-muted">R&amp;B · 94 BPM · 3 parceiros</span>
              </span>
              <span className="ml-auto flex [&>*+*]:-ml-2">
                <Initials i="JM" bg="#E9B872" />
                <Initials i="LA" bg="#D49AE6" />
                <Initials i="NV" bg="#7ED6A2" />
              </span>
              <span className="text-sm text-th-text2" style={MONO}>
                {view.timecode} / 3:41
              </span>
            </div>

            <div aria-hidden="true" className="relative mt-[30px] flex h-[180px] items-center gap-0.5">
              {WAVE.map((height, index) => (
                <span
                  key={index}
                  className="min-w-0 flex-1 rounded-[3px]"
                  style={{ height, background: (index + 0.5) / WAVE.length < progress ? "#D49AE6" : "#3D3746" }}
                />
              ))}
              <span className="absolute -bottom-2 -top-2 w-[3px] rounded-sm bg-white" style={{ left: `${progress * 100}%` }} />
              {MARKERS.map((marker) => (
                <span
                  key={marker.i}
                  className="absolute -top-10 -translate-x-1/2 transition-opacity"
                  style={{ left: `${marker.at * 100}%`, opacity: progress >= marker.at ? 1 : 0.35 }}
                >
                  <Initials i={marker.i} bg={marker.bg} size={32} />
                </span>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-2">
              {STAGES.map(([label, color], index) => {
                const reached = progress >= index / 4;
                return (
                  <div key={label} className="flex flex-col gap-2">
                    <span className="h-1 rounded-sm" style={{ background: reached ? color : "#2C2833" }} />
                    <span className="text-[13px]" style={{ fontWeight: reached ? 600 : 400, color: reached ? "#F4F2F6" : "#6E6878" }}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex min-h-[76px] items-center gap-3.5 rounded-2xl border border-th-line bg-th-bg px-4 py-3.5" aria-live="off">
              <Initials i={view.bubble.i} bg={view.bubble.bg} size={40} />
              <span className="flex min-w-0 flex-col gap-1">
                <span className="flex items-center gap-2.5 text-sm">
                  <b className="font-semibold">{view.bubble.name}</b>
                  <span className="rounded-lg bg-th-line px-2 py-0.5 text-xs text-th-lilac" style={MONO}>
                    {view.bubble.time}
                  </span>
                </span>
                <span className="text-[15px] text-[#E6E3EA]">{view.bubble.text}</span>
              </span>
            </div>
          </div>
        </section>

        {/* VERSO · COMO FUNCIONA */}
        <section id="como-funciona" aria-labelledby="sessao-titulo" className="border-t border-th-line bg-[#0E0D11]">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-12 px-6 py-24">
            <div className="flex flex-[1_1_340px] flex-col gap-[22px]">
              <Timecode time="0:32" label="VERSO · COMO FUNCIONA" />
              <h2 id="sessao-titulo" className={H2}>
                Todo mundo na mesma sessão.
              </h2>
              <ol className="m-0 flex list-none flex-col gap-[18px] p-0">
                {[
                  ["Crie o projeto", "Dê um nome, escolha o gênero e se é público ou privado."],
                  ["Convide quem completa seu som", "Cada parceiro entra com uma função: beat, voz, mix e master."],
                  ["Suba versões, comente, finalize", "v1, v2, v3 com histórico completo, até a faixa ir para Finalizado."],
                ].map(([title, text], index) => (
                  <li key={title} className="flex gap-4">
                    <span className="flex-none pt-[3px] text-sm text-th-lilac" style={MONO}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="flex flex-col gap-1">
                      <b className="text-[17px] font-semibold">{title}</b>
                      <span className="text-[15px] leading-normal text-th-muted">{text}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div aria-hidden="true" className="flex min-w-0 flex-[1.3_1_420px] flex-col gap-2.5 rounded-3xl border border-th-line bg-th-surface p-5">
              <div className="flex justify-between pb-1.5 pl-[132px] text-[11px] text-[#6E6878]" style={MONO}>
                <span>0:00</span>
                <span>1:00</span>
                <span>2:00</span>
                <span>3:00</span>
              </div>
              <div className="relative flex flex-col gap-2.5">
                {LANES.map((lane) => (
                  <div key={lane.i} className="flex h-16 items-center gap-3">
                    <span className="flex w-[120px] flex-none items-center gap-2.5">
                      <Initials i={lane.i} bg={lane.bg} size={32} />
                      <span className="flex flex-col">
                        <span className="text-[13px] font-semibold">{lane.role}</span>
                        <span className="text-[11px] text-th-muted">{lane.name}</span>
                      </span>
                    </span>
                    <span className="relative h-full flex-1 rounded-[10px] bg-th-bg">
                      {lane.clips.map((item) => (
                        <span
                          key={item.label}
                          className="absolute bottom-2 top-2 box-border flex items-center overflow-hidden rounded-lg px-2.5 text-[11px]"
                          style={{ ...MONO, left: `${item.left}%`, width: `${item.width}%`, background: `${item.color}33`, border: `1px solid ${item.color}`, color: item.color }}
                        >
                          {item.label}
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
                <span className="absolute -bottom-1 -top-1 w-0.5 bg-white" style={{ left: `calc(132px + (100% - 132px) * ${progress})` }} />
              </div>
            </div>
          </div>
        </section>

        {/* REFRÃO · RECURSOS */}
        <section id="recursos" aria-labelledby="recursos-titulo" className="mx-auto flex max-w-[1200px] flex-col gap-10 px-6 py-24">
          <div className="flex max-w-[46rem] flex-col gap-[18px]">
            <Timecode time="1:04" label="REFRÃO · RECURSOS" />
            <h2 id="recursos-titulo" className={H2}>
              Tudo o que a faixa precisa, num lugar só.
            </h2>
          </div>

          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
            <article className={`${TILE} flex flex-wrap items-center gap-6 md:col-span-2`}>
              <div className="flex flex-[1_1_240px] flex-col gap-2.5">
                <h3 className="m-0 text-[22px] font-bold tracking-[-0.01em]">Versões sem bagunça</h3>
                <p className="m-0 text-[15px] leading-[1.55] text-th-muted">
                  Chega de “beat_final_FINAL2.wav”. Cada upload vira uma versão, com quem enviou, quando e o que mudou.
                </p>
              </div>
              <ol aria-label="Exemplo de histórico" className="m-0 flex flex-[1_1_260px] list-none flex-col gap-2 p-0">
                {[
                  ["v3", "Voz final e primeira mix", "Lia", true],
                  ["v2", "Novo refrão e baixo", "Marcos", false],
                  ["v1", "Beat base", "Jota", false],
                ].map(([version, text, who, current]) => (
                  <li key={version} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${current ? "bg-th-line" : "bg-th-bg"}`}>
                    <span
                      className="rounded-md px-2 py-[3px] text-xs font-semibold"
                      style={{ ...MONO, background: current ? "#D49AE6" : "#2C2833", color: current ? "#0E0D11" : "#CFCAD6" }}
                    >
                      {version}
                    </span>
                    <span className={`flex-1 text-sm ${current ? "" : "text-th-text2"}`}>{text}</span>
                    <span className="text-xs text-th-muted">{who}</span>
                  </li>
                ))}
              </ol>
            </article>

            <article className={`${TILE} flex flex-col gap-[18px]`}>
              <span aria-hidden="true" className="relative flex h-14 items-end gap-[3px]">
                {MINI_WAVE.map((height, index) => (
                  <span key={index} className="flex-1 rounded-sm" style={{ height, background: index < 13 ? "#E9B872" : "#3D3746" }} />
                ))}
                <span className="absolute -top-3.5 left-[46%] -ml-3 h-6 w-6 rounded-full border-[3px] border-th-surface bg-[#E9B872]" />
              </span>
              <h3 className="m-0 text-[22px] font-bold tracking-[-0.01em]">Comentário no segundo exato</h3>
              <p className="m-0 text-[15px] leading-[1.55] text-th-muted">Clique na onda e diga “aqui, em 1:24”. O feedback fica preso no trecho certo.</p>
            </article>

            <article className={`${TILE} flex flex-col gap-[18px]`}>
              <span aria-hidden="true" className="grid h-14 grid-cols-4 gap-1.5">
                {STAGES.map(([label, color], index) => (
                  <span key={label} className="rounded-lg" style={{ background: index === 2 ? "#2C2833" : "#141217", borderTop: `3px solid ${color}` }} />
                ))}
              </span>
              <h3 className="m-0 text-[22px] font-bold tracking-[-0.01em]">Cada etapa à vista</h3>
              <p className="m-0 text-[15px] leading-[1.55] text-th-muted">Ideia, Em andamento, Produção, Finalizado. Arraste o projeto quando ele avançar.</p>
            </article>

            <article className={`${TILE} flex flex-col gap-[18px]`}>
              <span aria-hidden="true" className="flex h-14 items-center gap-3.5">
                <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#E9B872] text-[#3A2508]">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5" />
                  </svg>
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-[15px] font-semibold">Em andamento</span>
                  <span className="text-xs text-th-muted">4 faixas · atualiza sozinha</span>
                </span>
              </span>
              <h3 className="m-0 text-[22px] font-bold tracking-[-0.01em]">Playlists das suas produções</h3>
              <p className="m-0 text-[15px] leading-[1.55] text-th-muted">Ouça tudo o que está em produção de uma vez, sempre na versão mais recente.</p>
            </article>

            <article className={`${TILE} flex flex-wrap items-center gap-6 md:col-span-2`}>
              <div className="flex flex-[1_1_240px] flex-col gap-2.5">
                <h3 className="m-0 text-[22px] font-bold tracking-[-0.01em]">Ache o parceiro certo</h3>
                <p className="m-0 text-[15px] leading-[1.55] text-th-muted">Filtre por função e gênero, ouça uma amostra e convide direto para o seu projeto.</p>
              </div>
              <div aria-hidden="true" className="flex flex-[1_1_260px] flex-wrap gap-2">
                {ROLES.map((role, index) => (
                  <span
                    key={role}
                    className={`rounded-[20px] px-4 py-2.5 text-sm ${index === 0 ? "bg-white font-semibold text-th-bg" : "border border-th-line2 text-th-text2"}`}
                  >
                    {role}
                  </span>
                ))}
              </div>
            </article>
          </div>
        </section>

        {/* PONTE · PRA QUEM É */}
        <section id="pra-quem" aria-labelledby="pra-quem-titulo" className="border-t border-th-line">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-6 py-24">
            <div className="flex flex-col gap-[18px]">
              <Timecode time="1:36" label="PONTE · PRA QUEM É" />
              <h2 id="pra-quem-titulo" className={H2}>
                Dos dois lados do microfone.
              </h2>
            </div>
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
              {[
                {
                  tag: "PRODUTORES E BEATMAKERS",
                  color: "#E9B872",
                  title: "Seus beats saem da pasta e ganham voz.",
                  items: ["Organize tudo o que está em produção", "Encontre vozes para cada estilo", "Mostre seu portfólio em playlists públicas"],
                },
                {
                  tag: "ARTISTAS E COMPOSITORES",
                  color: "#D49AE6",
                  title: "Sua letra encontra o beat que faltava.",
                  items: ["Ouça beats e convide produtores", "Dê feedback no trecho exato da faixa", "Marque sessões de estúdio na agenda do projeto"],
                },
              ].map((card) => (
                <div key={card.tag} className="flex flex-col gap-[18px] rounded-3xl border border-th-line bg-th-surface p-8">
                  <span className="text-[13px] tracking-[0.06em]" style={{ ...MONO, color: card.color }}>
                    {card.tag}
                  </span>
                  <p className="m-0 text-2xl font-bold leading-[1.25] tracking-[-0.015em]">{card.title}</p>
                  <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-[15px] text-th-text2">
                    {card.items.map((item) => (
                      <li key={item} className="flex gap-2.5">
                        <Check />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* OUTRO · CHAMADA FINAL */}
        <section aria-labelledby="cta-titulo" className="px-6 pb-24 pt-6">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-end gap-10 rounded-[32px] bg-[#F4F2F6] px-[clamp(24px,6vw,80px)] py-[clamp(40px,7vw,88px)] text-th-bg">
            <div className="flex flex-[1_1_420px] flex-col gap-5">
              <Timecode time="2:08" label="OUTRO" light />
              <h2 id="cta-titulo" className="m-0 text-[clamp(2.4rem,5.5vw,4.5rem)] font-extrabold leading-none tracking-[-0.045em]">
                Sua próxima faixa não precisa ser solo.
              </h2>
              <p className="m-0 max-w-[34rem] text-lg leading-normal text-[#4A4452]">
                O TrackHub está em beta. Crie sua conta, comece um projeto e ajude a decidir o que vem a seguir.
              </p>
            </div>
            <div className="flex min-w-[260px] flex-[0_1_auto] flex-col gap-3">
              <Link to="/register" className="flex min-h-[60px] items-center justify-center gap-2.5 rounded-2xl bg-th-bg px-[30px] text-lg font-bold text-white hover:bg-black hover:text-white">
                Criar conta grátis <Arrow />
              </Link>
              <Link to="/login" className="flex min-h-[48px] items-center justify-center rounded-[14px] text-[15px] font-medium text-th-bg underline-offset-4 hover:text-th-bg hover:underline">
                Já tenho conta · Entrar
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-th-line">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-7 gap-y-3 px-6 py-7 text-sm text-th-muted">
          <span className="font-bold text-th-text">TrackHub</span>
          <span>© {new Date().getFullYear()}</span>
          <span className="flex-1" />
          <Link className="text-th-text2 hover:text-white" to="/termos">
            Termos
          </Link>
          <Link className="text-th-text2 hover:text-white" to="/privacidade">
            Privacidade
          </Link>
        </div>
      </footer>
    </div>
  );
}
