import Meeting from "../models/Meeting.js";
import { sendSuccess } from "../utils/apiResponse.js";
import AppError from "../utils/AppError.js";
import { logActivity } from "../utils/activityLogger.js";

// GET /meetings
export const getAllMeetings = async (req, res) => {
  const { month, year, status, type, date } = req.query;
  const filter = { owner: req.user._id };

  if (status) filter.status = status;
  if (type)   filter.type   = type;

  if (month && year) {
    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 0, 23, 59, 59);
    filter.date = { $gte: start, $lte: end };
  }

  if (date) {
    const d     = new Date(date);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const end   = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
    filter.date = { $gte: start, $lte: end };
  }

  const meetings = await Meeting.find(filter)
    .populate("client",  "name company")
    .populate("lead",    "name phone")
    .populate("project", "title")
    .sort({ date: 1, startTime: 1 })
    .lean();

  sendSuccess(res, 200, "Meetings fetched", { meetings, total: meetings.length });
};

// GET /meetings/upcoming
export const getUpcoming = async (req, res) => {
  const now = new Date();
  const meetings = await Meeting.find({
    owner: req.user._id,
    date: { $gte: now },
    status: "Scheduled",
  })
    .populate("client", "name")
    .populate("lead",   "name")
    .sort({ date: 1 })
    .limit(10)
    .lean();

  sendSuccess(res, 200, "Upcoming meetings", { meetings });
};

// GET /meetings/today
export const getTodayMeetings = async (req, res) => {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const meetings = await Meeting.find({
    owner: req.user._id,
    date:  { $gte: start, $lte: end },
  })
    .populate("client", "name")
    .populate("lead",   "name")
    .sort({ startTime: 1 })
    .lean();

  sendSuccess(res, 200, "Today meetings", { meetings });
};

// GET /meetings/:id
export const getMeetingById = async (req, res) => {
  const meeting = await Meeting.findOne({ _id: req.params.id, owner: req.user._id })
    .populate("client",  "name company email phone")
    .populate("lead",    "name phone email")
    .populate("project", "title status");
  if (!meeting) throw new AppError("Meeting not found", 404);
  sendSuccess(res, 200, "Meeting fetched", { meeting });
};

// POST /meetings
export const createMeeting = async (req, res) => {
  const { title, description, date, startTime, endTime, type, status, priority, location, meetingLink, client, lead, project, notes } = req.body;
  const meeting = await Meeting.create({
    owner: req.user._id,
    title, description, date, startTime, endTime,
    type, status, priority, location, meetingLink,
    client:  client  || null,
    lead:    lead    || null,
    project: project || null,
    notes,
  });

  await logActivity({
    owner: req.user._id,
    entityType: "meeting",
    entityId: meeting._id,
    entityName: meeting.title,
    project: project || null,
    client:  client  || null,
    action: "created",
    description: `Meeting "${meeting.title}" scheduled on ${new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`,
    page: "calendar",
    icon: "calendar-plus",
    color: "#6366f1",
  });

  sendSuccess(res, 201, "Meeting created", { meeting });
};

// PUT /meetings/:id
export const updateMeeting = async (req, res) => {
  const existing = await Meeting.findOne({ _id: req.params.id, owner: req.user._id });
  if (!existing) throw new AppError("Meeting not found", 404);

  const meeting = await Meeting.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id },
    req.body,
    { new: true, runValidators: true }
  );

  await logActivity({
    owner: req.user._id,
    entityType: "meeting",
    entityId: meeting._id,
    entityName: meeting.title,
    project: meeting.project || null,
    client:  meeting.client  || null,
    action: "updated",
    description: `Meeting "${meeting.title}" was updated`,
    page: "calendar",
    icon: "pencil",
    color: "#f59e0b",
  });

  sendSuccess(res, 200, "Meeting updated", { meeting });
};

// DELETE /meetings/:id
export const deleteMeeting = async (req, res) => {
  const meeting = await Meeting.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!meeting) throw new AppError("Meeting not found", 404);

  await logActivity({
    owner: req.user._id,
    entityType: "meeting",
    entityId: meeting._id,
    entityName: meeting.title,
    project: meeting.project || null,
    client:  meeting.client  || null,
    action: "deleted",
    description: `Meeting "${meeting.title}" was deleted`,
    page: "calendar",
    icon: "trash-2",
    color: "#ef4444",
  });

  sendSuccess(res, 200, "Meeting deleted");
};

// PATCH /meetings/:id/status
export const updateStatus = async (req, res) => {
  const { status } = req.body;
  const meeting = await Meeting.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id },
    { status },
    { new: true }
  );
  if (!meeting) throw new AppError("Meeting not found", 404);

  const actionMap = {
    Completed:   "completed",
    Cancelled:   "cancelled",
    Rescheduled: "rescheduled",
  };

  await logActivity({
    owner: req.user._id,
    entityType: "meeting",
    entityId: meeting._id,
    entityName: meeting.title,
    project: meeting.project || null,
    client:  meeting.client  || null,
    action: actionMap[status] || "status_changed",
    description: `Meeting "${meeting.title}" marked as ${status}`,
    changes: [{ field: "status", from: null, to: status }],
    page: "calendar",
    icon: status === "Completed" ? "check-circle" : status === "Cancelled" ? "x-circle" : "refresh-cw",
    color: status === "Completed" ? "#10b981" : status === "Cancelled" ? "#ef4444" : "#f59e0b",
  });

  sendSuccess(res, 200, "Status updated", { meeting });
};
