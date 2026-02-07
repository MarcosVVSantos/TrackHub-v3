import { useEffect, useMemo, useState } from "react";
import { X, Save, Loader2 } from "lucide-react";
import { apiRequest, getAccessToken } from "../../api/client";

const statusOptions = [
  { value: "idea", label: "Ideia" },
  { value: "in_progress", label: "Em andamento" },
  { value: "production", label: "Produção" },
  { value: "finished", label: "Finalizado" },
];

function EditProjectModal({ open, project, onClose, onUpdated, tagsSuggestions }) {
  const [form, setForm] = useState({ name: "", description: "", status: "idea" });
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && project) {
      setForm({
        name: project.name || "",
        description: project.description || "",
        status: project.status || "idea",
      });
      setTags(project.tags || []);
    }
  }, [open, project]);

  const suggested = useMemo(() => {
    return (tagsSuggestions || []).filter(
      (tag) => tag.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(tag)
    );
  }, [tagsSuggestions, tagInput, tags]);

  function handleTagKeyDown(event) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      const value = tagInput.trim();
      if (!value) return;
      if (!tags.includes(value)) {
        setTags((prev) => [...prev, value]);
      }
      setTagInput("");
    }
  }

  function removeTag(tagToRemove) {
    setTags((prev) => prev.filter((tag) => tag !== tagToRemove));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!project) return;
    setLoading(true);
    setError("");
    try {
      const token = getAccessToken();
      await apiRequest(`/projects/${project.id}`, {
        method: "PUT",
        body: { ...form, tags },
        token,
      });
      onUpdated();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!open || !project) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
  <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-brand-darkSecondary">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-brand-primary">Editar projeto</h3>
            <p className="text-xs text-gray-500">Atualize os detalhes principais.</p>
          </div>
          <button type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
          <input
            className="input"
            placeholder="Nome do projeto"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
          />
          <textarea
            className="input"
            placeholder="Descrição"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
          <select
            className="input"
            value={form.status}
            onChange={(event) => setForm({ ...form, status: event.target.value })}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="space-y-2">
            <input
              className="input"
              placeholder="Digite e pressione Enter para adicionar tags"
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              onKeyDown={handleTagKeyDown}
            />
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-2 rounded-full bg-brand-accent/20 px-3 py-1 text-xs text-brand-primary"
                >
                  #{tag}
                  <button
                    type="button"
                    className="text-xs text-brand-primary/70 hover:text-brand-primary"
                    onClick={() => removeTag(tag)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            {suggested.length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                {suggested.slice(0, 6).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="rounded-full border border-gray-200 px-2 py-1 hover:border-brand-primary hover:text-brand-primary"
                    onClick={() => {
                      setTags((prev) => [...prev, tag]);
                      setTagInput("");
                    }}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button className="btn-secondary" type="button" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Salvar alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditProjectModal;
