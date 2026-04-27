import Client    from "../models/Client.js";
import Project   from "../models/Project.js";
import Payment   from "../models/Payment.js";
import Milestone from "../models/Milestone.js";
import Lead      from "../models/Lead.js";
import Task      from "../models/Task.js";
import { sendSuccess } from "../utils/apiResponse.js";

export const getDashboardStats = async (req, res) => {
  const now            = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    totalClients, activeClients,
    totalProjects, activeProjects, completedProjects, onHoldProjects,
    paymentStats,
    recentClients, recentProjects,
    overdueMillestones, upcomingMilestones, pendingAmountAgg,
    totalLeads, newLeads, followUpsDue, leadStageCounts,
    recurringOverdue, recurringUpcoming, recurringRevenueAgg,
    serviceBreakdown,
    overdueTasksCount, totalTasks, doneTasks,
  ] = await Promise.all([
    Client.countDocuments(),
    Client.countDocuments({ isActive: true }),
    Project.countDocuments(),
    Project.countDocuments({ status: "Active" }),
    Project.countDocuments({ status: "Completed" }),
    Project.countDocuments({ status: "On Hold" }),
    Payment.aggregate([{ $group: { _id: null, totalRevenue: { $sum: "$totalAmount" }, totalPaid: { $sum: "$paidAmount" }, totalPending: { $sum: { $subtract: ["$totalAmount","$paidAmount"] } } } }]),
    Client.find().sort({ createdAt: -1 }).limit(5).select("name email company isActive createdAt").lean(),
    Project.find().sort({ createdAt: -1 }).limit(5).populate("client","name company").populate("payment").lean(),
    Milestone.countDocuments({ status: "Overdue" }),
    Milestone.find({ status: { $in: ["Pending","Partial"] }, dueDate: { $gte: now, $lte: sevenDaysLater } })
      .populate("project","title").populate("client","name").sort({ dueDate: 1 }).limit(5),
    Milestone.aggregate([{ $match: { status: { $in: ["Pending","Partial","Overdue"] } } }, { $group: { _id: null, total: { $sum: { $subtract: ["$amount","$paidAmount"] } } } }]),
    Lead.countDocuments({ isArchived: false }),
    Lead.countDocuments({ isArchived: false, stage: "New" }),
    Lead.countDocuments({ isArchived: false, followUpDate: { $lte: now }, stage: { $nin: ["Converted","Lost"] } }),
    Lead.aggregate([{ $match: { isArchived: false } }, { $group: { _id: "$stage", count: { $sum: 1 } } }]),
    Project.countDocuments({ isRecurring: true, recurringActive: true, nextBillingDate: { $lt: now } }),
    Project.find({ isRecurring: true, recurringActive: true, nextBillingDate: { $gte: now, $lte: sevenDaysLater } })
      .populate("client","name").select("title billingCycle recurringAmount nextBillingDate client").limit(5),
    Project.aggregate([{ $match: { isRecurring: true, recurringActive: true } }, { $group: { _id: "$billingCycle", total: { $sum: "$recurringAmount" }, count: { $sum: 1 } } }]),
    Project.aggregate([{ $match: { serviceType: { $ne: null } } }, { $group: { _id: "$serviceType", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Task.countDocuments({ dueDate: { $lt: now }, status: { $ne: "Done" } }),
    Task.countDocuments(),
    Task.countDocuments({ status: "Done" }),
  ]);

  const payments = paymentStats[0] || { totalRevenue: 0, totalPaid: 0, totalPending: 0 };
  const stageMap = {};
  leadStageCounts.forEach(({ _id, count }) => { stageMap[_id] = count; });
  const multiplier = { Monthly: 1, Quarterly: 1/3, "Half-yearly": 1/6, Yearly: 1/12 };
  const monthlyRecurring = recurringRevenueAgg.reduce((s, g) => s + g.total * (multiplier[g._id] || 1), 0);

  sendSuccess(res, 200, "Dashboard stats fetched", {
    clients:   { total: totalClients, active: activeClients, inactive: totalClients - activeClients },
    projects:  { total: totalProjects, active: activeProjects, completed: completedProjects, onHold: onHoldProjects },
    payments:  { totalRevenue: payments.totalRevenue, totalPaid: payments.totalPaid, totalPending: payments.totalPending },
    leads:     { total: totalLeads, new: newLeads, followUpsDue, stages: stageMap },
    alerts:    { overdueCount: overdueMillestones, upcomingMilestones, totalMilestonePending: pendingAmountAgg[0]?.total || 0 },
    recurring: { overdueCount: recurringOverdue, upcomingRenewals: recurringUpcoming, byBillingCycle: recurringRevenueAgg, monthlyRevenue: Math.round(monthlyRecurring) },
    tasks:     { total: totalTasks, done: doneTasks, overdue: overdueTasksCount, completionPct: totalTasks > 0 ? Math.round((doneTasks/totalTasks)*100) : 0 },
    serviceBreakdown,
    recentClients,
    recentProjects,
  });
};
