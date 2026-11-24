function StatCard({ title, value, subtitle }) {
  return (
    <div className="card">
      <p className="text-xs uppercase text-th-muted">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-th-lilac">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-th-muted">{subtitle}</p>}
    </div>
  );
}

export default StatCard;
