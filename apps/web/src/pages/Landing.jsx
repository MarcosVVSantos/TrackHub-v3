import { Link } from "react-router-dom";
import {
  Music,
  Users,
  FolderKanban,
  UploadCloud,
  Calendar,
  Bell,
  Play,
  ChevronRight,
  Headphones,
  GitBranch,
  MessageSquare,
} from "lucide-react";

const features = [
  {
    icon: FolderKanban,
    title: "Projetos com Kanban",
    description:
      "Organize suas músicas em colunas — Ideia, Em andamento, Produção e Finalizado. Arraste e mova com um clique.",
  },
  {
    icon: Users,
    title: "Colaboração real",
    description:
      "Convide parceiros, defina funções e trabalhe junto em tempo real. Cada um com o seu papel no projeto.",
  },
  {
    icon: UploadCloud,
    title: "Versões de áudio",
    description:
      "Suba v1, v2, v3 do mesmo beat. Histórico completo de arquivos, tudo salvo na nuvem.",
  },
  {
    icon: Calendar,
    title: "Agenda integrada",
    description:
      "Marque sessões de estúdio, deadlines e entregas. Compartilhe a agenda com quem trabalha contigo.",
  },
  {
    icon: Bell,
    title: "Notificações em tempo real",
    description:
      "WebSocket nativo — saiba na hora quando alguém comenta, aceita convite ou muda o status de um projeto.",
  },
  {
    icon: Music,
    title: "Player global",
    description:
      "Ouça qualquer faixa sem sair da página. O player persiste enquanto você navega pelo app.",
  },
];

const steps = [
  {
    number: "01",
    title: "Crie seu projeto",
    description: "Dê um nome, adicione tags e defina a visibilidade. Público ou privado, você decide.",
  },
  {
    number: "02",
    title: "Convide seus parceiros",
    description: "Busque por username, defina o papel de cada um e colabore sem atrito.",
  },
  {
    number: "03",
    title: "Suba, ouça e entregue",
    description: "Upload de áudio com versionamento, player integrado e status atualizado em tempo real.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-th-bg text-th-text">

      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-th-line bg-th-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold text-th-lilac">TrackHub</span>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-lg px-4 py-2 text-sm text-th-muted transition hover:text-th-lilac"
            >
              Entrar
            </Link>
            <Link
              to="/register"
              className="btn-primary min-h-[40px] text-sm"
            >
              Criar conta grátis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden px-6 py-28 text-center">
        {/* Soft background blobs */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[500px] w-[700px] rounded-full bg-th-lilac/10 blur-[120px]" />
        </div>
        <div className="pointer-events-none absolute top-10 right-1/4 h-[250px] w-[250px] rounded-full bg-th-accent/10 blur-[80px]" />

        <div className="relative z-10 max-w-3xl">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-th-accent/30 bg-th-lilac/10 px-4 py-1.5 text-xs font-medium text-th-lilac">
            <Headphones size={12} />
            Plataforma de colaboração musical
          </span>

          <h1 className="mt-4 text-5xl font-extrabold leading-tight tracking-tight text-th-text md:text-6xl lg:text-7xl">
            Faça sua{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #5B1669 0%, #8796C4 100%)" }}
            >
              música
            </span>{" "}
            acontecer
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-th-muted md:text-xl">
            TrackHub é onde produtores e artistas gerenciam projetos, colaboram com parceiros
            e levam suas músicas do rascunho ao lançamento.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-semibold text-th-bg  transition hover:brightness-110 active:scale-[0.98]"
            >
              Começar agora
              <ChevronRight size={18} />
            </Link>
            <Link
              to="/feed"
              className="inline-flex items-center gap-2 rounded-xl border border-th-line px-6 py-3 text-base font-medium text-th-muted transition hover:border-th-lilac hover:text-th-lilac"
            >
              <Play size={16} />
              Ver o feed público
            </Link>
          </div>
        </div>

        {/* Mockup kanban cards */}
        <div className="relative z-10 mt-20 w-full max-w-4xl">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Ideia", count: 2 },
              { label: "Em andamento", count: 3 },
              { label: "Finalizado", count: 2 },
            ].map(({ label, count }, i) => (
              <div
                key={label}
                className="rounded-2xl border border-th-line bg-th-surface p-4 shadow-md"
                style={{ transform: `translateY(${i === 1 ? "-10px" : "0px"})` }}
              >
                <p className="mb-3 text-xs font-semibold text-th-lilac">{label}</p>
                <div className="space-y-2">
                  {Array.from({ length: count }).map((_, j) => (
                    <div
                      key={j}
                      className="h-14 rounded-xl border border-th-line bg-th-raised p-3"
                    >
                      <div className="h-2 w-3/4 rounded-full bg-th-line2" />
                      <div className="mt-2 h-1.5 w-1/2 rounded-full bg-th-raised" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-th-raised px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-th-lilac">
              Funcionalidades
            </p>
            <h2 className="mt-3 text-3xl font-bold text-th-text md:text-4xl">
              Tudo que você precisa, num só lugar
            </h2>
            <p className="mt-4 text-th-muted">
              Do rascunho inicial até o produto final, o TrackHub acompanha cada etapa.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="group rounded-2xl border border-th-line bg-th-surface p-6 shadow-sm transition hover:border-th-lilac/30 hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-th-lilac/10 text-th-lilac transition group-hover:bg-th-lilac/20">
                  <Icon size={22} />
                </div>
                <h3 className="mt-4 text-base font-semibold text-th-text">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-th-muted">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-th-lilac">
              Como funciona
            </p>
            <h2 className="mt-3 text-3xl font-bold text-th-text md:text-4xl">
              Em 3 passos
            </h2>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {steps.map(({ number, title, description }) => (
              <div key={number} className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-th-lilac/20 bg-th-lilac/10 text-2xl font-black text-th-lilac">
                  {number}
                </div>
                <h3 className="mt-5 text-base font-semibold text-th-text">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-th-muted">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Highlights strip */}
      <section className="bg-th-raised px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-4 rounded-3xl border border-th-line bg-th-surface p-8 shadow-sm sm:grid-cols-3">
            {[
              { icon: GitBranch, label: "Versionamento de áudio", sub: "v1, v2, v3 — histórico completo" },
              { icon: MessageSquare, label: "Comentários por projeto", sub: "Feedback direto no contexto certo" },
              { icon: Bell, label: "Notificações instantâneas", sub: "WebSocket — sem polling, sem delay" },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-th-lilac/10 text-th-lilac">
                  <Icon size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-th-text">{label}</p>
                  <p className="text-xs text-th-muted">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="px-6 py-24">
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-th-line2 bg-th-surface p-12 text-center">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-10 -top-10 h-64 w-64 rounded-full bg-th-raised blur-[60px]" />
            <div className="absolute -bottom-10 -right-10 h-64 w-64 rounded-full bg-th-accent/20 blur-[60px]" />
          </div>
          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-th-text md:text-4xl">
              Pronto para lançar seu próximo hit?
            </h2>
            <p className="mt-4 text-th-muted">
              Crie sua conta grátis e comece a organizar seus projetos agora.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3 text-base font-semibold text-th-bg transition hover:bg-th-text2"
              >
                Criar conta grátis
                <ChevronRight size={18} />
              </Link>
              <Link
                to="/login"
                className="text-sm text-th-muted transition hover:text-th-text"
              >
                Já tenho conta
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-th-line px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-th-muted sm:flex-row">
          <span className="font-semibold text-th-lilac">TrackHub</span>
          <div className="flex gap-6">
            <Link to="/feed" className="transition hover:text-th-lilac">Feed público</Link>
            <Link to="/login" className="transition hover:text-th-lilac">Entrar</Link>
            <Link to="/register" className="transition hover:text-th-lilac">Cadastrar</Link>
            <Link to="/termos" className="transition hover:text-th-lilac">Termos</Link>
            <Link to="/privacidade" className="transition hover:text-th-lilac">Privacidade</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
