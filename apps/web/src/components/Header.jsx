import { Link, NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Bell,
  Calendar,
  Globe,
  LayoutDashboard,
  FolderKanban,
  LogOut,
  SunMoon,
  UserCircle,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useNotifications } from "../context/NotificationContext";
import { apiRequest } from "../api/client";

function Header() {
  const { user, logout } = useAuth();
  const { toggleTheme } = useTheme() || {};
  const { notifications, unreadCount, loading, error, loadNotifications, handleReadAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarOverview, setCalendarOverview] = useState({ today: [], upcoming: [] });
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = user?.name
    ? user.name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase()
    : "";

  async function loadCalendarOverview() {
    if (!user) return;
    try {
      setCalendarLoading(true);
      const data = await apiRequest("/calendar/overview");
      setCalendarOverview(data);
    } catch {
      setCalendarOverview({ today: [], upcoming: [] });
    } finally {
      setCalendarLoading(false);
    }
  }

  useEffect(() => {
    if (calendarOpen) loadCalendarOverview();
  }, [calendarOpen]);

  function formatRelative(dateString) {
    if (!dateString) return "";
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `há ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `há ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "ontem";
    return `há ${days} dias`;
  }

  function closeMobile() {
    setMobileOpen(false);
  }

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-2 hover:text-brand-primary dark:hover:text-brand-text transition ${
      isActive ? "text-brand-primary font-medium" : ""
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur dark:border-brand-darkOutline dark:bg-brand-dark/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6">
        {/* Logo */}
        <Link to="/" className="text-xl font-semibold text-brand-primary">
          TrackHub
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-4 text-sm text-gray-600 dark:text-brand-textMuted md:flex">
          <NavLink to="/feed" className={navLinkClass}>
            <Globe size={16} />
            Feed
          </NavLink>
          {user && (
            <>
              <NavLink to="/dashboard" className={navLinkClass}>
                <LayoutDashboard size={16} />
                Dashboard
              </NavLink>
              <NavLink to="/calendar" className={navLinkClass}>
                <Calendar size={16} />
                Agenda
              </NavLink>
              <NavLink to="/projects" className={navLinkClass}>
                <FolderKanban size={16} />
                Projetos
              </NavLink>
              <NavLink to="/account" className={navLinkClass}>
                <UserCircle size={16} />
                Conta
              </NavLink>
            </>
          )}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              {/* Calendar dropdown */}
              <div className="relative">
                <button
                  className="relative flex h-10 w-10 items-center justify-center rounded-full border border-transparent text-gray-600 transition hover:bg-gray-100 dark:text-brand-textMuted dark:hover:bg-brand-darkOutline"
                  onClick={() => { setCalendarOpen((prev) => !prev); setOpen(false); }}
                  aria-label="Agenda"
                >
                  <Calendar size={18} />
                </button>
                {calendarOpen && (
                  <div className="absolute right-0 mt-2 w-80 rounded-xl border border-gray-100 bg-white p-3 shadow-lg dark:border-brand-darkOutline dark:bg-brand-darkSecondary">
                    <CalendarDropdownContent
                      calendarLoading={calendarLoading}
                      calendarOverview={calendarOverview}
                      onClose={() => setCalendarOpen(false)}
                    />
                  </div>
                )}
              </div>

              {/* Notifications dropdown */}
              <div className="relative">
                <button
                  className="relative flex h-10 w-10 items-center justify-center rounded-full border border-transparent text-gray-600 transition hover:bg-gray-100 dark:text-brand-textMuted dark:hover:bg-brand-darkOutline"
                  onClick={() => { const next = !open; setOpen(next); setCalendarOpen(false); if (next) handleReadAll(); }}
                  aria-label="Notificações"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-xs font-semibold text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {open && (
                  <div className="absolute right-0 mt-2 w-80 rounded-xl border border-gray-100 bg-white p-3 shadow-lg dark:border-brand-darkOutline dark:bg-brand-darkSecondary">
                    <NotificationsDropdownContent
                      loading={loading}
                      error={error}
                      notifications={notifications}
                      unreadCount={unreadCount}
                      handleReadAll={handleReadAll}
                      loadNotifications={loadNotifications}
                      formatRelative={formatRelative}
                      onClose={() => setOpen(false)}
                    />
                  </div>
                )}
              </div>

              <button className="btn-secondary" onClick={toggleTheme}>
                <SunMoon size={16} />
                Tema
              </button>
              <button className="btn-primary" onClick={logout}>
                <LogOut size={16} />
                Sair
              </button>
              <Link to={`/profile/${user.username}`} title="Meu perfil">
                {user.avatarUrl ? (
                  <img className="h-10 w-10 rounded-full border border-gray-200 object-cover dark:border-brand-darkOutline" src={user.avatarUrl} alt={user.name} />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-accent/30 text-sm font-semibold text-brand-primary">
                    {initials}
                  </div>
                )}
              </Link>
            </>
          ) : (
            <Link className="btn-primary" to="/login">Entrar</Link>
          )}
        </div>

        {/* Mobile right side */}
        <div className="flex items-center gap-2 md:hidden">
          {user && (
            <>
              {/* Notifications bell on mobile */}
              <div className="relative">
                <button
                  className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100 dark:text-brand-textMuted dark:hover:bg-brand-darkOutline"
                  onClick={() => { const next = !open; setOpen(next); if (next) handleReadAll(); setMobileOpen(false); }}
                  aria-label="Notificações"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-xs font-semibold text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {open && (
                  <div className="fixed left-4 right-4 top-16 rounded-xl border border-gray-100 bg-white p-3 shadow-lg dark:border-brand-darkOutline dark:bg-brand-darkSecondary">
                    <NotificationsDropdownContent
                      loading={loading}
                      error={error}
                      notifications={notifications}
                      unreadCount={unreadCount}
                      handleReadAll={handleReadAll}
                      loadNotifications={loadNotifications}
                      formatRelative={formatRelative}
                      onClose={() => setOpen(false)}
                    />
                  </div>
                )}
              </div>

              {/* Avatar */}
              <Link to={`/profile/${user.username}`} title="Meu perfil" onClick={closeMobile}>
                {user.avatarUrl ? (
                  <img className="h-9 w-9 rounded-full border border-gray-200 object-cover dark:border-brand-darkOutline" src={user.avatarUrl} alt={user.name} />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-accent/30 text-sm font-semibold text-brand-primary">
                    {initials}
                  </div>
                )}
              </Link>
            </>
          )}

          {/* Hamburger */}
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100 dark:text-brand-textMuted dark:hover:bg-brand-darkOutline"
            onClick={() => { setMobileOpen((prev) => !prev); setOpen(false); setCalendarOpen(false); }}
            aria-label="Menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="border-t border-gray-100 bg-white px-4 pb-4 dark:border-brand-darkOutline dark:bg-brand-dark md:hidden">
          <nav className="flex flex-col gap-1 pt-2 text-sm text-gray-600 dark:text-brand-textMuted">
            <NavLink to="/feed" className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-gray-50 dark:hover:bg-brand-darkOutline ${isActive ? "text-brand-primary font-medium" : ""}`} onClick={closeMobile}>
              <Globe size={18} /> Feed
            </NavLink>
            {user ? (
              <>
                <NavLink to="/dashboard" className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-gray-50 dark:hover:bg-brand-darkOutline ${isActive ? "text-brand-primary font-medium" : ""}`} onClick={closeMobile}>
                  <LayoutDashboard size={18} /> Dashboard
                </NavLink>
                <NavLink to="/calendar" className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-gray-50 dark:hover:bg-brand-darkOutline ${isActive ? "text-brand-primary font-medium" : ""}`} onClick={closeMobile}>
                  <Calendar size={18} /> Agenda
                </NavLink>
                <NavLink to="/projects" className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-gray-50 dark:hover:bg-brand-darkOutline ${isActive ? "text-brand-primary font-medium" : ""}`} onClick={closeMobile}>
                  <FolderKanban size={18} /> Projetos
                </NavLink>
                <NavLink to="/account" className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-gray-50 dark:hover:bg-brand-darkOutline ${isActive ? "text-brand-primary font-medium" : ""}`} onClick={closeMobile}>
                  <UserCircle size={18} /> Conta
                </NavLink>
                <div className="mt-2 flex gap-2 border-t border-gray-100 pt-3 dark:border-brand-darkOutline">
                  <button className="btn-secondary flex-1 justify-center" onClick={() => { toggleTheme(); closeMobile(); }}>
                    <SunMoon size={16} /> Tema
                  </button>
                  <button className="btn-primary flex-1 justify-center" onClick={() => { logout(); closeMobile(); }}>
                    <LogOut size={16} /> Sair
                  </button>
                </div>
              </>
            ) : (
              <Link className="btn-primary mt-2 justify-center" to="/login" onClick={closeMobile}>Entrar</Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

function CalendarDropdownContent({ calendarLoading, calendarOverview, onClose }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-400 dark:text-brand-textMuted">Agenda</p>
        <Link className="text-xs text-brand-primary" to="/calendar" onClick={onClose}>Ver tudo</Link>
      </div>
      <div className="mt-3 space-y-3 text-sm">
        {calendarLoading && <p className="text-xs text-gray-400 dark:text-brand-textMuted">Carregando...</p>}
        {!calendarLoading && calendarOverview.today.length === 0 && calendarOverview.upcoming.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-brand-textMuted">Nenhum evento agendado.</p>
        )}
        {calendarOverview.today.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-brand-textMuted">Hoje</p>
            <div className="mt-2 space-y-2">
              {calendarOverview.today.map((item) => (
                <Link key={item.id} to={`/projects/${item.projectId}`} className="block rounded-lg border border-gray-100 p-2 text-xs text-gray-600 dark:border-brand-darkOutline dark:text-brand-textMuted" onClick={onClose}>
                  {item.title} · {new Date(item.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </Link>
              ))}
            </div>
          </div>
        )}
        {calendarOverview.upcoming.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-brand-textMuted">Próximos</p>
            <div className="mt-2 space-y-2">
              {calendarOverview.upcoming.map((item) => (
                <Link key={item.id} to={`/projects/${item.projectId}`} className="block rounded-lg border border-gray-100 p-2 text-xs text-gray-600 dark:border-brand-darkOutline dark:text-brand-textMuted" onClick={onClose}>
                  {item.title} · {new Date(item.startsAt).toLocaleDateString("pt-BR")}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function NotificationsDropdownContent({ loading, error, notifications, unreadCount, handleReadAll, loadNotifications, formatRelative, onClose }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-400 dark:text-brand-textMuted">Notificações</p>
        {unreadCount > 0 && (
          <button className="text-xs text-brand-primary" onClick={handleReadAll}>Marcar todas como lidas</button>
        )}
      </div>
      <div className="mt-3 max-h-80 space-y-2 overflow-y-auto text-sm">
        {loading && <p className="text-gray-500 dark:text-brand-textMuted">Carregando...</p>}
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200">
            <p>{error}</p>
            <button className="mt-2 text-xs text-brand-primary" onClick={loadNotifications}>Tentar novamente</button>
          </div>
        )}
        {!loading && !error && notifications.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-200 p-3 text-center text-gray-500 dark:border-brand-darkOutline dark:text-brand-textMuted">
            <p>Nenhuma notificação ainda</p>
            <p className="text-xs">Interaja com outros artistas para começar</p>
          </div>
        )}
        {!loading && !error && notifications.map((item) => (
          <Link
            key={item.id}
            to={item.link || "/feed"}
            className={`flex items-start gap-3 rounded-lg p-2 transition ${
              item.readAt
                ? "bg-gray-50 text-gray-600 dark:bg-brand-darkOutline/70 dark:text-brand-textMuted"
                : "bg-brand-primary/5 text-gray-800 dark:bg-brand-darkOutline dark:text-brand-text"
            }`}
            onClick={onClose}
          >
            {item.actor?.avatarUrl ? (
              <img src={item.actor.avatarUrl} alt={item.actor.name} className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary/20 text-xs font-semibold text-brand-primary">
                {item.actor?.name?.[0] || "?"}
              </div>
            )}
            <div className="flex-1">
              <p>{item.message}</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-brand-textMuted">{formatRelative(item.createdAt)}</p>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

export default Header;
