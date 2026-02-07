import { Link, NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Bell,
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
  const [open, setOpen] = useState(false);
  const initials = user?.name
    ? user.name
        .split(" ")
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
    : "";

  useEffect(() => {
    async function loadNotifications() {
      if (!user) return;
      const token = getAccessToken();
      if (!token) return;
      const data = await apiRequest("/notifications", { token });
      setNotifications(data);
    }
    loadNotifications();
  }, [user]);

  async function handleRead(id) {
    const token = getAccessToken();
    await apiRequest(`/notifications/${id}/read`, { method: "PUT", token });
    setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item)));
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
                <button className="btn-secondary" onClick={() => setOpen((value) => !value)}>
                  <Bell size={16} />
                  Notificações
                </button>
                {open && (
                  <div className="absolute right-0 mt-2 w-72 rounded-xl border border-gray-100 bg-white p-3 shadow-lg dark:border-brand-darkOutline dark:bg-brand-darkSecondary">
                    <p className="text-xs font-semibold text-gray-400 dark:text-brand-textMuted">Recentes</p>
                    <div className="mt-2 space-y-2 text-sm">
                      {notifications.length === 0 && (
                        <p className="text-gray-500 dark:text-brand-textMuted">Sem notificações</p>
                      )}
                      {notifications.map((item) => (
                        <div key={item.id} className="rounded-lg bg-gray-50 p-2 dark:bg-brand-darkOutline">
                          <p className="text-gray-600 dark:text-brand-text">{item.message}</p>
                          {!item.readAt && (
                            <button className="mt-2 text-xs text-brand-primary" onClick={() => handleRead(item.id)}>
                              Marcar como lida
                            </button>
                          )}
                        </div>
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
              <div className="flex items-center gap-2">
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
              </div>
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
