const calendarService = require("../services/calendarService");

async function listOverview(req, res, next) {
  try {
    const data = await calendarService.listCalendarOverview(req.user.sub);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

async function listCalendar(req, res, next) {
  try {
    const { start, end } = req.query;
    const data = await calendarService.listCalendarEvents(req.user.sub, {
      start: start ? new Date(start) : undefined,
      end: end ? new Date(end) : undefined,
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
}

async function listProjectEvents(req, res, next) {
  try {
    const data = await calendarService.listProjectEvents(req.user.sub, req.params.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

async function createProjectEvent(req, res, next) {
  try {
    const data = await calendarService.createProjectEvent(req.user.sub, req.params.id, req.body);
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
}

async function updateProjectEvent(req, res, next) {
  try {
    const data = await calendarService.updateProjectEvent(
      req.user.sub,
      req.params.id,
      req.params.eventId,
      req.body
    );
    res.json(data);
  } catch (error) {
    next(error);
  }
}

async function inviteCalendarShare(req, res, next) {
  try {
    const data = await calendarService.inviteCalendarShare(req.user.sub, req.params.id, req.body.memberId);
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
}

async function acceptCalendarShare(req, res, next) {
  try {
    const data = await calendarService.acceptCalendarShare(req.user.sub, req.params.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

async function declineCalendarShare(req, res, next) {
  try {
    const data = await calendarService.declineCalendarShare(req.user.sub, req.params.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listOverview,
  listCalendar,
  listProjectEvents,
  createProjectEvent,
  updateProjectEvent,
  inviteCalendarShare,
  acceptCalendarShare,
  declineCalendarShare,
};
