import Meeting from "../models/Meeting.js";
import { sendSuccess } from "../utils/apiResponse.js";
import AppError from "../utils/AppError.js";

// GET /meetings
export const getAllMeetings = async (req, res) => {
  const { month, year, status, type, date } = req.query;
  const filter = { owner: req.user._id };

  if (status) filter.status = status;
  if (type)   filter.type   = type;

  // Filter by month/year
  if (month && year) {
    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 0, 23, 59, 59);
    filter.date = { $gte: start, $lte: end };
  }

  // Filter by specific date
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
    client: client || null,
    lead:   lead   || null,
    project:project|| null,
    notes,
  });
  sendSuccess(res, 201, "Meeting created", { meeting });
};

// PUT /meetings/:id
export const updateMeeting = async (req, res) => {
  const meeting = await Meeting.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!meeting) throw new AppError("Meeting not found", 404);
  sendSuccess(res, 200, "Meeting updated", { meeting });
};

// DELETE /meetings/:id
export const deleteMeeting = async (req, res) => {
  const meeting = await Meeting.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!meeting) throw new AppError("Meeting not found", 404);
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
  sendSuccess(res, 200, "Status updated", { meeting });
};
