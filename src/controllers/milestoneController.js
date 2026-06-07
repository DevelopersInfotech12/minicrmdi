import Milestone from "../models/Milestone.js";
import Project from "../models/Project.js";
import AppError from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { logActivity } from "../utils/activityLogger.js";

export const getMilestonesByProject = async (req, res) => {
  const project = await Project.findOne({ _id: req.params.projectId, owner: req.user._id });
  if (!project) throw new AppError("Project not found", 404);
  const milestones = await Milestone.find({ project: req.params.projectId })
    .sort({ order: 1, createdAt: 1 });
  sendSuccess(res, 200, "Milestones fetched", { milestones });
};

export const getMilestoneAlerts = async (req, res) => {
  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [overdue, upcoming, pendingTotal] = await Promise.all([
    Milestone.find({ status: { $in: ["Overdue","Pending","Partial"] }, dueDate: { $lt: now } })
      .populate("project","title").populate("client","name").sort({ dueDate: 1 }).limit(10),
    Milestone.find({ status: { $in: ["Pending","Partial"] }, dueDate: { $gte: now, $lte: sevenDaysLater } })
      .populate("project","title").populate("client","name").sort({ dueDate: 1 }).limit(10),
    Milestone.aggregate([
      { $match: { status: { $in: ["Pending","Partial","Overdue"] } } },
      { $group: { _id: null, total: { $sum: { $subtract: ["$amount","$paidAmount"] } } } },
    ]),
  ]);

  sendSuccess(res, 200, "Alerts fetched", {
    overdue, upcoming,
    overdueCount: overdue.length,
    upcomingCount: upcoming.length,
    totalPending: pendingTotal[0]?.total || 0,
  });
};

export const createMilestone = async (req, res) => {
  const { project, title, percentage, amount, dueDate, notes, order } = req.body;

  const projectExists = await Project.findById(project);
  if (!projectExists) throw new AppError("Project not found", 404);

  const milestone = new Milestone({
    project, client: projectExists.client,
    title, percentage, amount,
    dueDate: dueDate || null, notes, order: order || 0,
  });
  await milestone.save();

  await logActivity({
    owner:       projectExists.owner,
    entityType:  "milestone",
    entityId:    milestone._id,
    entityName:  milestone.title,
    project:     project,
    client:      projectExists.client,
    action:      "created",
    description: `Milestone "${milestone.title}" (₹${amount}) created for project "${projectExists.title}"`,
    page:        "project",
    icon:        "credit-card",
    color:       "#10b981",
  });

  sendSuccess(res, 201, "Milestone created", { milestone });
};

export const updateMilestone = async (req, res) => {
  const { title, percentage, amount, dueDate, paidAmount, paidDate, notes, order } = req.body;

  const milestone = await Milestone.findById(req.params.id);
  if (!milestone) throw new AppError("Milestone not found", 404);

  const prevStatus = milestone.status;

  if (title      !== undefined) milestone.title      = title;
  if (percentage !== undefined) milestone.percentage = percentage;
  if (amount     !== undefined) milestone.amount     = amount;
  if (dueDate    !== undefined) milestone.dueDate    = dueDate || null;
  if (paidAmount !== undefined) milestone.paidAmount = paidAmount;
  if (paidDate   !== undefined) milestone.paidDate   = paidDate || null;
  if (notes      !== undefined) milestone.notes      = notes;
  if (order      !== undefined) milestone.order      = order;

  await milestone.save();

  const project = await Project.findById(milestone.project);
  const newStatus = milestone.status;
  const isPaid = newStatus === "Paid" && prevStatus !== "Paid";

  await logActivity({
    owner:       project?.owner,
    entityType:  "milestone",
    entityId:    milestone._id,
    entityName:  milestone.title,
    project:     milestone.project,
    client:      milestone.client,
    action:      isPaid ? "payment_added" : "updated",
    description: isPaid
      ? `Milestone "${milestone.title}" marked as Paid — ₹${milestone.amount}`
      : `Milestone "${milestone.title}" was updated`,
    changes:     prevStatus !== newStatus ? [{ field: "status", from: prevStatus, to: newStatus }] : [],
    page:        "project",
    icon:        isPaid ? "check-circle" : "pencil",
    color:       isPaid ? "#10b981" : "#6366f1",
  });

  sendSuccess(res, 200, "Milestone updated", { milestone });
};

export const deleteMilestone = async (req, res) => {
  const milestone = await Milestone.findById(req.params.id);
  if (!milestone) throw new AppError("Milestone not found", 404);

  const project = await Project.findById(milestone.project);

  await logActivity({
    owner:       project?.owner,
    entityType:  "milestone",
    entityId:    milestone._id,
    entityName:  milestone.title,
    project:     milestone.project,
    client:      milestone.client,
    action:      "deleted",
    description: `Milestone "${milestone.title}" was deleted`,
    page:        "project",
    icon:        "trash-2",
    color:       "#ef4444",
  });

  await milestone.deleteOne();
  sendSuccess(res, 200, "Milestone deleted");
};

export const markMilestonePaid = async (req, res) => {
  const milestone = await Milestone.findById(req.params.id);
  if (!milestone) throw new AppError("Milestone not found", 404);

  const project = await Project.findById(milestone.project);

  milestone.paidAmount = milestone.amount;
  milestone.paidDate   = new Date();
  await milestone.save();

  await logActivity({
    owner:       project?.owner,
    entityType:  "milestone",
    entityId:    milestone._id,
    entityName:  milestone.title,
    project:     milestone.project,
    client:      milestone.client,
    action:      "payment_added",
    description: `Milestone "${milestone.title}" marked as Paid — ₹${milestone.amount}`,
    changes:     [{ field: "status", from: "Pending", to: "Paid" }],
    page:        "project",
    icon:        "check-circle",
    color:       "#10b981",
  });

  sendSuccess(res, 200, "Milestone marked as paid", { milestone });
};
