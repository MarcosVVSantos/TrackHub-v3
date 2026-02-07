function StatCard({ title, value, subtitle }) {
  return (
    <div className="card">
      <p className="text-xs uppercase text-gray-400">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-brand-primary">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
    </div>
  );
}

export default StatCard;
