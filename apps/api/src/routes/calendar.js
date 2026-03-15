const express = require("express");
const authenticate = require("../middleware/auth");
const controller = require("../controllers/calendarController");

const router = express.Router();

router.get("/overview", authenticate, controller.listOverview);
router.get("/", authenticate, controller.listCalendar);

router.get("/projects/:id/events", authenticate, controller.listProjectEvents);
router.post("/projects/:id/events", authenticate, controller.createProjectEvent);
router.put("/projects/:id/events/:eventId", authenticate, controller.updateProjectEvent);

router.post("/projects/:id/calendar-share", authenticate, controller.inviteCalendarShare);
router.post("/projects/:id/calendar-share/accept", authenticate, controller.acceptCalendarShare);
router.post("/projects/:id/calendar-share/decline", authenticate, controller.declineCalendarShare);

module.exports = router;
