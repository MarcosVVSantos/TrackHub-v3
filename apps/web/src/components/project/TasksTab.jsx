import { useState } from "react";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { apiRequest } from "../../api/client";
import { Avatar } from "../ui/Avatar";
import { EmptyState, ErrorNote } from "../ui/States";
import { dayLabel } from "../../lib/format";

const FLAGS = { none: null, attention: { label: "Atenção", color: "#E0A458" }, blocked: { label: "Bloqueada", color: "#E57373" } };
const EMPTY = { title: "", description: "", flag: "none", dueDate: "", assigneeId: "" };

// Lista de tarefas do projeto: quem faz o quê e até quando.
export default function TasksTab({ project, team, canEdit, onChange }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const tasks = project.tasks || [];

  async function run(action) {
    setError("");
    try {
      await action();
      await onChange();
    } catch (err) {
      setError(err.message);
    }
  }

  async function create(event) {
    event.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    await run(() =>
      apiRequest(`/projects/${project.id}/tasks`, {
        method: "POST",
        body: { ...form, dueDate: form.dueDate || null, assigneeId: form.assigneeId || null },
      })
    );
    setForm(EMPTY);
    setSaving(false);
  }

  const toggle = (task) => run(() => apiRequest(`/projects/${project.id}/tasks/${task.id}`, { method: "PATCH", body: { done: !task.done } }));
  const remove = (task) => run(() => apiRequest(`/projects/${project.id}/tasks/${task.id}`, { method: "DELETE" }));
  const assign = (task, assigneeId) =>
    run(() => apiRequest(`/projects/${project.id}/tasks/${task.id}`, { method: "PATCH", body: { assigneeId: assigneeId || null } }));

  const open = tasks.filter((task) => !task.done).length;

  return (
    <div className="flex flex-col gap-5">
      {canEdit && (
        <form onSubmit={create} className="card grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
          <label className="sr-only" htmlFor="task-title">
            Nova tarefa
          </label>
          <input
            id="task-title"
            className="input"
            placeholder="Nova tarefa (ex: gravar voz guia)"
            value={form.title}
            maxLength={120}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
          <label className="sr-only" htmlFor="task-who">
            Responsável
          </label>
          <select id="task-who" className="input" value={form.assigneeId} onChange={(event) => setForm({ ...form, assigneeId: event.target.value })}>
            <option value="">Sem responsável</option>
            {team.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="task-due">
            Prazo
          </label>
          <input id="task-due" type="date" className="input" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} />
          <button type="submit" className="btn-primary" disabled={saving || !form.title.trim()}>
            <Plus size={16} aria-hidden="true" /> Adicionar
          </button>
          <div className="flex flex-wrap gap-2 md:col-span-4">
            {Object.entries({ none: "Normal", attention: "Atenção", blocked: "Bloqueada" }).map(([value, label]) => (
              <button key={value} type="button" className="chip" aria-pressed={form.flag === value} onClick={() => setForm({ ...form, flag: value })}>
                {label}
              </button>
            ))}
          </div>
        </form>
      )}
      <ErrorNote>{error}</ErrorNote>

      {tasks.length === 0 ? (
        <EmptyState title="Nenhuma tarefa ainda" text="Divida a faixa em passos: letra, guia, beat, mix, master." />
      ) : (
        <section className="card p-0" aria-label="Tarefas">
          <p className="border-b border-th-line px-5 py-3 text-sm text-th-muted">
            {open} em aberto · {tasks.length - open} feitas
          </p>
          <ul>
            {tasks.map((task) => {
              const flag = FLAGS[task.flag];
              const late = !task.done && task.dueDate && new Date(task.dueDate) < new Date(new Date().toDateString());
              return (
                <li key={task.id} className="flex flex-wrap items-center gap-3 border-b border-th-line px-5 py-3 last:border-0">
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-[#D9B8E3]"
                    checked={task.done}
                    disabled={!canEdit}
                    onChange={() => toggle(task)}
                    aria-label={`Marcar "${task.title}" como ${task.done ? "não feita" : "feita"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${task.done ? "text-th-muted line-through" : ""}`}>{task.title}</p>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-th-muted">
                      {flag && <span style={{ color: flag.color }}>{flag.label}</span>}
                      {task.dueDate && (
                        <span className={`inline-flex items-center gap-1 ${late ? "text-th-warn" : ""}`}>
                          <CalendarDays size={12} aria-hidden="true" />
                          {late ? "Atrasada · " : ""}
                          {dayLabel(task.dueDate)}
                        </span>
                      )}
                      {task.description && <span className="truncate">{task.description}</span>}
                    </div>
                  </div>
                  {canEdit ? (
                    <select
                      className="input h-10 w-auto py-0 text-xs"
                      value={task.assigneeId || ""}
                      onChange={(event) => assign(task, event.target.value)}
                      aria-label={`Responsável por ${task.title}`}
                    >
                      <option value="">Ninguém</option>
                      {team.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    task.assignee && <Avatar user={task.assignee} size="sm" />
                  )}
                  {canEdit && (
                    <button type="button" className="btn-ghost h-10 w-10 px-0" onClick={() => remove(task)} aria-label={`Excluir ${task.title}`}>
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
