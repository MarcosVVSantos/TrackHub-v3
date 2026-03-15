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
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { apiRequest, getAccessToken } from "../api/client";

function Header() {
  const { user, logout } = useAuth();
  const { toggleTheme } = useTheme() || {};
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarOverview, setCalendarOverview] = useState({ today: [], upcoming: [] });
  const [calendarLoading, setCalendarLoading] = useState(false);
  const initials = user?.name
    ? user.name
        .split(" ")
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
    : "";

  async function loadNotifications() {
    if (!user) return;
    const token = getAccessToken();
    if (!token) return;
    try {
      setLoading(true);
      setError("");
      const data = await apiRequest("/notifications", { token });
      setNotifications(data.items || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadCalendarOverview() {
    if (!user) return;
    const token = getAccessToken();
    if (!token) return;
    try {
      setCalendarLoading(true);
      const data = await apiRequest("/calendar/overview", { token });
      setCalendarOverview(data);
    } catch (err) {
      setCalendarOverview({ today: [], upcoming: [] });
    } finally {
      setCalendarLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 45000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (calendarOpen) {
      loadCalendarOverview();
    }
  }, [calendarOpen]);

  async function handleReadAll() {
    const token = getAccessToken();
    if (!token) return;
    await apiRequest("/notifications/read-all", { method: "PUT", token });
    setNotifications((prev) => prev.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
    setUnreadCount(0);
  }

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

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur dark:border-brand-darkOutline dark:bg-brand-dark/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="text-xl font-semibold text-brand-primary">
          TrackHub
        </Link>
        <nav className="flex items-center gap-4 text-sm text-gray-600 dark:text-brand-textMuted">
          <NavLink to="/feed" className="flex items-center gap-2 hover:text-brand-primary dark:hover:text-brand-text">
            <Globe size={16} />
            Feed
          </NavLink>
          {user && (
            <>
              <NavLink to="/dashboard" className="flex items-center gap-2 hover:text-brand-primary dark:hover:text-brand-text">
                <LayoutDashboard size={16} />
                Dashboard
              </NavLink>
              <NavLink to="/calendar" className="flex items-center gap-2 hover:text-brand-primary dark:hover:text-brand-text">
                <Calendar size={16} />
                Agenda
              </NavLink>
              <NavLink to="/projects" className="flex items-center gap-2 hover:text-brand-primary dark:hover:text-brand-text">
                <FolderKanban size={16} />
                Projetos
              </NavLink>
              <NavLink to="/account" className="flex items-center gap-2 hover:text-brand-primary dark:hover:text-brand-text">
                <UserCircle size={16} />
                Conta
              </NavLink>
            </>
          )}
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="relative">
                <button
                  className="relative flex h-10 w-10 items-center justify-center rounded-full border border-transparent text-gray-600 transition hover:bg-gray-100 dark:text-brand-textMuted dark:hover:bg-brand-darkOutline"
                  onClick={() => setCalendarOpen((prev) => !prev)}
                  aria-label="Agenda"
                >
                  <Calendar size={18} />
                </button>
                {calendarOpen && (
                  <div className="absolute right-0 mt-2 w-80 rounded-xl border border-gray-100 bg-white p-3 shadow-lg dark:border-brand-darkOutline dark:bg-brand-darkSecondary">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-400 dark:text-brand-textMuted">Agenda</p>
                      <Link className="text-xs text-brand-primary" to="/calendar" onClick={() => setCalendarOpen(false)}>
                        Ver tudo
                      </Link>
                    </div>
                    <div className="mt-3 space-y-3 text-sm">
                      {calendarLoading && <p className="text-xs text-gray-400">Carregando...</p>}
                      {!calendarLoading && calendarOverview.today.length === 0 && calendarOverview.upcoming.length === 0 && (
                        <p className="text-xs text-gray-400">Nenhum evento agendado.</p>
                      )}
                      {calendarOverview.today.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500">Hoje</p>
                          <div className="mt-2 space-y-2">
                            {calendarOverview.today.map((item) => (
                              <Link
                                key={item.id}
                                to={`/projects/${item.projectId}`}
                                className="block rounded-lg border border-gray-100 p-2 text-xs text-gray-600 dark:border-brand-darkOutline dark:text-brand-textMuted"
                                onClick={() => setCalendarOpen(false)}
                              >
                                {item.title} · {new Date(item.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                      {calendarOverview.upcoming.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500">Próximos</p>
                          <div className="mt-2 space-y-2">
                            {calendarOverview.upcoming.map((item) => (
                              <Link
                                key={item.id}
                                to={`/projects/${item.projectId}`}
                                className="block rounded-lg border border-gray-100 p-2 text-xs text-gray-600 dark:border-brand-darkOutline dark:text-brand-textMuted"
                                onClick={() => setCalendarOpen(false)}
                              >
                                {item.title} · {new Date(item.startsAt).toLocaleDateString("pt-BR")}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="relative">
                <button
                  className="relative flex h-10 w-10 items-center justify-center rounded-full border border-transparent text-gray-600 transition hover:bg-gray-100 dark:text-brand-textMuted dark:hover:bg-brand-darkOutline"
                  onClick={() => {
                    const next = !open;
                    setOpen(next);
                    if (next) {
                      handleReadAll();
                    }
                  }}
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
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-400 dark:text-brand-textMuted">Notificações</p>
                      {unreadCount > 0 && (
                        <button className="text-xs text-brand-primary" onClick={handleReadAll}>
                          Marcar todas como lidas
                        </button>
                      )}
                    </div>
                    <div className="mt-3 max-h-80 space-y-2 overflow-y-auto text-sm">
                      {loading && <p className="text-gray-500 dark:text-brand-textMuted">Carregando...</p>}
                      {error && (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200">
                          <p>{error}</p>
                          <button className="mt-2 text-xs text-brand-primary" onClick={loadNotifications}>
                            Tentar novamente
                          </button>
                        </div>
                      )}
                      {!loading && !error && notifications.length === 0 && (
                        <div className="rounded-lg border border-dashed border-gray-200 p-3 text-center text-gray-500 dark:border-brand-darkOutline dark:text-brand-textMuted">
                          <p>Nenhuma notificação ainda</p>
                          <p className="text-xs">Interaja com outros artistas para começar</p>
                        </div>
                      )}
                      {!loading &&
                        !error &&
                        notifications.map((item) => (
                          <Link
                            key={item.id}
                            to={item.link || "/feed"}
                            className={`flex items-start gap-3 rounded-lg p-2 transition ${
                              item.readAt
                                ? "bg-gray-50 text-gray-600 dark:bg-brand-darkOutline/70 dark:text-brand-textMuted"
                                : "bg-brand-primary/5 text-gray-800 dark:bg-brand-darkOutline dark:text-brand-text"
                            }`}
                            onClick={() => setOpen(false)}
                          >
                            {item.actor?.avatarUrl ? (
                              <img
                                src={item.actor.avatarUrl}
                                alt={item.actor.name}
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-primary/20 text-xs font-semibold text-brand-primary">
                                {item.actor?.name?.[0] || "?"}
                              </div>
                            )}
                            <div className="flex-1">
                              <p>{item.message}</p>
                              <p className="mt-1 text-xs text-gray-400 dark:text-brand-textMuted">
                                {formatRelative(item.createdAt)}
                              </p>
                            </div>
                          </Link>
                        ))}
                    </div>
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
              <Link to={`/profile/${user.username}`} className="flex items-center gap-2" title="Meu perfil">
                {user.avatarUrl ? (
                  <img
                    className="h-10 w-10 rounded-full border border-gray-200 object-cover dark:border-brand-darkOutline"
                    src={user.avatarUrl}
                    alt={user.name}
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-accent/30 text-sm font-semibold text-brand-primary">
                    {initials}
                  </div>
                )}
              </Link>
            </>
          ) : (
            <Link className="btn-primary" to="/login">
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
