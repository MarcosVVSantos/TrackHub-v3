// Funções de formatação usadas em várias telas.

export const STAGES = [
  { id: "idea", label: "Ideia", hint: "Rascunhos e referências", color: "#AEB9DE", text: "text-stage-idea", bg: "bg-stage-idea" },
  { id: "in_progress", label: "Em andamento", hint: "Beat, letra e guias", color: "#E9B872", text: "text-stage-progress", bg: "bg-stage-progress" },
  { id: "production", label: "Produção", hint: "Gravação, mix e master", color: "#D49AE6", text: "text-stage-production", bg: "bg-stage-production" },
  { id: "finished", label: "Finalizado", hint: "Pronto para lançar", color: "#7ED6A2", text: "text-stage-finished", bg: "bg-stage-finished" },
];

export function stageOf(status) {
  return STAGES.find((stage) => stage.id === status) || STAGES[0];
}

export function stageIndex(status) {
  return Math.max(0, STAGES.findIndex((stage) => stage.id === status));
}

export function formatTime(seconds) {
  if (seconds === null || seconds === undefined || !Number.isFinite(Number(seconds))) return "—";
  const total = Math.max(0, Math.floor(Number(seconds)));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function timeAgo(date) {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ontem";
  if (days < 7) return `há ${days} dias`;
  if (days < 14) return "semana passada";
  return new Date(date).toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}

export function dayLabel(date) {
  const value = new Date(date);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (value.toDateString() === today.toDateString()) return "Hoje";
  if (value.toDateString() === tomorrow.toDateString()) return "Amanhã";
  const diffDays = (value - today) / 86400000;
  if (diffDays > 0 && diffDays < 6) {
    return value.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  }
  return value.toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "");
}

export function hourLabel(date) {
  return new Date(date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function initials(name = "") {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?"
  );
}

const AVATAR_COLORS = ["#D49AE6", "#AEB9DE", "#E9B872", "#7ED6A2", "#8796C4", "#D9B8E3"];

export function avatarColor(seed = "") {
  let hash = 0;
  for (const char of String(seed)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function plural(count, one, many) {
  return `${count} ${count === 1 ? one : many}`;
}

export function joinNames(names = []) {
  if (names.length <= 1) return names[0] || "";
  return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
}

// Funções musicais usadas no perfil e no filtro de Encontrar parceiros.
export const ROLES = ["Beatmaker", "Produtor", "Cantor(a)", "Rapper", "Compositor(a)", "Instrumentista", "Mix/Master"];
