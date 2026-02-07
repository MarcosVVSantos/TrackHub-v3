import { useState } from "react";
import { X, UserPlus, Loader2 } from "lucide-react";
import { apiRequest, getAccessToken } from "../../api/client";

function AddPartnerModal({ open, project, onClose }) {
  const [form, setForm] = useState({ email: "", username: "", role: "viewer" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (!open || !project) return null;

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const token = getAccessToken();
      await apiRequest(`/projects/${project.id}/invite`, {
        method: "POST",
        body: form,
        token,
      });
      setMessage("Convite enviado com sucesso!");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
  <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-brand-darkSecondary">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-brand-primary">Adicionar parceiro</h3>
            <p className="text-xs text-gray-500">Projeto: {project.name}</p>
          </div>
          <button type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <input
            className="input"
            placeholder="Email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
          <input
            className="input"
            placeholder="Username"
            value={form.username}
            onChange={(event) => setForm({ ...form, username: event.target.value })}
          />
          <select
            className="input"
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value })}
          >
            <option value="owner">Owner</option>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          {error && <p className="text-sm text-red-500">{error}</p>}
          {message && <p className="text-sm text-green-500">{message}</p>}
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" type="button" onClick={onClose}>
              Fechar
            </button>
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              Enviar convite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddPartnerModal;
