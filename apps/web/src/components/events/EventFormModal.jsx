import { useEffect, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import Modal from "../ui/Modal";
import { ErrorNote } from "../ui/States";
import { apiRequest, apiUpload } from "../../api/client";
import { track } from "../../lib/analytics";
import { EVENT_TYPES, fromIso, toIso } from "../../lib/events";

const EMPTY = {
  name: "",
  type: "show",
  startDate: "",
  startTime: "20:00",
  endDate: "",
  endTime: "",
  venueName: "",
  venueAddress: "",
  ticketUrl: "",
  description: "",
  callOpen: false,
  callDeadline: "",
  callSlots: "",
};

function formFromEvent(event) {
  if (!event) return EMPTY;
  const info = event.eventInfo || {};
  const start = fromIso(info.startsAt);
  const end = fromIso(info.endsAt);
  return {
    name: event.name || "",
    type: info.type || "show",
    startDate: start.date,
    startTime: start.time,
    endDate: end.date,
    endTime: end.time,
    venueName: info.venueName || "",
    venueAddress: info.venueAddress || "",
    ticketUrl: info.ticketUrl || "",
    description: event.description || "",
    callOpen: Boolean(info.callOpen),
    callDeadline: fromIso(info.callDeadline).date,
    callSlots: info.callSlots ? String(info.callSlots) : "",
  };
}

// Criar e editar evento usam o mesmo formulário.
// Na edição, o flyer só aparece para a dona (a rota de capa é só do dono do projeto).
export default function EventFormModal({ open, event, canChangeFlyer = true, onClose, onSaved }) {
  const editing = Boolean(event);
  const [form, setForm] = useState(EMPTY);
  const [flyer, setFlyer] = useState(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef(null);

  useEffect(() => {
    if (!open) return;
    setForm(formFromEvent(event));
    setFlyer(null);
    setPreview("");
    setError("");
  }, [open, event]);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  function pickFlyer(file) {
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) return setError("O flyer precisa ser PNG ou JPG.");
    if (file.size > 5 * 1024 * 1024) return setError("O flyer pode ter no máximo 5 MB.");
    setError("");
    setFlyer(file);
    setPreview(URL.createObjectURL(file));
  }

  function buildBody() {
    if (!form.name.trim()) throw new Error("Informe o nome do evento.");
    if (!form.startDate) throw new Error("Informe a data de início.");
    const startsAt = toIso(form.startDate, form.startTime);
    // Sem data de fim, mas com hora de fim: considera o mesmo dia (ou o seguinte, se virar a noite).
    let endsAt = null;
    if (form.endTime || form.endDate) {
      endsAt = toIso(form.endDate || form.startDate, form.endTime || "23:59");
      if (!form.endDate && endsAt && new Date(endsAt) < new Date(startsAt)) {
        const next = new Date(endsAt);
        next.setDate(next.getDate() + 1);
        endsAt = next.toISOString();
      }
      if (new Date(endsAt) < new Date(startsAt)) throw new Error("O fim precisa ser depois do início.");
    }
    const slots = String(form.callSlots).trim() ? Number(form.callSlots) : null;
    // Prazo vai até o fim do dia escolhido, mas nunca depois do evento.
    let callDeadline = form.callDeadline ? toIso(form.callDeadline, "23:59") : null;
    const limit = endsAt || startsAt;
    if (callDeadline && new Date(callDeadline) > new Date(limit)) {
      if (form.callDeadline > (form.endDate || form.startDate)) throw new Error("As inscrições precisam fechar até o dia do evento.");
      callDeadline = limit;
    }
    if (slots !== null && (!Number.isInteger(slots) || slots < 1)) throw new Error("Vagas precisa ser um número inteiro maior que zero.");
    return {
      name: form.name.trim(),
      type: form.type,
      startsAt,
      endsAt,
      venueName: form.venueName.trim(),
      venueAddress: form.venueAddress.trim(),
      ticketUrl: form.ticketUrl.trim(),
      description: form.description.trim(),
      callOpen: form.callOpen,
      // Fechar a chamada mantém prazo e vagas guardados, para reabrir depois.
      ...(form.callOpen ? { callDeadline, callSlots: slots } : {}),
    };
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    let body;
    try {
      body = buildBody();
    } catch (err) {
      return setError(err.message);
    }
    setSaving(true);
    try {
      const saved = editing
        ? await apiRequest(`/events/${event.id}`, { method: "PUT", body })
        : await apiRequest("/events", { method: "POST", body });
      let coverUrl = saved.coverUrl;
      if (flyer) {
        const data = new FormData();
        data.append("cover", flyer);
        try {
          coverUrl = (await apiUpload(`/projects/${saved.id}/cover`, data)).coverUrl;
        } catch (err) {
          // O evento já foi salvo; só o flyer falhou. Avisa sem perder o resto.
          onSaved?.({ ...saved, coverUrl }, `Evento salvo, mas o flyer não foi enviado: ${err.message}`);
          return;
        }
      }
      if (!editing) track("evento_criado", { tipo: body.type, inscricoes: body.callOpen });
      onSaved?.({ ...saved, coverUrl });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const currentFlyer = preview || event?.coverUrl;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? "Editar evento" : "Novo evento"}
      description={editing ? undefined : "Ele começa em Planejamento. Dá para editar tudo depois."}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="event-form" className="btn-primary" disabled={saving}>
            {saving ? "Salvando…" : editing ? "Salvar" : "Criar evento"}
          </button>
        </>
      }
    >
      <form id="event-form" onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <div>
          <label htmlFor="ev-name" className="label">
            Nome do evento
          </label>
          <input id="ev-name" className="input" maxLength={100} required value={form.name} onChange={set("name")} placeholder="Ex.: Batalha da Leste #12" />
        </div>

        <fieldset>
          <legend className="label">Tipo</legend>
          <div role="radiogroup" aria-label="Tipo do evento" className="flex flex-wrap gap-2">
            {EVENT_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                role="radio"
                aria-checked={form.type === type.id}
                onClick={() => setForm((prev) => ({ ...prev, type: type.id }))}
                className={`min-h-[44px] rounded-full border px-4 text-sm font-semibold transition ${
                  form.type === type.id ? "border-white bg-white text-th-bg" : "border-th-line2 text-th-text2 hover:border-th-hover"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="label">Quando</legend>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <label className="flex flex-col gap-1.5 text-xs text-th-muted">
              Data de início
              <input type="date" className="input" required value={form.startDate} onChange={set("startDate")} />
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-th-muted">
              Hora de início
              <input type="time" className="input" value={form.startTime} onChange={set("startTime")} />
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-th-muted">
              Data de fim
              <input type="date" className="input" value={form.endDate} min={form.startDate || undefined} onChange={set("endDate")} />
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-th-muted">
              Hora de fim
              <input type="time" className="input" value={form.endTime} onChange={set("endTime")} />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend className="label">Local</legend>
          <div className="grid gap-2.5 sm:grid-cols-[1fr_1.4fr]">
            <label className="flex flex-col gap-1.5 text-xs text-th-muted">
              Nome do local
              <input className="input" maxLength={120} value={form.venueName} onChange={set("venueName")} placeholder="Casa de Cultura" />
            </label>
            <label className="flex flex-col gap-1.5 text-xs text-th-muted">
              Endereço
              <input className="input" maxLength={200} value={form.venueAddress} onChange={set("venueAddress")} placeholder="Rua, número · bairro, cidade" />
            </label>
          </div>
        </fieldset>

        {canChangeFlyer && (
          <div>
            <span id="ev-flyer" className="label">
              Flyer <span className="font-normal text-th-muted">(opcional)</span>
            </span>
            <div className="flex items-stretch gap-3.5">
              <div className="h-[120px] w-24 flex-none overflow-hidden rounded-[10px] border border-th-line bg-th-raised">
                {currentFlyer ? <img src={currentFlyer} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center p-2 text-center text-xs text-th-muted">Sem flyer</span>}
              </div>
              <button
                type="button"
                aria-describedby="ev-flyer"
                onClick={() => fileInput.current?.click()}
                className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-th-line2 p-3 text-center text-sm text-th-text2 hover:border-th-hover"
              >
                <ImagePlus size={22} aria-hidden="true" className="text-th-lilac" />
                <span>
                  <b className="text-th-text">{currentFlyer ? "Trocar flyer" : "Enviar flyer"}</b>
                </span>
                <span className="text-xs text-th-muted">PNG ou JPG, até 5 MB. Formato 4:5 fica melhor.</span>
              </button>
              <input ref={fileInput} type="file" accept="image/png,image/jpeg" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => pickFlyer(e.target.files?.[0])} />
            </div>
          </div>
        )}

        <div>
          <label htmlFor="ev-ticket" className="label">
            Link de ingresso <span className="font-normal text-th-muted">(opcional)</span>
          </label>
          <input id="ev-ticket" type="url" inputMode="url" className="input" maxLength={500} value={form.ticketUrl} onChange={set("ticketUrl")} placeholder="https://www.sympla.com.br/…" />
          <p className="mt-1.5 text-xs text-th-muted">Vira o botão “Comprar ingresso” na página pública do evento.</p>
        </div>

        <div>
          <label htmlFor="ev-desc" className="label">
            Descrição <span className="font-normal text-th-muted">(opcional)</span>
          </label>
          <textarea id="ev-desc" rows={3} className="input" maxLength={2000} value={form.description} onChange={set("description")} />
        </div>

        <div className="flex flex-col gap-3.5 rounded-[14px] border border-th-line bg-th-bg px-4 py-4">
          <div className="flex items-center gap-3.5">
            <span className="flex flex-1 flex-col gap-0.5">
              <span id="ev-call" className="text-[15px] font-semibold">
                Aceitar inscrições de artistas?
              </span>
              <span className="text-[13px] text-th-muted">A chamada aparece na página pública do evento, quando ela estiver publicada.</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={form.callOpen}
              aria-labelledby="ev-call"
              onClick={() => setForm((prev) => ({ ...prev, callOpen: !prev.callOpen }))}
              className={`flex h-[34px] w-[60px] flex-none rounded-full p-[3px] transition ${form.callOpen ? "justify-end bg-stage-finished" : "justify-start bg-th-line2"}`}
            >
              <span className="h-7 w-7 rounded-full bg-white" />
            </button>
            <span className="w-8 text-[13px] font-semibold text-th-text2">{form.callOpen ? "Sim" : "Não"}</span>
          </div>
          {form.callOpen && (
            <div className="grid grid-cols-2 gap-2.5">
              <label className="flex flex-col gap-1.5 text-xs text-th-muted">
                Inscrições até
                <input type="date" className="input" value={form.callDeadline} max={form.startDate || undefined} onChange={set("callDeadline")} />
              </label>
              <label className="flex flex-col gap-1.5 text-xs text-th-muted">
                Vagas (opcional)
                <input type="number" inputMode="numeric" min={1} max={500} className="input" value={form.callSlots} onChange={set("callSlots")} />
              </label>
            </div>
          )}
        </div>

        <ErrorNote>{error}</ErrorNote>
      </form>
    </Modal>
  );
}
