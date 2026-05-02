import { Link } from "react-router-dom";
import { Zap } from "lucide-react";
import { useSubscription } from "../hooks/useSubscription";

function UsageBar({ used, max, label }) {
  if (max === -1) return null;
  const pct = Math.min((used / max) * 100, 100);
  const nearLimit = pct >= 80;

  return (
    <div className="flex flex-col gap-1 min-w-[100px]">
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{label}</span>
        <span className={nearLimit ? "text-amber-500 font-medium" : ""}>
          {used}/{max}
        </span>
      </div>
      <div className="h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            nearLimit ? "bg-amber-500" : "bg-purple-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function UsageBanner() {
  const { data, loading } = useSubscription();

  if (loading || !data || data.plan.tier === "premium") return null;

  const { plan, usage } = data;

  return (
    <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 mb-4 flex flex-wrap items-center gap-4 justify-between">
      <div className="flex flex-wrap gap-6">
        <UsageBar used={usage.projects} max={plan.maxProjects} label="Projetos" />
        <UsageBar used={usage.tracks} max={plan.maxTracks} label="Tracks" />
        <UsageBar used={usage.playlists} max={plan.maxPlaylists} label="Playlists" />
      </div>
      <Link
        to="/pricing"
        className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline shrink-0"
      >
        <Zap size={12} />
        Upgrade para Premium
      </Link>
    </div>
  );
}
