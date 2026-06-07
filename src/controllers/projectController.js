import Project from "../models/Project.js";
import Client from "../models/Client.js";
import Employee from "../models/Employee.js";
import AppError from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { SERVICE_TYPES, PRIORITY_TYPES, BILLING_CYCLES } from "../models/Project.js";
import { logActivity, diffObjects } from "../utils/activityLogger.js";

export const getAllProjects = async (req, res) => {
  const { status, client, clientName, search, serviceType, priority, isRecurring,
          page = 1, limit = 10, sortBy = "createdAt", order = "desc" } = req.query;

  const filter = {};
  filter.owner = req.user._id;
  if (status)      filter.status      = status;
  if (serviceType) filter.serviceType = serviceType;
  if (priority)    filter.priority    = priority;
  if (isRecurring !== undefined) filter.isRecurring = isRecurring === "true";
  if (search) filter.title = { $regex: search, $options: "i" };

  // Filter by client ID (exact) or client name (search)
  if (client) {
    filter.client = client;
  } else if (clientName) {
    const matchedClients = await Client.find({
      owner: req.user._id,
      name: { $regex: clientName, $options: "i" },
    }).distinct("_id");
    filter.client = { $in: matchedClients };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [projects, total] = await Promise.all([
    Project.find(filter)
      .populate("client","name email phone company")
      .populate("assignedTo","name role email")
      .sort({ [sortBy]: order === "asc" ? 1 : -1 })
      .skip(skip).limit(Number(limit)).lean(),
    Project.countDocuments(filter),
  ]);
  sendSuccess(res, 200, "Projects fetched", {
    projects,
    pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
  });
};

export const getProjectById = async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, owner: req.user._id })
    .populate("client","name email phone company")
    .populate("assignedTo","name role email")
    .populate("notes")
    .populate("payment");
  if (!project) throw new AppError("Project not found", 404);
  sendSuccess(res, 200, "Project fetched", { project });
};

export const getProjectsByClient = async (req, res) => {
  const client = await Client.findOne({ _id: req.params.clientId, owner: req.user._id });
  if (!client) throw new AppError("Client not found", 404);
  const projects = await Project.find({ client: req.params.clientId, owner: req.user._id })
    .populate("payment").sort({ createdAt: -1 }).lean();
  sendSuccess(res, 200, "Client projects fetched", { projects });
};

export const getRecurringDue = async (req, res) => {
  const now          = new Date();
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [overdue, upcoming, totalRecurringRevenue] = await Promise.all([
    Project.find({ owner: req.user._id, isRecurring: true, recurringActive: true, nextBillingDate: { $lt: now } })
      .populate("client","name email phone").sort({ nextBillingDate: 1 }),
    Project.find({ owner: req.user._id, isRecurring: true, recurringActive: true, nextBillingDate: { $gte: now, $lte: sevenDaysOut } })
      .populate("client","name email phone").sort({ nextBillingDate: 1 }),
    Project.aggregate([
      { $match: { owner: req.user._id, isRecurring: true, recurringActive: true } },
      { $group: { _id: "$billingCycle", total: { $sum: "$recurringAmount" }, count: { $sum: 1 } } },
    ]),
  ]);

  const monthlyRevenue = totalRecurringRevenue.reduce((sum, g) => {
    const multiplier = { Monthly: 1, Quarterly: 1/3, "Half-yearly": 1/6, Yearly: 1/12 };
    return sum + (g.total * (multiplier[g._id] || 1));
  }, 0);

  sendSuccess(res, 200, "Recurring due fetched", {
    overdue, upcoming,
    overdueCount:   overdue.length,
    upcomingCount:  upcoming.length,
    byBillingCycle: totalRecurringRevenue,
    monthlyRevenue: Math.round(monthlyRevenue),
  });
};

export const getClientRecurringSummary = async (req, res) => {
  const summary = await Project.aggregate([
    { $match: { owner: req.user._id, isRecurring: true, recurringActive: true } },
    { $group: {
        _id: "$client",
        totalMonthly: { $sum: { $switch: {
          branches: [
            { case: { $eq: ["$billingCycle","Monthly"]     }, then: "$recurringAmount" },
            { case: { $eq: ["$billingCycle","Quarterly"]   }, then: { $divide: ["$recurringAmount", 3] } },
            { case: { $eq: ["$billingCycle","Half-yearly"] }, then: { $divide: ["$recurringAmount", 6] } },
            { case: { $eq: ["$billingCycle","Yearly"]      }, then: { $divide: ["$recurringAmount", 12] } },
          ], default: 0,
        }}},
        projects: { $push: { title: "$title", billingCycle: "$billingCycle", recurringAmount: "$recurringAmount", nextBillingDate: "$nextBillingDate" } },
        count: { $sum: 1 },
    }},
    { $lookup: { from: "clients", localField: "_id", foreignField: "_id", as: "client" } },
    { $unwind: "$client" },
    { $sort: { totalMonthly: -1 } },
  ]);
  sendSuccess(res, 200, "Client recurring summary fetched", { summary });
};

export const createProject = async (req, res) => {
  const { title, description, client, status, serviceType, priority,
          isRecurring, billingCycle, recurringAmount, nextBillingDate,
          startDate, endDate, budget, assignedTo } = req.body;

  const clientExists = await Client.findOne({ _id: client, owner: req.user._id });
  if (!clientExists) throw new AppError("Client not found", 404);

  // Validate assignedTo employee belongs to owner
  if (assignedTo) {
    const emp = await Employee.findOne({ _id: assignedTo, owner: req.user._id });
    if (!emp) throw new AppError("Employee not found", 404);
  }

  const project = new Project({
    owner: req.user._id,
    title, description, client, status, serviceType, priority,
    isRecurring: isRecurring || false, billingCycle, recurringAmount, startDate, endDate,
    budget: budget !== undefined ? Number(budget) : null,
    assignedTo: assignedTo || null,
  });

  if (isRecurring && billingCycle && !nextBillingDate) {
    project.computeNextBillingDate();
  } else if (nextBillingDate) {
    project.nextBillingDate = nextBillingDate;
  }

  await project.save();
  await project.populate("client","name email phone company");
  await project.populate("assignedTo","name role email");

  await logActivity({
    owner: req.user._id,
    entityType: "project",
    entityId: project._id,
    entityName: project.title,
    project: project._id,
    client: project.client?._id || project.client,
    action: "created",
    description: `Project "${project.title}" was created`,
    page: "project",
    icon: "folder-plus",
    color: "#10b981",
  });

  sendSuccess(res, 201, "Project created", { project });
};

export const updateProject = async (req, res) => {
  const { title, description, status, serviceType, priority,
          isRecurring, billingCycle, recurringAmount, nextBillingDate,
          lastBilledDate, recurringActive, startDate, endDate, budget, assignedTo } = req.body;

  const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
  if (!project) throw new AppError("Project not found", 404);

  // Snapshot before
  const before = {
    title: project.title, status: project.status, serviceType: project.serviceType,
    priority: project.priority, billingCycle: project.billingCycle,
    recurringAmount: project.recurringAmount, recurringActive: project.recurringActive,
    budget: project.budget,
  };

  if (title !== undefined)           project.title           = title;
  if (description !== undefined)     project.description     = description;
  if (status !== undefined)          project.status          = status;
  if (serviceType !== undefined)     project.serviceType     = serviceType;
  if (priority !== undefined)        project.priority        = priority;
  if (isRecurring !== undefined)     project.isRecurring     = isRecurring;
  if (billingCycle !== undefined)    project.billingCycle    = billingCycle;
  if (recurringAmount !== undefined) project.recurringAmount = recurringAmount;
  if (recurringActive !== undefined) project.recurringActive = recurringActive;
  if (startDate !== undefined)       project.startDate       = startDate;
  if (endDate !== undefined)         project.endDate         = endDate;
  if (budget !== undefined)          project.budget          = budget !== null ? Number(budget) : null;
  if (assignedTo !== undefined)      project.assignedTo      = assignedTo || null;
  if (lastBilledDate !== undefined) {
    project.lastBilledDate = lastBilledDate;
    project.computeNextBillingDate();
  }
  if (nextBillingDate !== undefined) project.nextBillingDate = nextBillingDate;

  await project.save();
  await project.populate("client","name email phone company");
  await project.populate("assignedTo","name role email");

  const after = {
    title: project.title, status: project.status, serviceType: project.serviceType,
    priority: project.priority, billingCycle: project.billingCycle,
    recurringAmount: project.recurringAmount, recurringActive: project.recurringActive,
    budget: project.budget,
  };
  const changes = diffObjects(before, after, Object.keys(before));

  const isStatusChange = changes.some(c => c.field === "status");
  const isBilled = lastBilledDate !== undefined;

  // Extra log for recurring billing event
  if (isBilled) {
    await logActivity({
      owner: req.user._id,
      entityType: "recurring",
      entityId: project._id,
      entityName: project.title,
      project: project._id,
      client: project.client?._id || project.client,
      action: "billed",
      description: `Recurring billing recorded for "${project.title}" — ₹${project.recurringAmount} (${project.billingCycle})`,
      page: "recurring",
      icon: "refresh-cw",
      color: "#8b5cf6",
    });
  }

  await logActivity({
    owner: req.user._id,
    entityType: "project",
    entityId: project._id,
    entityName: project.title,
    project: project._id,
    client: project.client?._id || project.client,
    action: isStatusChange ? "status_changed" : "updated",
    description: isStatusChange
      ? `Project "${project.title}" status changed to "${project.status}"`
      : `Project "${project.title}" was updated`,
    changes,
    page: isBilled ? "recurring" : "project",
    icon: isStatusChange ? "refresh-cw" : "pencil",
    color: isStatusChange ? "#f59e0b" : "#6366f1",
  });

  sendSuccess(res, 200, "Project updated", { project });
};

export const deleteProject = async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
  if (!project) throw new AppError("Project not found", 404);

  await logActivity({
    owner: req.user._id,
    entityType: "project",
    entityId: project._id,
    entityName: project.title,
    project: project._id,
    client: project.client,
    action: "deleted",
    description: `Project "${project.title}" was deleted`,
    page: "project",
    icon: "trash-2",
    color: "#ef4444",
  });

  await project.deleteOne();
  sendSuccess(res, 200, "Project deleted");
};

export const getProjectMeta = async (req, res) => {
  sendSuccess(res, 200, "Meta fetched", { SERVICE_TYPES, PRIORITY_TYPES, BILLING_CYCLES });
};