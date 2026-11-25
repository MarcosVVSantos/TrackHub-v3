const { z } = require("zod");
const { isPublicStorageUrl } = require("../services/storageService");
const { STATUSES } = require("./projectInput");

// Tipos de evento. Os rótulos em português ficam no front.
const EVENT_TYPES = ["show", "battle", "open_mic", "party", "other"];
const LINEUP_STATUSES = ["invited", "confirmed", "declined"];

// Texto opcional: "" e null viram null (apaga o campo); undefined mantém como está.
const optionalText = (max, label) =>
  z
    .union([z.string().trim().max(max, `${label} com no máximo ${max} caracteres`), z.null()])
    .optional()
    .transform((value) => (value === "" ? null : value));

const dateField = (label) =>
  z.coerce.date({ errorMap: () => ({ message: `${label} inválida` }) }).refine((d) => !Number.isNaN(d.getTime()), `${label} inválida`);

const optionalDate = (label) => z.union([dateField(label), z.null(), z.literal("").transform(() => null)]).optional();

// Só links http(s). Bloqueia javascript:, data: e afins, que viram XSS num <a href>.
const ticketUrl = z
  .union([
    z
      .string()
      .trim()
      .max(500, "Link de ingresso muito longo")
      .url("Link de ingresso inválido")
      .refine((value) => /^https?:\/\//i.test(value), "O link de ingresso precisa começar com http:// ou https://"),
    z.literal("").transform(() => null),
    z.null(),
  ])
  .optional();

// A capa (flyer) precisa ter sido enviada para o nosso armazenamento, igual à capa de projeto.
const coverUrl = z
  .union([
    z.string().refine(isPublicStorageUrl, "Flyer inválido. Envie a imagem pelo upload de capa."),
    z.literal("").transform(() => null),
    z.null(),
  ])
  .optional();

const eventFields = {
  name: z.string().trim().min(1, "Informe o nome do evento").max(100, "Nome com no máximo 100 caracteres"),
  description: optionalText(2000, "Descrição"),
  type: z.enum(EVENT_TYPES, { errorMap: () => ({ message: "Tipo de evento inválido" }) }),
  startsAt: dateField("Data de início"),
  endsAt: optionalDate("Data de fim"),
  venueName: optionalText(120, "Nome do local"),
  venueAddress: optionalText(200, "Endereço"),
  ticketUrl,
  coverUrl,
  callOpen: z.boolean().optional(),
  callDeadline: optionalDate("Prazo de inscrição"),
  callSlots: z
    .union([z.number().int("Vagas precisa ser um número inteiro").min(1, "Vagas deve ser pelo menos 1").max(500, "No máximo 500 vagas"), z.null()])
    .optional(),
};

// Regras que dependem de mais de um campo. "current" é o evento como está no banco (na edição).
function checkDates(data, ctx, current = {}) {
  const startsAt = data.startsAt ?? current.startsAt;
  const endsAt = data.endsAt !== undefined ? data.endsAt : current.endsAt;
  const callDeadline = data.callDeadline !== undefined ? data.callDeadline : current.callDeadline;

  if (startsAt && endsAt && endsAt < startsAt) {
    ctx.addIssue({ code: "custom", path: ["endsAt"], message: "O fim precisa ser depois do início" });
  }
  if (startsAt && callDeadline && callDeadline > (endsAt || startsAt)) {
    ctx.addIssue({ code: "custom", path: ["callDeadline"], message: "As inscrições precisam fechar até o dia do evento" });
  }
}

const createEventSchema = z
  .object({
    ...eventFields,
    type: eventFields.type.default("show"),
    ownerRoleLabel: z.string().trim().max(60).optional(),
  })
  .superRefine((data, ctx) => checkDates(data, ctx));

const updateEventSchema = z.object({
  ...Object.fromEntries(Object.entries(eventFields).map(([key, schema]) => [key, schema.optional()])),
  status: z.enum(STATUSES, { errorMap: () => ({ message: "Etapa inválida" }) }).optional(),
});

function parseCreateEvent(body) {
  return createEventSchema.parse(body || {});
}

function parseUpdateEvent(body, current) {
  return updateEventSchema.superRefine((data, ctx) => checkDates(data, ctx, current)).parse(body || {});
}

// "21:30". Guardado como texto porque é só o horário de palco, sem fuso.
const startTime = z
  .union([
    z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário no formato 21:30"),
    z.literal("").transform(() => null),
    z.null(),
  ])
  .optional();

// Cachê em centavos (R$ 300,00 = 30000). Inteiro evita erro de arredondamento.
const feeCents = z
  .union([z.number().int("Cachê inválido").min(0, "Cachê não pode ser negativo").max(100_000_000, "Cachê alto demais"), z.null()])
  .optional();

const slotFields = {
  name: z.string().trim().min(1, "Informe o nome da atração").max(80, "Nome com no máximo 80 caracteres"),
  role: z.string().trim().min(1, "Informe a função").max(40, "Função com no máximo 40 caracteres"),
  startTime,
  feeCents,
  notes: optionalText(500, "Observação"),
};

// Ou convida alguém com conta (userId), ou adiciona só pelo nome.
const createSlotSchema = z
  .object({
    userId: z.string().min(1).max(40).optional(),
    name: slotFields.name.optional(),
    role: slotFields.role,
    startTime,
    feeCents,
    notes: slotFields.notes,
  })
  .refine((data) => data.userId || data.name, { message: "Escolha um artista ou informe o nome da atração", path: ["name"] });

const updateSlotSchema = z.object({
  name: slotFields.name.optional(),
  role: slotFields.role.optional(),
  startTime,
  feeCents,
  notes: slotFields.notes,
  status: z.enum(LINEUP_STATUSES, { errorMap: () => ({ message: "Status inválido" }) }).optional(),
});

const reorderSchema = z.object({
  ids: z.array(z.string().min(1).max(40)).min(1).max(200),
});

const respondSchema = z.object({ accept: z.boolean({ required_error: "Informe se aceita ou recusa" }) });

// Transforma o nome em um endereço legível: "Batalha da Leste #12" -> "batalha-da-leste-12".
function slugify(name) {
  const slug = String(name)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return slug || "evento";
}

module.exports = {
  EVENT_TYPES,
  LINEUP_STATUSES,
  parseCreateEvent,
  parseUpdateEvent,
  createSlotSchema,
  updateSlotSchema,
  reorderSchema,
  respondSchema,
  slugify,
};
