import Milestone from "../models/Milestone.js";
import Project from "../models/Project.js";
import AppError from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";

// @desc  Get all milestones for a project
// @route GET /api/v1/milestones/project/:projectId
export const getMilestonesByProject = async (req, res) => {
  const project = await Project.findById(req.params.projectId);
  if (!project) throw new AppError("Project not found", 404);

  const milestones = await Milestone.find({ project: req.params.projectId })
    .sort({ order: 1, createdAt: 1 });

  sendSuccess(res, 200, "Milestones fetched", { milestones });
};

// @desc  Get all overdue/upcoming milestones (for dashboard alerts)
// @route GET /api/v1/milestones/alerts
export const getMilestoneAlerts = async (req, res) => {
  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [overdue, upcoming, pendingTotal] = await Promise.all([
    Milestone.find({
      status: { $in: ["Overdue", "Pending", "Partial"] },
      dueDate: { $lt: now },
    })
      .populate("project", "title")
      .populate("client", "name")
      .sort({ dueDate: 1 })
      .limit(10),

    Milestone.find({
      status: { $in: ["Pending", "Partial"] },
      dueDate: { $gte: now, $lte: sevenDaysLater },
    })
      .populate("project", "title")
      .populate("client", "name")
      .sort({ dueDate: 1 })
      .limit(10),

    Milestone.aggregate([
      { $match: { status: { $in: ["Pending", "Partial", "Overdue"] } } },
      { $group: { _id: null, total: { $sum: { $subtract: ["$amount", "$paidAmount"] } } } },
    ]),
  ]);

  sendSuccess(res, 200, "Alerts fetched", {
    overdue,
    upcoming,
    overdueCount: overdue.length,
    upcomingCount: upcoming.length,
    totalPending: pendingTotal[0]?.total || 0,
  });
};

// @desc  Create milestone
// @route POST /api/v1/milestones
export const createMilestone = async (req, res) => {
  const { project, title, percentage, amount, dueDate, notes, order } = req.body;

  const projectExists = await Project.findById(project);
  if (!projectExists) throw new AppError("Project not found", 404);

  const milestone = new Milestone({
    project,
    client: projectExists.client,
    title,
    percentage,
    amount,
    dueDate: dueDate || null,
    notes,
    order: order || 0,
  });
  await milestone.save();

  sendSuccess(res, 201, "Milestone created", { milestone });
};

// @desc  Update milestone (mark paid, update amount, change date)
// @route PUT /api/v1/milestones/:id
export const updateMilestone = async (req, res) => {
  const { title, percentage, amount, dueDate, paidAmount, paidDate, notes, order } = req.body;

  const milestone = await Milestone.findById(req.params.id);
  if (!milestone) throw new AppError("Milestone not found", 404);

  if (title !== undefined) milestone.title = title;
  if (percentage !== undefined) milestone.percentage = percentage;
  if (amount !== undefined) milestone.amount = amount;
  if (dueDate !== undefined) milestone.dueDate = dueDate || null;
  if (paidAmount !== undefined) milestone.paidAmount = paidAmount;
  if (paidDate !== undefined) milestone.paidDate = paidDate || null;
  if (notes !== undefined) milestone.notes = notes;
  if (order !== undefined) milestone.order = order;

  await milestone.save(); // triggers pre-save status computation

  sendSuccess(res, 200, "Milestone updated", { milestone });
};

// @desc  Delete milestone
// @route DELETE /api/v1/milestones/:id
export const deleteMilestone = async (req, res) => {
  const milestone = await Milestone.findById(req.params.id);
  if (!milestone) throw new AppError("Milestone not found", 404);
  await milestone.deleteOne();
  sendSuccess(res, 200, "Milestone deleted");
};

// @desc  Mark milestone as fully paid
// @route PATCH /api/v1/milestones/:id/mark-paid
export const markMilestonePaid = async (req, res) => {
  const milestone = await Milestone.findById(req.params.id);
  if (!milestone) throw new AppError("Milestone not found", 404);

  milestone.paidAmount = milestone.amount;
  milestone.paidDate = new Date();
  await milestone.save();

  sendSuccess(res, 200, "Milestone marked as paid", { milestone });
};
