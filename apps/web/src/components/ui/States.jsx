export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-th-line2 px-6 py-10 text-center">
      {Icon && (
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-th-raised text-th-lilac">
          <Icon size={22} aria-hidden="true" />
        </span>
      )}
      <p className="text-base font-semibold text-th-text">{title}</p>
      {text && <p className="max-w-sm text-sm text-th-muted">{text}</p>}
      {action}
    </div>
  );
}

export function ErrorNote({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-[10px] border border-th-danger/40 bg-th-danger/10 px-3.5 py-2.5 text-sm text-th-danger">
      {children}
    </p>
  );
}

export function SkeletonBlock({ className = "" }) {
  return <span aria-hidden="true" className={`block animate-pulse rounded-xl bg-th-raised ${className}`} />;
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="text-[28px] font-bold tracking-tight text-th-text sm:text-[32px]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-base text-th-text2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
