import { Link } from "react-router-dom";
import LogoMark from "../ui/LogoMark";

// Moldura das telas de entrar e criar conta.
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-th-bg px-4 py-10 text-th-text">
      <Link to="/" className="mb-8 flex items-center gap-2.5 text-lg font-semibold tracking-tight text-th-text">
        <LogoMark size={32} />
        TrackHub
      </Link>
      <main className="w-full max-w-md rounded-2xl border border-th-line bg-th-surface p-7 sm:p-8">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-th-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </main>
      {footer && <p className="mt-6 text-sm text-th-muted">{footer}</p>}
    </div>
  );
}
