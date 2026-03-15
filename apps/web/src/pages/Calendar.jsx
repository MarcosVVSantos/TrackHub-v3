import { useEffect, useState } from "react";
import { Calendar as CalendarIcon, RefreshCcw } from "lucide-react";
import { apiRequest, getAccessToken } from "../api/client";
import Skeleton from "../components/Skeleton";

function Calendar() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadEvents() {
    try {
      setLoading(true);
      setError("");
      const token = getAccessToken();
      const data = await apiRequest("/calendar", { token });
      setEvents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-brand-primary">Agenda</h2>
          <p className="text-sm text-gray-500 dark:text-brand-textMuted">Eventos de projetos próprios e compartilhados.</p>
        </div>
        <button className="btn-secondary" onClick={loadEvents} type="button">
          <RefreshCcw size={16} />
          Atualizar
        </button>
      </div>

      {loading && <Skeleton lines={8} />}

      {!loading && error && (
        <div className="card border border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200">
          <p>{error}</p>
          <button className="mt-2 text-xs text-brand-primary" onClick={loadEvents}>
            Tentar novamente
          </button>
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <div className="card flex items-center gap-3 text-sm text-gray-500 dark:text-brand-textMuted">
          <CalendarIcon size={18} />
          Nenhum evento agendado.
        </div>
      )}

      {!loading && !error && events.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((event) => (
            <div key={event.id} className="card space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-base font-semibold text-brand-primary">{event.title}</p>
                <span className="text-xs text-gray-400 dark:text-brand-textMuted">
                  {new Date(event.startsAt).toLocaleString("pt-BR")}
                </span>
              </div>
              {event.project?.name && (
                <p className="text-xs text-gray-500 dark:text-brand-textMuted">Projeto: {event.project.name}</p>
              )}
              {event.description && <p className="text-sm text-gray-600 dark:text-brand-textMuted">{event.description}</p>}
              <div className="flex flex-wrap gap-2 text-xs text-gray-400 dark:text-brand-textMuted">
                {(event.participants || []).map((participant) => (
                  <span key={participant.id}>@{participant.user?.username || participant.userId}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Calendar;
