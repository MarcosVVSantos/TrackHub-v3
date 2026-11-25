const eventService = require("../services/eventService");

// Cada rota só chama o serviço e devolve o resultado; erros vão para o errorHandler.
const handle = (fn, status = 200) => async (req, res, next) => {
  try {
    res.status(status).json(await fn(req));
  } catch (error) {
    next(error);
  }
};

const WHEN = ["upcoming", "past", "all"];

module.exports = {
  listEvents: handle((req) =>
    eventService.listEvents(req.user.sub, { when: WHEN.includes(req.query.when) ? req.query.when : "upcoming" })
  ),
  createEvent: handle((req) => eventService.createEvent(req.user.sub, req.body), 201),
  getEvent: handle((req) => eventService.getEvent(req.user.sub, req.params.id)),
  updateEvent: handle((req) => eventService.updateEvent(req.user.sub, req.params.id, req.body)),
  archiveEvent: handle((req) => eventService.archiveEvent(req.user.sub, req.params.id)),

  addSlot: handle((req) => eventService.addSlot(req.user.sub, req.params.id, req.body), 201),
  updateSlot: handle((req) => eventService.updateSlot(req.user.sub, req.params.id, req.params.slotId, req.body)),
  removeSlot: handle((req) => eventService.removeSlot(req.user.sub, req.params.id, req.params.slotId)),
  reorderLineup: handle((req) => eventService.reorderLineup(req.user.sub, req.params.id, req.body)),

  listMyLineupInvites: handle((req) => eventService.listMyLineupInvites(req.user.sub)),
  respondToLineup: handle((req) => eventService.respondToLineup(req.user.sub, req.params.slotId, req.body)),
};
