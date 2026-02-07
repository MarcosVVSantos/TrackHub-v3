import { useEffect, useState } from "react";
import { X, Info } from "lucide-react";
import { apiRequest, getAccessToken } from "../../api/client";

function ProjectHistoryDrawer({ open, project, onClose }) {
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadHistory() {
      if (!open || !project) return;
      try {
        const token = getAccessToken();
        const data = await apiRequest(`/projects/${project.id}/history`, { token });
        setHistory(data);
      } catch (err) {
        setError(err.message);
      }
    }

    loadHistory();
  }, [open, project]);

  if (!open || !project) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
  <div className="h-full w-full max-w-md bg-white p-6 shadow-xl dark:bg-brand-darkSecondary">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info size={16} />
            <h3 className="text-lg font-semibold text-brand-primary">Histórico de status</h3>
          </div>
          <button type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">Projeto: {project.name}</p>
        <div className="mt-4 space-y-3 text-sm">
          {error && <p className="text-sm text-red-500">{error}</p>}
          {history.map((item) => (
            <div key={item.id} className="rounded-xl border border-gray-100 p-3">
              <p className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleString("pt-BR")}</p>
              <p className="mt-1 text-sm text-brand-primary">
                {item.fromStatus} → {item.toStatus}
              </p>
            </div>
          ))}
          {history.length === 0 && !error && (
            <p className="text-xs text-gray-500">Nenhuma mudança registrada.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProjectHistoryDrawer;
