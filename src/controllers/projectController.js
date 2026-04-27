import Project from "../models/Project.js";
import Client from "../models/Client.js";
import AppError from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { SERVICE_TYPES, PRIORITY_TYPES, BILLING_CYCLES } from "../models/Project.js";

export const getAllProjects = async (req, res) => {
  const { status, client, search, serviceType, priority, isRecurring,
          page = 1, limit = 10, sortBy = "createdAt", order = "desc" } = req.query;

  const filter = {};
  if (status)      filter.status      = status;
  if (client)      filter.client      = client;
  if (serviceType) filter.serviceType = serviceType;
  if (priority)    filter.priority    = priority;
  if (isRecurring !== undefined) filter.isRecurring = isRecurring === "true";
  if (search) filter.title = { $regex: search, $options: "i" };

  const skip = (Number(page) - 1) * Number(limit);
  const [projects, total] = await Promise.all([
    Project.find(filter)
      .populate("client","name email phone company")
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
  const project = await Project.findById(req.params.id)
    .populate("client","name email phone company")
    .populate("notes")
    .populate("payment");
  if (!project) throw new AppError("Project not found", 404);
  sendSuccess(res, 200, "Project fetched", { project });
};

export const getProjectsByClient = async (req, res) => {
  const client = await Client.findById(req.params.clientId);
  if (!client) throw new AppError("Client not found", 404);
  const projects = await Project.find({ client: req.params.clientId })
    .populate("payment").sort({ createdAt: -1 }).lean();
  sendSuccess(res, 200, "Client projects fetched", { projects });
};

// Recurring projects due for renewal
export const getRecurringDue = async (req, res) => {
  const now          = new Date();
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [overdue, upcoming, totalRecurringRevenue] = await Promise.all([
    Project.find({ isRecurring: true, recurringActive: true, nextBillingDate: { $lt: now } })
      .populate("client","name email phone").sort({ nextBillingDate: 1 }),
    Project.find({ isRecurring: true, recurringActive: true, nextBillingDate: { $gte: now, $lte: sevenDaysOut } })
      .populate("client","name email phone").sort({ nextBillingDate: 1 }),
    Project.aggregate([
      { $match: { isRecurring: true, recurringActive: true } },
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

// Client-wise recurring summary
export const getClientRecurringSummary = async (req, res) => {
  const summary = await Project.aggregate([
    { $match: { isRecurring: true, recurringActive: true } },
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
          startDate, endDate } = req.body;

  const clientExists = await Client.findById(client);
  if (!clientExists) throw new AppError("Client not found", 404);

  const project = new Project({ title, description, client, status, serviceType, priority,
    isRecurring: isRecurring || false, billingCycle, recurringAmount, startDate, endDate });

  if (isRecurring && billingCycle && !nextBillingDate) {
    project.computeNextBillingDate();
  } else if (nextBillingDate) {
    project.nextBillingDate = nextBillingDate;
  }

  await project.save();
  await project.populate("client","name email phone company");
  sendSuccess(res, 201, "Project created", { project });
};

export const updateProject = async (req, res) => {
  const { title, description, status, serviceType, priority,
          isRecurring, billingCycle, recurringAmount, nextBillingDate,
          lastBilledDate, recurringActive, startDate, endDate } = req.body;

  const project = await Project.findById(req.params.id);
  if (!project) throw new AppError("Project not found", 404);

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
  if (lastBilledDate !== undefined) {
    project.lastBilledDate = lastBilledDate;
    project.computeNextBillingDate();
  }
  if (nextBillingDate !== undefined) project.nextBillingDate = nextBillingDate;

  await project.save();
  await project.populate("client","name email phone company");
  sendSuccess(res, 200, "Project updated", { project });
};

export const deleteProject = async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new AppError("Project not found", 404);
  await project.deleteOne();
  sendSuccess(res, 200, "Project deleted");
};

export const getProjectMeta = async (req, res) => {
  sendSuccess(res, 200, "Meta fetched", { SERVICE_TYPES, PRIORITY_TYPES, BILLING_CYCLES });
};
