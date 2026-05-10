import Client    from "../models/Client.js";
import Project   from "../models/Project.js";
import Payment   from "../models/Payment.js";
import Milestone from "../models/Milestone.js";
import Lead      from "../models/Lead.js";
import Task      from "../models/Task.js";
import Meeting   from "../models/Meeting.js";
import { sendSuccess } from "../utils/apiResponse.js";

export const getDashboardStats = async (req, res) => {
  const owner          = req.user._id;
  const now            = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    totalClients, activeClients,
    totalProjects, activeProjects, completedProjects, onHoldProjects,
    paymentStats,
    budgetStats,
    milestoneStats,
    recentClients, recentProjects,
    overdueMillestones, upcomingMilestones,
    totalLeads, newLeads, followUpsDue, leadStageCounts,
    recurringOverdue, recurringUpcoming, recurringRevenueAgg,
    serviceBreakdown,
    overdueTasksCount, totalTasks, doneTasks,
  ] = await Promise.all([

    // ── Clients ──
    Client.countDocuments({ owner }),
    Client.countDocuments({ owner, isActive: true }),

    // ── Projects ──
    Project.countDocuments({ owner }),
    Project.countDocuments({ owner, status: "Active" }),
    Project.countDocuments({ owner, status: "Completed" }),
    Project.countDocuments({ owner, status: "On Hold" }),

    // ── Payments (manually set totals per project) ──
    Payment.aggregate([
      { $match: { owner } },
      { $group: { _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          totalPaid:    { $sum: "$paidAmount" },
          totalPending: { $sum: { $subtract: ["$totalAmount", "$paidAmount"] } },
          projectCount: { $sum: 1 },
      }},
    ]),

    // ── Project Budgets (sum of Project.budget field) ──
    Project.aggregate([
      { $match: { owner, budget: { $gt: 0 } } },
      { $group: { _id: null,
          totalBudget:   { $sum: "$budget" },
          projectsWithBudget: { $sum: 1 },
      }},
    ]),

    // ── Milestone payment stats ──
    Milestone.aggregate([
      { $match: { owner } },
      { $group: { _id: null,
          totalMilestoneAmount: { $sum: "$amount" },
          totalMilestonePaid:   { $sum: "$paidAmount" },
          totalMilestonePending: { $sum: { $subtract: ["$amount", "$paidAmount"] } },
          overdueCount: { $sum: { $cond: [{ $eq: ["$status", "Overdue"] }, 1, 0] } },
      }},
    ]),

    // ── Recent ──
    Client.find({ owner }).sort({ createdAt: -1 }).limit(5).select("name email company isActive createdAt").lean(),
    Project.find({ owner }).sort({ createdAt: -1 }).limit(5).populate("client", "name company").populate("payment").lean(),

    // ── Overdue milestones count ──
    Milestone.countDocuments({ owner, status: "Overdue" }),

    // ── Upcoming milestones ──
    Milestone.find({ owner, status: { $in: ["Pending", "Partial"] }, dueDate: { $gte: now, $lte: sevenDaysLater } })
      .populate("project", "title").populate("client", "name").sort({ dueDate: 1 }).limit(5),

    // ── Leads ──
    Lead.countDocuments({ owner, isArchived: false }),
    Lead.countDocuments({ owner, isArchived: false, stage: "New" }),
    Lead.countDocuments({ owner, isArchived: false, followUpDate: { $lte: now }, stage: { $nin: ["Converted", "Lost"] } }),
    Lead.aggregate([
      { $match: { owner, isArchived: false } },
      { $group: { _id: "$stage", count: { $sum: 1 } } },
    ]),

    // ── Recurring ──
    Project.countDocuments({ owner, isRecurring: true, recurringActive: true, nextBillingDate: { $lt: now } }),
    Project.find({ owner, isRecurring: true, recurringActive: true, nextBillingDate: { $gte: now, $lte: sevenDaysLater } })
      .populate("client", "name").select("title billingCycle recurringAmount nextBillingDate client").limit(5),
    Project.aggregate([
      { $match: { owner, isRecurring: true, recurringActive: true } },
      { $group: { _id: "$billingCycle", total: { $sum: "$recurringAmount" }, count: { $sum: 1 } } },
    ]),

    // ── Service breakdown ──
    Project.aggregate([
      { $match: { owner, serviceType: { $ne: null } } },
      { $group: { _id: "$serviceType", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),

    // ── Tasks ──
    Task.countDocuments({ owner, dueDate: { $lt: now }, status: { $ne: "Done" } }),
    Task.countDocuments({ owner }),
    Task.countDocuments({ owner, status: "Done" }),
  ]);

  // ── Compute combined revenue figures ──
  const payments  = paymentStats[0]  || { totalRevenue: 0, totalPaid: 0, totalPending: 0, projectCount: 0 };
  const budgets   = budgetStats[0]   || { totalBudget: 0, projectsWithBudget: 0 };
  const milStats  = milestoneStats[0] || { totalMilestoneAmount: 0, totalMilestonePaid: 0, totalMilestonePending: 0, overdueCount: 0 };

  // Use payment records if they exist, otherwise fall back to project budgets
  const hasPaymentRecords = payments.projectCount > 0;
  const totalRevenue = hasPaymentRecords ? payments.totalRevenue : budgets.totalBudget;
  const totalPaid    = hasPaymentRecords ? payments.totalPaid    : milStats.totalMilestonePaid;
  const totalPending = hasPaymentRecords
    ? payments.totalPending
    : (budgets.totalBudget - milStats.totalMilestonePaid > 0 ? budgets.totalBudget - milStats.totalMilestonePaid : milStats.totalMilestonePending);

  const stageMap  = {};
  leadStageCounts.forEach(({ _id, count }) => { stageMap[_id] = count; });
  const multiplier = { Monthly: 1, Quarterly: 1/3, "Half-yearly": 1/6, Yearly: 1/12 };
  const monthlyRecurring = recurringRevenueAgg.reduce((s, g) => s + g.total * (multiplier[g._id] || 1), 0);

  const pendingAmountAgg = milStats.totalMilestonePending;

  sendSuccess(res, 200, "Dashboard stats fetched", {
    clients:   { total: totalClients, active: activeClients, inactive: totalClients - activeClients },
    projects:  { total: totalProjects, active: activeProjects, completed: completedProjects, onHold: onHoldProjects },
    payments:  {
      // Payment record stats
      totalRevenue,
      totalPaid,
      totalPending,
      // Raw breakdowns for display
      paymentRevenue:  payments.totalRevenue,
      paymentPaid:     payments.totalPaid,
      paymentPending:  payments.totalPending,
      // Budget stats
      totalBudget:     budgets.totalBudget,
      projectsWithBudget: budgets.projectsWithBudget,
      projectsWithPayment: payments.projectCount,
      // Milestone stats
      milestonePending: milStats.totalMilestonePending,
      milestonePaid:    milStats.totalMilestonePaid,
    },
    leads:     { total: totalLeads, new: newLeads, followUpsDue, stages: stageMap },
    alerts:    { overdueCount: overdueMillestones, upcomingMilestones, totalMilestonePending: pendingAmountAgg },
    recurring: { overdueCount: recurringOverdue, upcomingRenewals: recurringUpcoming, byBillingCycle: recurringRevenueAgg, monthlyRevenue: Math.round(monthlyRecurring) },
    tasks:     { total: totalTasks, done: doneTasks, overdue: overdueTasksCount, completionPct: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0 },
    serviceBreakdown,
    recentClients,
    recentProjects,
  });
};