import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Trash2, UserPlus, Check, Clock, X, Mic2 } from "lucide-react";
import { apiRequest } from "../../api/client";
import { Avatar } from "../ui/Avatar";
import { EmptyState, ErrorNote } from "../ui/States";
import { LINEUP_ROLES, LINEUP_STATUS, centsToInput, money, parseMoney } from "../../lib/events";

const STATUS_ICON = { confirmed: Check, invited: Clock, declined: X };

// Campos compartilhados entre "convidar", "adicionar sem conta" e "editar".
function SlotFields({ value, onChange, showFee, idPrefix }) {
  const set = (field) => (e) => onChange({ ...value, [field]: e.target.value });
  return (
    <>
      <label className="flex min-w-[130px] flex-1 flex-col gap-1.5 text-[13px] font-medium text-th-text2" htmlFor={`${idPrefix}-role`}>
        Função
        <input id={`${idPrefix}-role`} list="lineup-roles" className="input" maxLength={40} value={value.role} onChange={set("role")} placeholder="MC" />
      </label>
      <label className="flex w-[110px] flex-col gap-1.5 text-[13px] font-medium text-th-text2" htmlFor={`${idPrefix}-time`}>
        Horário
        <input id={`${idPrefix}-time`} type="time" className="input" value={value.startTime} onChange={set("startTime")} />
      </label>
      {showFee && (
        <label className="flex w-[130px] flex-col gap-1.5 text-[13px] font-medium text-th-text2" htmlFor={`${idPrefix}-fee`}>
          Cachê (R$)
          <input id={`${idPrefix}-fee`} inputMode="decimal" className="input" maxLength={12} value={value.fee} onChange={set("fee")} placeholder="Opcional" />
        </label>
      )}
    </>
  );
}

function toBody(value) {
  const feeCents = parseMoney(value.fee);
  if (Number.isNaN(feeCents)) throw new Error("Cachê inválido. Use só números, como 300 ou 150,50.");
  if (!value.role.trim()) throw new Error("Informe a função da atração.");
  return { role: value.role.trim(), startTime: value.startTime || null, feeCents };
}

const BLANK = { role: "", startTime: "", fee: "" };

function InvitePanel({ eventId, existingUserIds, showFee, onAdded }) {
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState([]);
  const [picked, setPicked] = useState(null);
  const [fields, setFields] = useState(BLANK);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Espera a pessoa parar de digitar antes de buscar (evita uma busca por tecla).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setPeople([]);
      return undefined;
    }
    const timer = setTimeout(() => {
      apiRequest(`/users/explore?q=${encodeURIComponent(q)}`)
        .then((list) => setPeople(list.slice(0, 6)))
        .catch(() => setPeople([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  function pick(person) {
    setPicked(person);
    setFields((prev) => ({ ...prev, role: prev.role || person.role || "" }));
  }

  async function invite(e) {
    e.preventDefault();
    setError("");
    try {
      const body = { ...toBody(fields), userId: picked.id };
      setSaving(true);
      await apiRequest(`/events/${eventId}/lineup`, { method: "POST", body });
      setPicked(null);
      setQuery("");
      setFields(BLANK);
      onAdded(`${picked.name} foi convidado e recebeu uma notificação.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card flex flex-col gap-3 border-th-hover">
      {!picked ? (
        <>
          <label htmlFor="busca-artista" className="label mb-0">
            Buscar artista no TrackHub
          </label>
          <input id="busca-artista" type="search" className="input" autoComplete="off" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nome, @usuário ou cidade" />
          {query.trim().length >= 2 && people.length === 0 && <p className="text-sm text-th-muted">Ninguém encontrado. Quem não tem conta entra por “Adicionar sem conta”.</p>}
          <ul className="flex flex-col gap-1.5">
            {people.map((person) => {
              const already = existingUserIds.includes(person.id);
              return (
                <li key={person.id} className="flex items-center gap-3 rounded-[10px] bg-th-bg p-2">
                  <Avatar user={person} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{person.name}</span>
                    <span className="block truncate text-xs text-th-muted">{["@" + person.username, person.role, person.city].filter(Boolean).join(" · ")}</span>
                  </span>
                  <button type="button" className="btn-secondary min-h-[40px] text-sm" disabled={already} onClick={() => pick(person)}>
                    {already ? "No line-up" : "Escolher"}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <form onSubmit={invite} className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Avatar user={picked} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{picked.name}</span>
              <span className="block text-xs text-th-muted">@{picked.username}</span>
            </span>
            <button type="button" className="btn-ghost" onClick={() => setPicked(null)}>
              Trocar
            </button>
          </div>
          <div className="flex flex-wrap items-end gap-2.5">
            <SlotFields value={fields} onChange={setFields} showFee={showFee} idPrefix="inv" />
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Convidando…" : "Convidar"}
            </button>
          </div>
          <ErrorNote>{error}</ErrorNote>
        </form>
      )}
    </div>
  );
}

function AddPanel({ eventId, showFee, onAdded }) {
  const [name, setName] = useState("");
  const [fields, setFields] = useState(BLANK);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function add(e) {
    e.preventDefault();
    setError("");
    try {
      if (!name.trim()) throw new Error("Informe o nome da atração.");
      const body = { ...toBody(fields), name: name.trim() };
      setSaving(true);
      await apiRequest(`/events/${eventId}/lineup`, { method: "POST", body });
      setName("");
      setFields(BLANK);
      onAdded(`${body.name} entrou no line-up.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={add} className="card flex flex-col gap-3 border-th-hover">
      <div className="flex flex-wrap items-end gap-2.5">
        <label className="flex min-w-[180px] flex-[2] flex-col gap-1.5 text-[13px] font-medium text-th-text2" htmlFor="add-name">
          Nome da atração
          <input id="add-name" className="input" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Trio Ruído" />
        </label>
        <SlotFields value={fields} onChange={setFields} showFee={showFee} idPrefix="add" />
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Adicionando…" : "Adicionar"}
        </button>
      </div>
      <p className="text-xs text-th-muted">Para quem ainda não tem conta. A equipe atualiza o status quando a atração confirmar.</p>
      <ErrorNote>{error}</ErrorNote>
    </form>
  );
}

function SlotRow({ slot, index, total, canEdit, showFee, onMove, onSave, onRemove, busy }) {
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState(BLANK);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const status = LINEUP_STATUS[slot.status] || LINEUP_STATUS.invited;
  const StatusIcon = STATUS_ICON[slot.status] || Clock;
  const person = slot.user || { id: slot.id, name: slot.name };

  function startEdit() {
    setFields({ role: slot.role, startTime: slot.startTime || "", fee: centsToInput(slot.feeCents) });
    setNotes(slot.notes || "");
    setError("");
    setEditing(true);
  }

  async function save(e) {
    e.preventDefault();
    try {
      const body = toBody(fields);
      if (!showFee) delete body.feeCents;
      await onSave(slot, { ...body, ...(showFee ? { notes: notes.trim() } : {}) });
      setEditing(false);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <li className="border-b border-th-line px-2.5 py-2.5 last:border-0">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="w-[48px] font-mono text-[15px] font-semibold">{slot.startTime || "—"}</span>
        <Avatar user={person} />
        <span className="min-w-0 flex-[1_1_120px]">
          <span className="block truncate text-[15px] font-semibold">{slot.name}</span>
          <span className="block truncate text-[13px] text-th-muted">{slot.user ? `@${slot.user.username}` : "Sem conta no TrackHub"}</span>
        </span>
        <span className="rounded-[10px] bg-th-raised px-2.5 py-1 text-center text-[13px] text-th-text">{slot.role}</span>
        {canEdit ? (
          <label className="flex items-center gap-1.5">
            <span className="sr-only">Status de {slot.name}</span>
            <StatusIcon size={14} aria-hidden="true" style={{ color: status.color }} />
            <select
              value={slot.status}
              disabled={busy}
              onChange={(e) => onSave(slot, { status: e.target.value })}
              className="min-h-[36px] w-[118px] rounded-lg border border-th-line bg-th-bg px-2 text-[13px] font-semibold"
              style={{ color: status.color }}
            >
              {Object.entries(LINEUP_STATUS).map(([id, item]) => (
                <option key={id} value={id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span className="inline-flex w-[118px] items-center gap-1.5 text-[13px] font-semibold" style={{ color: status.color }}>
            <StatusIcon size={14} aria-hidden="true" />
            {status.label}
          </span>
        )}
        {showFee && <span className="w-[72px] text-right text-[13px] text-th-text2">{slot.feeCents !== null && slot.feeCents !== undefined ? money(slot.feeCents) : "—"}</span>}
        {canEdit && (
          <span className="flex">
            <button type="button" className="btn-ghost h-9 min-h-[36px] w-9 px-0" aria-label={`Subir ${slot.name}`} disabled={busy || index === 0} onClick={() => onMove(index, -1)}>
              <ChevronUp size={16} aria-hidden="true" />
            </button>
            <button type="button" className="btn-ghost h-9 min-h-[36px] w-9 px-0" aria-label={`Descer ${slot.name}`} disabled={busy || index === total - 1} onClick={() => onMove(index, 1)}>
              <ChevronDown size={16} aria-hidden="true" />
            </button>
            <button type="button" className="btn-ghost h-9 min-h-[36px] w-9 px-0" aria-label={`Editar ${slot.name}`} aria-expanded={editing} onClick={() => (editing ? setEditing(false) : startEdit())}>
              <Pencil size={15} aria-hidden="true" />
            </button>
            <button type="button" className="btn-ghost h-9 min-h-[36px] w-9 px-0 hover:text-th-danger" aria-label={`Tirar ${slot.name} do line-up`} disabled={busy} onClick={() => onRemove(slot)}>
              <Trash2 size={15} aria-hidden="true" />
            </button>
          </span>
        )}
      </div>
      {showFee && slot.notes && !editing && <p className="ml-[100px] mt-1 text-xs text-th-muted">Obs.: {slot.notes}</p>}
      {editing && (
        <form onSubmit={save} className="mt-3 flex flex-col gap-2.5 rounded-xl bg-th-bg p-3">
          <div className="flex flex-wrap items-end gap-2.5">
            <SlotFields value={fields} onChange={setFields} showFee={showFee} idPrefix={`ed-${slot.id}`} />
          </div>
          {showFee && (
            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-th-text2" htmlFor={`ed-${slot.id}-notes`}>
              Observação interna
              <input id={`ed-${slot.id}-notes`} className="input" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: pix no dia, leva o próprio DJ" />
            </label>
          )}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary min-h-[40px] text-sm" disabled={busy}>
              Salvar
            </button>
            <button type="button" className="btn-secondary min-h-[40px] text-sm" onClick={() => setEditing(false)}>
              Cancelar
            </button>
          </div>
          <ErrorNote>{error}</ErrorNote>
        </form>
      )}
    </li>
  );
}

export default function LineupTab({ event, canEdit, onChange }) {
  const [lineup, setLineup] = useState(event.lineup || []);
  const [panel, setPanel] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  // A API só manda o cachê para dona e editores; aqui só decide se mostra a coluna.
  const showFee = canEdit;

  useEffect(() => setLineup(event.lineup || []), [event.lineup]);

  async function run(action, message) {
    setError("");
    setBusy(true);
    try {
      await action();
      if (message) setNotice(message);
      await onChange();
    } catch (err) {
      setError(err.message);
      await onChange();
    } finally {
      setBusy(false);
    }
  }

  function move(index, delta) {
    const next = lineup.slice();
    const target = index + delta;
    [next[index], next[target]] = [next[target], next[index]];
    setLineup(next); // mostra a nova ordem na hora; se falhar, recarrega
    run(() => apiRequest(`/events/${event.id}/lineup/order`, { method: "PUT", body: { ids: next.map((slot) => slot.id) } }));
  }

  const save = (slot, body) => run(() => apiRequest(`/events/${event.id}/lineup/${slot.id}`, { method: "PATCH", body }));

  function remove(slot) {
    if (!window.confirm(`Tirar ${slot.name} do line-up?`)) return;
    run(() => apiRequest(`/events/${event.id}/lineup/${slot.id}`, { method: "DELETE" }), `${slot.name} saiu do line-up.`);
  }

  function added(message) {
    setPanel("");
    setNotice(message);
    onChange();
  }

  const summary = event.lineupSummary || {};
  const pending = summary.invited || 0;

  return (
    <div className="flex flex-col gap-3.5">
      <datalist id="lineup-roles">
        {LINEUP_ROLES.map((role) => (
          <option key={role} value={role} />
        ))}
      </datalist>

      {canEdit && (
        <div className="flex flex-wrap items-center gap-2.5">
          <p className="flex-[1_1_240px] text-sm text-th-muted">Use as setas para mudar a ordem de apresentação.</p>
          <button type="button" className="btn-secondary" aria-expanded={panel === "add"} onClick={() => setPanel(panel === "add" ? "" : "add")}>
            Adicionar sem conta
          </button>
          <button type="button" className="btn-primary" aria-expanded={panel === "invite"} onClick={() => setPanel(panel === "invite" ? "" : "invite")}>
            <UserPlus size={18} aria-hidden="true" /> Convidar artista
          </button>
        </div>
      )}

      {canEdit && panel === "invite" && (
        <InvitePanel eventId={event.id} existingUserIds={lineup.map((slot) => slot.userId).filter(Boolean)} showFee={showFee} onAdded={added} />
      )}
      {canEdit && panel === "add" && <AddPanel eventId={event.id} showFee={showFee} onAdded={added} />}

      <ErrorNote>{error}</ErrorNote>
      {notice && (
        <p role="status" className="text-sm text-stage-finished">
          {notice}
        </p>
      )}

      {lineup.length === 0 ? (
        <EmptyState
          icon={Mic2}
          title="Line-up vazio"
          text={canEdit ? "Convide artistas do TrackHub ou adicione atrações que ainda não têm conta." : "Quando a equipe montar o line-up, ele aparece aqui."}
        />
      ) : (
        <ol aria-label="Line-up em ordem de apresentação" className="card p-1.5">
          {lineup.map((slot, index) => (
            <SlotRow
              key={slot.id}
              slot={slot}
              index={index}
              total={lineup.length}
              canEdit={canEdit}
              showFee={showFee}
              busy={busy}
              onMove={move}
              onSave={save}
              onRemove={remove}
            />
          ))}
        </ol>
      )}

      {lineup.length > 0 && (
        <p className="text-[13px] text-th-muted">
          {pending > 0 ? `${pending} ${pending === 1 ? "atração ainda não confirmou" : "atrações ainda não confirmaram"}. ` : "Todo mundo respondeu. "}
          {showFee && summary.feeTotalCents !== undefined && `Cachê só a equipe com edição vê. Total previsto (sem quem recusou): ${money(summary.feeTotalCents)}.`}
        </p>
      )}
    </div>
  );
}
