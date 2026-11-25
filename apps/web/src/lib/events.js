// Rótulos, cores e formatação do módulo de eventos.

// As etapas do evento usam o mesmo status do projeto (idea, in_progress...), com nomes de evento.
export const EVENT_STAGES = [
  { id: "idea", label: "Planejamento", hint: "Local, data e ideia do line-up.", color: "#AEB9DE" },
  { id: "in_progress", label: "Divulgação", hint: "Flyer no ar e chamada aberta.", color: "#E9B872" },
  { id: "production", label: "Confirmado", hint: "Line-up e equipe fechados.", color: "#D49AE6" },
  { id: "finished", label: "Realizado", hint: "Já aconteceu. Guarde fotos e números.", color: "#7ED6A2" },
];

export function eventStageOf(status) {
  return EVENT_STAGES.find((stage) => stage.id === status) || EVENT_STAGES[0];
}

// Cor do "flyer" desenhado quando o evento ainda não tem imagem.
export const EVENT_TYPES = [
  { id: "show", label: "Show", bg: "#AEB9DE", ink: "#0E1326" },
  { id: "battle", label: "Batalha", bg: "#E9B872", ink: "#1F1404" },
  { id: "open_mic", label: "Open mic", bg: "#D49AE6", ink: "#24092E" },
  { id: "party", label: "Festa", bg: "#7ED6A2", ink: "#08261A" },
  { id: "other", label: "Outro", bg: "#CFCAD6", ink: "#141217" },
];

export function eventTypeOf(type) {
  return EVENT_TYPES.find((item) => item.id === type) || EVENT_TYPES[EVENT_TYPES.length - 1];
}

export const LINEUP_STATUS = {
  invited: { label: "Convidado", color: "#E9B872" },
  confirmed: { label: "Confirmado", color: "#7ED6A2" },
  declined: { label: "Recusou", color: "#F2A7A0" },
};

export const LINEUP_ROLES = ["MC", "DJ", "Banda", "Beatmaker", "Host", "Jurado(a)", "Dançarino(a)", "Outro"];

// "Sáb, 13 dez · 19h" ou "19h30"
export function eventDateLabel(startsAt, endsAt) {
  if (!startsAt) return "";
  const start = new Date(startsAt);
  const day = start
    .toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })
    .replace(/\./g, "")
    .replace(/^\w/, (c) => c.toUpperCase());
  const hour = (date) => {
    const h = date.getHours();
    const m = date.getMinutes();
    return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
  };
  if (!endsAt) return `${day} · ${hour(start)}`;
  const end = new Date(endsAt);
  const sameDay = end.toDateString() === start.toDateString() || end - start < 12 * 3600 * 1000;
  return sameDay ? `${day} · ${hour(start)} às ${hour(end)}` : `${day} · ${hour(start)}`;
}

// "Faltam 18 dias", "É hoje", "Há 3 dias"
export function countdown(startsAt) {
  if (!startsAt) return "";
  const start = new Date(startsAt);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(start);
  day.setHours(0, 0, 0, 0);
  const diff = Math.round((day - today) / 86400000);
  if (diff === 0) return "É hoje";
  if (diff === 1) return "É amanhã";
  if (diff > 1) return `Faltam ${diff} dias`;
  if (diff === -1) return "Foi ontem";
  return `Há ${-diff} dias`;
}

// Centavos -> "R$ 1.300" (ou "R$ 150,50")
export function money(cents) {
  if (cents === null || cents === undefined) return "—";
  const value = cents / 100;
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

// "300", "300,50", "R$ 1.300" -> centavos. Vazio vira null. Inválido vira NaN.
export function parseMoney(text) {
  const clean = String(text ?? "").replace(/[R$\s]/g, "");
  if (!clean) return null;
  const normalized = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean.replace(/\.(?=\d{3}(\D|$))/g, "");
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return NaN;
  return Math.round(value * 100);
}

export function centsToInput(cents) {
  if (cents === null || cents === undefined) return "";
  const value = cents / 100;
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(".", ",");
}

// Data + hora locais (dos campos do formulário) -> ISO em UTC para a API.
export function toIso(date, time) {
  if (!date) return null;
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = (time || "00:00").split(":").map(Number);
  const value = new Date(y, m - 1, d, hh || 0, mm || 0);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

// ISO -> { date: "2026-12-13", time: "19:00" } no horário local, para preencher o formulário.
export function fromIso(iso) {
  if (!iso) return { date: "", time: "" };
  const value = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return {
    date: `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`,
    time: `${pad(value.getHours())}:${pad(value.getMinutes())}`,
  };
}

// Inscrições na chamada aberta.
export const APPLICATION_STATUS = {
  pending: { label: "Novas", one: "Nova", color: "#AEB9DE", hint: "Ainda não ouvidas." },
  shortlisted: { label: "Pré-selecionadas", one: "Pré-selecionada", color: "#E9B872", hint: "Gostou: decida depois." },
  approved: { label: "Aprovadas", one: "Aprovada", color: "#7ED6A2", hint: "Entram no line-up como confirmadas." },
  rejected: { label: "Recusadas", one: "Recusada", color: "#F2A7A0", hint: "Recebem um aviso gentil." },
};

// Endereço público do evento, para copiar e compartilhar.
export function publicEventUrl(slug) {
  return `${window.location.origin}/e/${slug}`;
}
