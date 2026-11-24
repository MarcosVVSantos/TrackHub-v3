import { useState } from "react";
import { CalendarPlus, Pencil } from "lucide-react";
import { apiRequest } from "../../api/client";
import { EmptyState, ErrorNote } from "../ui/States";
import { AvatarStack } from "../ui/Avatar";
import { dayLabel, hourLabel } from "../../lib/format";

const EMPTY = { title: "", description: "", startsAt: "", endsAt: "", participantIds: [] };

// datetime-local trabalha no horário local; toISOString() converteria para UTC e mudaria a hora.
function toLocalInput(date) {
  if (!date) return "";
  const value = new Date(date);
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function AgendaTab({ project, team, canEdit, onChange }) {
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const events = project.events || [];
  const upcoming = events.filter((item) => new Date(item.endsAt || item.startsAt) >= new Date());
  const past = events.filter((item) => !upcoming.includes(item));

  function toggle(userId) {
    setForm((prev) => ({
      ...prev,
      participantIds: prev.participantIds.includes(userId) ? prev.participantIds.filter((id) => id !== userId) : [...prev.participantIds, userId],
    }));
  }

  function edit(item) {
    setEditingId(item.id);
    setForm({
      title: item.title || "",
      description: item.description || "",
      startsAt: toLocalInput(item.startsAt),
      endsAt: toLocalInput(item.endsAt),
      participantIds: item.participants?.map((participant) => participant.userId) || [],
    });
    document.getElementById("ev-title")?.focus();
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = {
        ...form,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      };
      const base = `/calendar/projects/${project.id}/events`;
      await apiRequest(editingId ? `${base}/${editingId}` : base, { method: editingId ? "PUT" : "POST", body });
      setForm(EMPTY);
      setEditingId(null);
      await onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const renderList = (list) => (
    <ul className="flex flex-col">
      {list.map((item) => (
        <li key={item.id} className="flex items-start gap-4 border-b border-th-line px-5 py-4 last:border-0">
          <div className="w-20 flex-none text-sm">
            <p className="font-semibold">{dayLabel(item.startsAt)}</p>
            <p className="text-th-muted">{hourLabel(item.startsAt)}</p>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{item.title}</p>
            {item.description && <p className="mt-0.5 text-sm text-th-text2">{item.description}</p>}
            {item.participants?.length > 0 && (
              <div className="mt-2">
                <AvatarStack users={item.participants.map((participant) => participant.user).filter(Boolean)} />
              </div>
            )}
          </div>
          {canEdit && (
            <button type="button" className="btn-ghost h-10 w-10 px-0" onClick={() => edit(item)} aria-label={`Editar ${item.title}`}>
              <Pencil size={16} aria-hidden="true" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-5">
        {events.length === 0 ? (
          <EmptyState icon={CalendarPlus} title="Nada agendado" text="Marque sessões de gravação, entregas e reuniões da faixa." />
        ) : (
          <>
            <section className="card p-0" aria-label="Próximos">
              <h2 className="border-b border-th-line px-5 py-4 font-semibold">Próximos</h2>
              {upcoming.length ? renderList(upcoming) : <p className="px-5 py-4 text-sm text-th-muted">Nenhum evento futuro.</p>}
            </section>
            {past.length > 0 && (
              <details className="card p-0">
                <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-th-muted">Já aconteceram ({past.length})</summary>
                {renderList(past)}
              </details>
            )}
          </>
        )}
      </div>

      {canEdit && (
        <form onSubmit={submit} className="card flex flex-col gap-4 self-start">
          <h2 className="font-semibold">{editingId ? "Editar evento" : "Novo evento"}</h2>
          <div>
            <label className="label" htmlFor="ev-title">
              Título
            </label>
            <input id="ev-title" className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="ev-start">
                Início
              </label>
              <input id="ev-start" type="datetime-local" className="input" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} required />
            </div>
            <div>
              <label className="label" htmlFor="ev-end">
                Fim
              </label>
              <input id="ev-end" type="datetime-local" className="input" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="ev-desc">
              Descrição
            </label>
            <textarea id="ev-desc" rows={3} className="input" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </div>
          {team.length > 0 && (
            <fieldset>
              <legend className="label">Quem participa</legend>
              <div className="flex flex-wrap gap-2">
                {team.map((person) => (
                  <button key={person.id} type="button" className="chip" aria-pressed={form.participantIds.includes(person.id)} onClick={() => toggle(person.id)}>
                    {person.name}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          <ErrorNote>{error}</ErrorNote>
          <div className="flex justify-end gap-2">
            {editingId && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setEditingId(null);
                  setForm(EMPTY);
                }}
              >
                Cancelar
              </button>
            )}
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Salvando..." : editingId ? "Salvar" : "Agendar"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
