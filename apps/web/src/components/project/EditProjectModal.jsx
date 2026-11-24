import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import Modal from "../ui/Modal";
import { ErrorNote } from "../ui/States";
import { GENRES } from "../projects/CreateProjectModal";

export default function EditProjectModal({ open, project, onClose, onSaved }) {
  const [form, setForm] = useState({ name: "", description: "", bpm: "" });
  const [tags, setTags] = useState([]);
  const [custom, setCustom] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !project) return;
    setForm({ name: project.name || "", description: project.description || "", bpm: project.bpm || "" });
    setTags(project.tags || []);
    setError("");
  }, [open, project]);

  const toggle = (tag) => setTags((list) => (list.includes(tag) ? list.filter((item) => item !== tag) : [...list, tag].slice(0, 10)));

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const updated = await apiRequest(`/projects/${project.id}`, {
        method: "PUT",
        body: { ...form, bpm: form.bpm ? Number(form.bpm) : null, tags },
      });
      onSaved?.(updated);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const options = [...new Set([...GENRES, ...tags])];

  return (
    <Modal open={open} onClose={onClose} title="Editar projeto" size="lg">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className="label" htmlFor="ep-name">
            Nome da faixa
          </label>
          <input id="ep-name" className="input" required maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="ep-desc">
            Descrição
          </label>
          <textarea id="ep-desc" className="input min-h-[80px]" maxLength={2000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </div>
        <div className="sm:w-40">
          <label className="label" htmlFor="ep-bpm">
            BPM
          </label>
          <input id="ep-bpm" type="number" min={40} max={300} className="input" value={form.bpm} onChange={(event) => setForm({ ...form, bpm: event.target.value })} />
        </div>
        <fieldset>
          <legend className="label">Gêneros e tags</legend>
          <div className="flex flex-wrap gap-2">
            {options.map((tag) => (
              <button key={tag} type="button" className="chip" aria-pressed={tags.includes(tag)} onClick={() => toggle(tag)}>
                {tag}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <label htmlFor="ep-tag" className="sr-only">
              Outra tag
            </label>
            <input
              id="ep-tag"
              className="input"
              maxLength={24}
              placeholder="Outra tag"
              value={custom}
              onChange={(event) => setCustom(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  if (custom.trim() && !tags.includes(custom.trim())) toggle(custom.trim());
                  setCustom("");
                }
              }}
            />
          </div>
        </fieldset>
        <ErrorNote>{error}</ErrorNote>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
