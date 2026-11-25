import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  CalendarDays,
  Columns3,
  Home,
  ListMusic,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  Music2,
  Plus,
  Search,
  Settings,
  Ticket,
  ChevronDown,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { useChat } from "../../context/ChatContext";
import { usePlayer } from "../../context/PlayerContext";
import { apiRequest } from "../../api/client";
import { Avatar } from "../ui/Avatar";
import { timeAgo } from "../../lib/format";
import LogoMark from "../ui/LogoMark";

// Navegação do redesign: dois grupos, pensados pelo que a pessoa quer fazer.
const CREATE = [
  { to: "/inicio", label: "Início", icon: Home },
  { to: "/projects", label: "Meus projetos", icon: Columns3 },
  { to: "/eventos", label: "Eventos", icon: Ticket, badge: "lineup" },
  { to: "/playlists", label: "Playlists", icon: ListMusic },
  { to: "/calendar", label: "Agenda", icon: CalendarDays },
];

const CONNECT = [
  { to: "/explore", label: "Encontrar parceiros", icon: UsersRound },
  { to: "/convites", label: "Convites", icon: Mail, badge: "invites" },
  { to: "/chat", label: "Mensagens", icon: MessageCircle, badge: "chat" },
  { to: "/comunidade", label: "Comunidade", icon: Music2 },
];

function Logo() {
  return (
    <Link to="/inicio" className="flex items-center gap-2.5 px-2 text-th-text no-underline hover:text-th-text">
      <LogoMark size={36} />
      <span className="text-[19px] font-bold tracking-tight">TrackHub</span>
    </Link>
  );
}

function NavItem({ item, count, onNavigate }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex min-h-[44px] items-center gap-3 rounded-[10px] px-3 text-[15px] no-underline transition ${
          isActive ? "bg-th-raised font-semibold text-white" : "text-th-text2 hover:bg-th-surface hover:text-th-text"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={20} aria-hidden="true" className={isActive ? "text-th-lilac" : ""} />
          <span className="flex-1">{item.label}</span>
          {count > 0 && (
            <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-th-accent px-1.5 text-xs font-bold text-th-sidebar">
              {count}
              <span className="sr-only"> novos</span>
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

// "Novo projeto" abre um menu: faixa ou evento.
function NewMenu({ onNavigate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onClick(event) {
      if (!ref.current?.contains(event.target)) setOpen(false);
    }
    function onKey(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const items = [
    { to: "/projects?novo=1", icon: Music2, color: "#D49AE6", title: "Faixa", text: "Versões, comentários e parceiros" },
    { to: "/eventos?novo=1", icon: Ticket, color: "#E9B872", title: "Evento", text: "Batalha, show, open mic ou festa" },
  ];

  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="btn-primary w-full">
        <Plus size={18} aria-hidden="true" />
        Novo projeto
        <ChevronDown size={16} aria-hidden="true" className="ml-auto" />
      </button>
      {open && (
        <div role="menu" aria-label="O que você vai criar?" className="absolute left-0 right-0 top-[52px] z-20 flex flex-col gap-0.5 rounded-[14px] border border-th-line2 bg-th-surface p-1.5 shadow-2xl">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                role="menuitem"
                to={item.to}
                onClick={() => {
                  setOpen(false);
                  onNavigate?.();
                }}
                className="flex min-h-[56px] items-start gap-3 rounded-[10px] px-3 py-2.5 no-underline hover:bg-th-raised"
              >
                <Icon size={20} aria-hidden="true" style={{ color: item.color }} className="mt-0.5" />
                <span className="flex flex-col gap-0.5">
                  <span className="font-semibold text-th-text">{item.title}</span>
                  <span className="text-xs text-th-muted">{item.text}</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Sidebar({ counts, onNavigate }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex h-full flex-col gap-7 px-4 py-6">
      <Logo />
      <NewMenu onNavigate={onNavigate} />

      <nav aria-label="Principal" className="flex flex-col gap-5">
        <div className="flex flex-col gap-0.5">
          <p className="eyebrow mb-1.5 px-3">Criar</p>
          {CREATE.map((item) => (
            <NavItem key={item.to} item={item} count={counts[item.badge] || 0} onNavigate={onNavigate} />
          ))}
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="eyebrow mb-1.5 px-3">Conectar</p>
          {CONNECT.map((item) => (
            <NavItem key={item.to} item={item} count={counts[item.badge] || 0} onNavigate={onNavigate} />
          ))}
        </div>
      </nav>

      <div className="mt-auto flex flex-col gap-0.5 border-t border-th-line pt-4">
        <NavItem item={{ to: "/desempenho", label: "Desempenho", icon: BarChart3 }} onNavigate={onNavigate} />
        <div className="relative">
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex min-h-[52px] w-full items-center gap-3 rounded-[10px] px-3 text-left transition hover:bg-th-surface"
          >
            <Avatar user={user} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-th-text">{user?.name}</span>
              <span className="block truncate text-xs text-th-muted">{user?.role || "Meu perfil e conta"}</span>
            </span>
          </button>
          {menuOpen && (
            <div role="menu" className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-th-line bg-th-surface p-1.5 shadow-2xl">
              <Link role="menuitem" to={`/profile/${user?.username || user?.id}`} onClick={() => { setMenuOpen(false); onNavigate?.(); }} className="flex min-h-[44px] items-center gap-2.5 rounded-lg px-3 text-sm text-th-text2 no-underline hover:bg-th-raised hover:text-th-text">
                <UserRound size={18} aria-hidden="true" /> Meu perfil
              </Link>
              <Link role="menuitem" to="/account" onClick={() => { setMenuOpen(false); onNavigate?.(); }} className="flex min-h-[44px] items-center gap-2.5 rounded-lg px-3 text-sm text-th-text2 no-underline hover:bg-th-raised hover:text-th-text">
                <Settings size={18} aria-hidden="true" /> Conta e perfil musical
              </Link>
              <button role="menuitem" type="button" onClick={logout} className="flex min-h-[44px] w-full items-center gap-2.5 rounded-lg px-3 text-sm text-th-text2 hover:bg-th-raised hover:text-th-text">
                <LogOut size={18} aria-hidden="true" /> Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NotificationsButton() {
  const { notifications, unreadCount, loadNotifications, handleReadAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    loadNotifications();
    function onClick(event) {
      if (!ref.current?.contains(event.target)) setOpen(false);
    }
    function onKey(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={unreadCount ? `Notificações (${unreadCount} novas)` : "Notificações"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="btn-icon relative"
      >
        <Bell size={20} aria-hidden="true" />
        {unreadCount > 0 && <span aria-hidden="true" className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-th-warn" />}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(380px,calc(100vw-32px))] rounded-2xl border border-th-line bg-th-surface p-2 shadow-2xl">
          <div className="flex items-center justify-between px-3 py-2">
            <h2 className="text-sm font-semibold text-th-text">Notificações</h2>
            {unreadCount > 0 && (
              <button type="button" onClick={handleReadAll} className="text-[13px] text-th-link hover:text-th-linkHover">
                Marcar todas como lidas
              </button>
            )}
          </div>
          <ul className="max-h-[60vh] overflow-y-auto">
            {notifications.length === 0 && <li className="px-3 py-6 text-center text-sm text-th-muted">Nada novo por aqui.</li>}
            {notifications.slice(0, 20).map((item) => (
              <li key={item.id}>
                <Link
                  to={item.link || "/inicio"}
                  onClick={() => setOpen(false)}
                  className="flex gap-3 rounded-xl px-3 py-2.5 no-underline hover:bg-th-raised"
                >
                  <Avatar user={item.actor} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm ${item.readAt ? "text-th-text2" : "font-semibold text-th-text"}`}>{item.message}</span>
                    <span className="text-xs text-th-muted">{timeAgo(item.createdAt)}</span>
                  </span>
                  {!item.readAt && <span aria-label="não lida" className="mt-1.5 h-2 w-2 flex-none rounded-full bg-th-warn" />}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function TopBar({ onOpenMenu }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  function handleSearch(event) {
    event.preventDefault();
    const q = query.trim();
    navigate(q ? `/explore?q=${encodeURIComponent(q)}` : "/explore");
  }

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-th-line bg-th-bg/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-10 lg:py-4">
      <button type="button" onClick={onOpenMenu} aria-label="Abrir menu" className="btn-icon lg:hidden">
        <Menu size={20} aria-hidden="true" />
      </button>
      <form role="search" onSubmit={handleSearch} className="flex min-w-0 max-w-[560px] flex-1">
        <label className="flex min-h-[44px] w-full items-center gap-2.5 rounded-[10px] border border-th-line bg-th-surface px-3.5 text-th-muted focus-within:border-th-accent">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Buscar pessoas</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar produtores, artistas ou cidade"
            className="min-w-0 flex-1 border-0 bg-transparent text-sm text-th-text outline-none placeholder:text-th-muted"
          />
        </label>
      </form>
      <div className="ml-auto">
        <NotificationsButton />
      </div>
    </header>
  );
}

const MOBILE = [
  { to: "/inicio", label: "Início", icon: Home },
  { to: "/projects", label: "Projetos", icon: Columns3 },
  { to: "/explore", label: "Parceiros", icon: UsersRound },
  { to: "/chat", label: "Mensagens", icon: MessageCircle, badge: "chat" },
  { to: "/comunidade", label: "Comunidade", icon: Music2 },
];

function MobileNav({ counts }) {
  return (
    <nav aria-label="Atalhos" className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-5 border-t border-th-line bg-th-sidebar lg:hidden">
      {MOBILE.map((item) => {
        const Icon = item.icon;
        const count = counts[item.badge] || 0;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center gap-1 text-[11px] no-underline ${
                isActive ? "font-semibold text-white" : "text-th-muted hover:text-th-text"
              }`
            }
          >
            <Icon size={20} aria-hidden="true" />
            {item.label}
            {count > 0 && (
              <span className="absolute right-[calc(50%-18px)] top-2 h-2 w-2 rounded-full bg-th-warn">
                <span className="sr-only">{count} novas</span>
              </span>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}

// Layout de todas as telas logadas.
export default function AppShell({ children }) {
  const location = useLocation();
  const player = usePlayer();
  const { unreadCount: chatUnread } = useChat();
  const [drawer, setDrawer] = useState(false);
  const [invites, setInvites] = useState(0);
  const [lineupInvites, setLineupInvites] = useState(0);

  useEffect(() => {
    setDrawer(false);
    apiRequest("/projects/invites")
      .then((list) => setInvites(Array.isArray(list) ? list.length : 0))
      .catch(() => {});
    // Convites para tocar em eventos que ainda não foram respondidos.
    apiRequest("/events/lineup-invites")
      .then((list) => setLineupInvites(Array.isArray(list) ? list.filter((item) => item.status === "invited").length : 0))
      .catch(() => {});
  }, [location.pathname]);

  const counts = { invites, chat: chatUnread || 0, lineup: lineupInvites };
  const hasPlayer = Boolean(player?.current);

  return (
    <div className="min-h-screen bg-th-bg text-th-text">
      <a href="#conteudo" className="sr-only-focusable fixed left-3 top-3 z-[60] rounded-lg bg-white px-4 py-2 text-th-bg">
        Pular para o conteúdo
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] overflow-y-auto border-r border-th-line bg-th-sidebar lg:block">
        <Sidebar counts={counts} />
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-50 bg-black/60 lg:hidden" onMouseDown={(e) => e.target === e.currentTarget && setDrawer(false)}>
          <aside className="h-full w-[280px] overflow-y-auto border-r border-th-line bg-th-sidebar">
            <div className="flex justify-end px-3 pt-3">
              <button type="button" onClick={() => setDrawer(false)} aria-label="Fechar menu" className="btn-icon">
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <Sidebar counts={counts} onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-h-screen flex-col lg:pl-[260px]">
        <TopBar onOpenMenu={() => setDrawer(true)} />
        <main id="conteudo" className={`flex-1 ${hasPlayer ? "pb-44 lg:pb-28" : "pb-24 lg:pb-12"}`}>
          {children}
        </main>
      </div>

      <MobileNav counts={counts} />
    </div>
  );
}

// Contêiner padrão das páginas, com a largura e o respiro do redesign.
export function Page({ children, wide = false }) {
  return (
    <div className={`mx-auto flex w-full flex-col gap-8 px-4 pt-7 sm:px-6 lg:px-10 lg:pt-9 ${wide ? "max-w-[1400px]" : "max-w-[1240px]"}`}>
      {children}
    </div>
  );
}
