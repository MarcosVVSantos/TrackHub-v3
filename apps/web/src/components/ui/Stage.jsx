import { STAGES, stageIndex, stageOf } from "../../lib/format";

export function StageBadge({ status }) {
  const stage = stageOf(status);
  return (
    <span className="inline-flex items-center gap-2 text-xs font-semibold" style={{ color: stage.color }}>
      <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: stage.color }} />
      {stage.label}
    </span>
  );
}

// Quatro barrinhas que mostram em que etapa a faixa está.
export function StageBars({ status }) {
  const current = stageIndex(status);
  const color = stageOf(status).color;
  return (
    <span aria-hidden="true" className="grid grid-cols-4 gap-1">
      {STAGES.map((stage, index) => (
        <span key={stage.id} className="h-1 rounded-sm" style={{ background: index <= current ? color : "#2C2833" }} />
      ))}
    </span>
  );
}
