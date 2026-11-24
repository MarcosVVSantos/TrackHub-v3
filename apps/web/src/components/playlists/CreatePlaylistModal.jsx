import { useState } from "react";
import { X, Loader2, ListMusic } from "lucide-react";
import { apiRequest } from "../../api/client";

export default function CreatePlaylistModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", description: "", isPublic: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  function handleClose() {
    setForm({ name: "", description: "", isPublic: true });
    setError("");
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const playlist = await apiRequest("/playlists", {
        method: "POST",
        body: form,
      });
      onCreated(playlist);
      handleClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-brand-darkSecondary p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-brand-primary">Nova playlist</h3>
            <p className="text-xs text-gray-500">Curate tracks de projetos públicos</p>
          </div>
          <button type="button" onClick={handleClose}>
            <X size={18} />
          </button>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <input
            className="input"
            placeholder="Nome da playlist *"
            value={form.name}
            maxLength={100}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <textarea
            className="input resize-none"
            placeholder="Descrição (opcional)"
            value={form.description}
            maxLength={500}
            rows={3}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <select
            className="input"
            value={form.isPublic ? "public" : "private"}
            onChange={(e) => setForm({ ...form, isPublic: e.target.value === "public" })}
          >
            <option value="public">Pública</option>
            <option value="private">Privada</option>
          </select>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-secondary" onClick={handleClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loading || !form.name.trim()}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : <ListMusic size={15} />}
              Criar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
