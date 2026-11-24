import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../api/client";
import Modal from "../ui/Modal";
import { ErrorNote } from "../ui/States";
import { STAGES } from "../../lib/format";

const GENRES = ["Trap", "R&B", "Boom bap", "Funk", "Pop", "Drill", "Rap", "MPB", "Lo-fi", "Eletrônica"];

export default function CreateProjectModal({ open, onClose, onCreated, defaultStatus = "idea" }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", description: "", status: defaultStatus, bpm: "" });
  const [tags, setTags] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function toggleTag(tag) {
    setTags((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag].slice(0, 10)));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const project = await apiRequest("/projects", {
        method: "POST",
        body: { ...form, bpm: form.bpm ? Number(form.bpm) : null, tags, isPublic: false },
      });
      onCreated?.(project);
      onClose();
      setForm({ name: "", description: "", status: defaultStatus, bpm: "" });
      setTags([]);
      navigate(`/projects/${project.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo projeto"
      description="Comece pelo básico. Capa, parceiros e versões você adiciona depois."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="np-name" className="label">
            Nome da faixa
          </label>
          <input
            id="np-name"
            className="input"
            required
            maxLength={100}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Noite em SP"
          />
        </div>
        <div>
          <label htmlFor="np-desc" className="label">
            Descrição <span className="text-th-muted">(opcional)</span>
          </label>
          <textarea
            id="np-desc"
            className="input min-h-[80px]"
            maxLength={2000}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Referências, clima, o que falta"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="np-status" className="label">
              Etapa
            </label>
            <select id="np-status" className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STAGES.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="np-bpm" className="label">
              BPM <span className="text-th-muted">(opcional)</span>
            </label>
            <input
              id="np-bpm"
              className="input"
              type="number"
              min={40}
              max={300}
              value={form.bpm}
              onChange={(e) => setForm({ ...form, bpm: e.target.value })}
              placeholder="94"
            />
          </div>
        </div>
        <fieldset>
          <legend className="label">Gêneros</legend>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((genre) => (
              <button key={genre} type="button" className="chip" aria-pressed={tags.includes(genre)} onClick={() => toggleTag(genre)}>
                {genre}
              </button>
            ))}
          </div>
        </fieldset>
        <p className="text-[13px] text-th-muted">O projeto começa privado: só quem você convidar vê. Para publicar, envie uma capa na página do projeto.</p>
        <ErrorNote>{error}</ErrorNote>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Criando…" : "Criar projeto"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export { GENRES };
