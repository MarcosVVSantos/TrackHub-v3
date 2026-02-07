import { Info, ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

function TrendBadge({ trend }) {
  if (!trend) return null;
  const { direction, value } = trend;
  const isUp = direction === "up";
  const isDown = direction === "down";
  const Icon = isUp ? ArrowUpRight : isDown ? ArrowDownRight : Minus;
  const textColor = isUp
    ? "text-emerald-500"
    : isDown
    ? "text-rose-500"
    : "text-gray-400";

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${textColor}`}>
      <Icon size={14} />
      {value}%
    </span>
  );
}

function MetricCard({ title, value, subtitle, icon: Icon, tooltip, trend }) {
  const formattedValue = new Intl.NumberFormat("pt-BR").format(value ?? 0);
  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-500 dark:text-brand-textMuted">
          {Icon && <Icon size={16} />}
          {title}
        </div>
        {tooltip && (
          <span className="text-gray-400" title={tooltip} aria-label={tooltip}>
            <Info size={14} />
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold text-brand-primary dark:text-brand-text">{formattedValue}</p>
          {subtitle && <p className="mt-1 text-xs text-gray-500 dark:text-brand-textMuted">{subtitle}</p>}
        </div>
        <TrendBadge trend={trend} />
      </div>
    </div>
  );
}

export default MetricCard;