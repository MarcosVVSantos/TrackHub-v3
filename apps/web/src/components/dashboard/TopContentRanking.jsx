import { Link } from "react-router-dom";

function RankingList({ title, items }) {
  const maxValue = items.reduce((max, item) => Math.max(max, item.value), 0) || 1;

  return (
    <div className="card flex flex-col gap-4">
      <div>
        <p className="text-xs font-semibold uppercase text-gray-400 dark:text-brand-textMuted">{title}</p>
        <p className="text-sm font-semibold text-gray-700 dark:text-brand-text">Top 5</p>
      </div>
      <div className="space-y-3 text-sm">
        {items.length === 0 && <p className="text-gray-500 dark:text-brand-textMuted">Sem dados no período.</p>}
        {items.map((item) => (
          <Link
            key={item.id}
            to={`/projects/${item.id}`}
            className="flex flex-col gap-2 rounded-lg border border-transparent p-2 transition hover:border-brand-primary/40 hover:bg-brand-primary/5 dark:hover:bg-brand-dark/40"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-gray-700 dark:text-brand-text">{item.name}</span>
              <span className="text-xs font-semibold text-brand-primary dark:text-brand-text">{item.value}</span>
            </div>
            <div className="h-1 rounded-full bg-gray-100 dark:bg-brand-darkOutline">
              <div
                className="h-1 rounded-full bg-brand-primary"
                style={{ width: `${Math.round((item.value / maxValue) * 100)}%` }}
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function TopContentRanking({ ranking }) {
  if (!ranking) return null;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <RankingList title="Plays" items={ranking.plays || []} />
      <RankingList title="Curtidas" items={ranking.likes || []} />
      <RankingList title="Engajamento" items={ranking.engagement || []} />
    </div>
  );
}

export default TopContentRanking;