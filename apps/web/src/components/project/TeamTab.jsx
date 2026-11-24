import { useState } from "react";
import { UserPlus } from "lucide-react";
import { apiRequest } from "../../api/client";
import { Avatar } from "../ui/Avatar";
import Modal from "../ui/Modal";
import { ErrorNote } from "../ui/States";

const ROLE_LABEL = { owner: "Dono", editor: "Editor", viewer: "Ouvinte" };

// Quem está no projeto, convites e agenda compartilhada.
export default function TeamTab({ project, currentUser, isOwner, currentMember, onChange }) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [error, setError] = useState("");
  const members = project.members || [];
  const accepted = members.filter((member) => member.status === "accepted" && member.role !== "owner");
  const pending = members.filter((member) => member.status === "pending");

  async function run(action) {
    setError("");
    try {
      await action();
      await onChange();
    } catch (err) {
      setError(err.message);
    }
  }

  const setRole = (member, role) => run(() => apiRequest(`/projects/${project.id}/roles`, { method: "PUT", body: { memberId: member.id, role } }));
  const shareCalendar = (member) =>
    run(() => apiRequest(`/calendar/projects/${project.id}/calendar-share`, { method: "POST", body: { memberId: member.userId } }));
  const answerCalendar = (action) => run(() => apiRequest(`/calendar/projects/${project.id}/calendar-share/${action}`, { method: "POST" }));
  function remove(member) {
    if (!window.confirm(`Remover ${member.user?.name || "este parceiro"} do projeto?`)) return;
    run(() => apiRequest(`/projects/${project.id}/partner/${member.userId}`, { method: "DELETE" }));
  }

  return (
    <div className="flex flex-col gap-5">
      {currentMember?.calendarShareStatus === "pending" && !isOwner && (
        <div className="card flex flex-wrap items-center gap-3 border-th-lilac/40">
          <p className="flex-1 text-sm">O dono convidou você para compartilhar a agenda deste projeto.</p>
          <button type="button" className="btn-secondary" onClick={() => answerCalendar("decline")}>
            Recusar
          </button>
          <button type="button" className="btn-primary" onClick={() => answerCalendar("accept")}>
            Aceitar
          </button>
        </div>
      )}
      <ErrorNote>{error}</ErrorNote>

      <section className="card p-0" aria-labelledby="equipe">
        <div className="flex items-center gap-3 border-b border-th-line px-5 py-4">
          <h2 id="equipe" className="flex-1 font-semibold">
            Equipe
          </h2>
          {isOwner && (
            <button type="button" className="btn-secondary" onClick={() => setInviteOpen(true)}>
              <UserPlus size={16} aria-hidden="true" /> Convidar
            </button>
          )}
        </div>
        <ul>
          <li className="flex items-center gap-3 border-b border-th-line px-5 py-3">
            <Avatar user={project.owner} />
            <div className="flex-1">
              <p className="text-sm font-semibold">
                {project.owner?.name} {project.owner?.id === currentUser?.id && <span className="text-th-muted">(você)</span>}
              </p>
              <p className="text-xs text-th-muted">Dono do projeto</p>
            </div>
          </li>
          {accepted.map((member) => (
            <li key={member.id} className="flex flex-wrap items-center gap-3 border-b border-th-line px-5 py-3 last:border-0">
              <Avatar user={member.user} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {member.user?.name || member.inviteEmail} {member.userId === currentUser?.id && <span className="text-th-muted">(você)</span>}
                </p>
                <p className="text-xs text-th-muted">
                  {member.roleLabel ? `${member.roleLabel} · ` : ""}
                  {ROLE_LABEL[member.role] || member.role}
                </p>
              </div>
              {isOwner && member.userId !== currentUser?.id && (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="input h-10 w-auto py-0 text-xs"
                    value={member.role}
                    onChange={(event) => setRole(member, event.target.value)}
                    aria-label={`Papel de ${member.user?.name}`}
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Ouvinte</option>
                  </select>
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    disabled={member.calendarShareStatus === "pending" || member.calendarShareStatus === "accepted"}
                    onClick={() => shareCalendar(member)}
                  >
                    {member.calendarShareStatus === "accepted"
                      ? "Agenda compartilhada"
                      : member.calendarShareStatus === "pending"
                        ? "Agenda: convite enviado"
                        : "Compartilhar agenda"}
                  </button>
                  <button type="button" className="btn-ghost text-xs text-th-warn" onClick={() => remove(member)}>
                    Remover
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {isOwner && pending.length > 0 && (
        <section className="card" aria-labelledby="pendentes">
          <h2 id="pendentes" className="mb-3 font-semibold">
            Convites pendentes
          </h2>
          <ul className="flex flex-col gap-2 text-sm text-th-text2">
            {pending.map((member) => (
              <li key={member.id}>
                {member.user?.name || member.inviteEmail} · {ROLE_LABEL[member.role]} · aguardando resposta
              </li>
            ))}
          </ul>
        </section>
      )}

      <InviteModal open={inviteOpen} project={project} onClose={() => setInviteOpen(false)} onSent={onChange} />
    </div>
  );
}

export function InviteModal({ open, project, onClose, onSent, initialUsername = "" }) {
  const [form, setForm] = useState({ email: "", username: initialUsername, role: "editor", roleLabel: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await apiRequest(`/projects/${project.id}/invite`, { method: "POST", body: form });
      setMessage("Convite enviado! A pessoa vai ver em Convites.");
      setForm({ email: "", username: "", role: "editor", roleLabel: "" });
      onSent?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Convidar para o projeto" description={project?.name}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className="label" htmlFor="inv-user">
            Usuário ou e-mail
          </label>
          <input
            id="inv-user"
            className="input"
            placeholder="@usuario ou email@exemplo.com"
            value={form.username || form.email}
            onChange={(event) => {
              const value = event.target.value.trim();
              setForm({ ...form, email: value.includes("@") && !value.startsWith("@") ? value : "", username: value.includes("@") && !value.startsWith("@") ? "" : value.replace(/^@/, "") });
            }}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="inv-label">
            Função na faixa (opcional)
          </label>
          <input id="inv-label" className="input" maxLength={60} placeholder="Ex: voz, beat, mix" value={form.roleLabel} onChange={(event) => setForm({ ...form, roleLabel: event.target.value })} />
        </div>
        <fieldset>
          <legend className="label">O que a pessoa pode fazer</legend>
          <div className="flex flex-col gap-2">
            {[
              ["editor", "Editor", "Envia versões, cria tarefas e eventos"],
              ["viewer", "Ouvinte", "Só ouve e comenta"],
            ].map(([value, label, hint]) => (
              <label key={value} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 ${form.role === value ? "border-th-lilac bg-th-raised" : "border-th-line"}`}>
                <input type="radio" name="inv-role" className="mt-1 accent-[#D9B8E3]" checked={form.role === value} onChange={() => setForm({ ...form, role: value })} />
                <span>
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="text-xs text-th-muted">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <ErrorNote>{error}</ErrorNote>
        {message && <p className="text-sm text-stage-finished" role="status">{message}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Fechar
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Enviando..." : "Enviar convite"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
