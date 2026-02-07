import { Info, ActivitySquare } from "lucide-react";
import { Link } from "react-router-dom";

const STATUS_STYLES = {
  active: {
    label: "Ativo",
    dot: "bg-emerald-500",
    text: "text-emerald-600",
  },
  attention: {
    label: "Atenção",
    dot: "bg-amber-500",
    text: "text-amber-600",
  },
  inactive: {
    label: "Inativo",
    dot: "bg-rose-500",
    text: "text-rose-600",
  },
};

function HealthIndicatorCard({ health }) {
  if (!health) return null;
  const status = STATUS_STYLES[health.status] || STATUS_STYLES.attention;
  const criteriaText = health.criteria
    ? Object.values(health.criteria)
        .filter(Boolean)
        .join(" ")
    : "";

  return (
    <div className="card flex h-full flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-brand-text">
          <ActivitySquare size={18} />
          Saúde da Conta
        </div>
        <span className="text-gray-400" title={criteriaText}>
          <Info size={14} />
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${status.dot}`} />
        <span className={`text-sm font-semibold ${status.text}`}>{status.label}</span>
      </div>
      <p className="text-sm text-gray-600 dark:text-brand-textMuted">{health.message}</p>
      {health.cta && (
        <Link className="btn-secondary w-fit" to={health.cta.href}>
          {health.cta.label}
        </Link>
      )}
    </div>
  );
}

export default HealthIndicatorCard;