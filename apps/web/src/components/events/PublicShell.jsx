import { Link } from "react-router-dom";
import { Music2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

// Moldura das páginas abertas de evento: sem menu do app, com logo e "Entrar".
export default function PublicShell({ children, back }) {
  const { user } = useAuth() || {};
  return (
    <div className="flex min-h-screen flex-col bg-th-bg text-th-text">
      <header className="border-b border-th-line">
        <div className="mx-auto flex w-full max-w-[1200px] items-center gap-3 px-6 py-3.5">
          {back}
          <Link to={user ? "/inicio" : "/"} className={`flex items-center gap-2.5 text-th-text no-underline hover:text-th-text ${back ? "ml-auto" : ""}`}>
            <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-white text-th-bg">
              <Music2 size={18} aria-hidden="true" />
            </span>
            <span className="text-[17px] font-bold">TrackHub</span>
          </Link>
          {!back && (
            <Link to={user ? "/inicio" : "/login"} className="btn-ghost ml-auto no-underline">
              {user ? "Abrir o TrackHub" : "Entrar"}
            </Link>
          )}
        </div>
      </header>
      <main id="conteudo" className="flex-1">
        {children}
      </main>
      <footer className="border-t border-th-line">
        <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center gap-x-6 gap-y-3 px-6 py-7 text-sm text-th-muted">
          <span>
            Organizado no <b className="text-th-text">TrackHub</b>
          </span>
          <span className="flex-1" />
          {!user && (
            <>
              <span>Produz eventos ou faixas?</span>
              <Link to="/register" className="btn-primary min-h-[40px] text-sm no-underline hover:text-th-bg">
                Criar conta grátis
              </Link>
            </>
          )}
          <Link to="/privacidade" className="text-th-muted">
            Privacidade
          </Link>
        </div>
      </footer>
    </div>
  );
}
