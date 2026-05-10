import Client from "../models/Client.js";
import Project from "../models/Project.js";
import Payment from "../models/Payment.js";
import Milestone from "../models/Milestone.js";
import Note from "../models/Note.js";
import Invoice from "../models/Invoice.js";
import AppError from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";

export const getAllClients = async (req, res) => {
  const { search, isActive, page = 1, limit = 10, sortBy = "createdAt", order = "desc", serviceType, priority, isRecurring } = req.query;
  const filter = {};
  filter.owner = req.user._id;
  if (isActive !== undefined) filter.isActive = isActive === "true";
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { company: { $regex: search, $options: "i" } },
    ];
  }

  // Filter by project attributes (serviceType, priority, isRecurring)
  if (serviceType || priority || isRecurring !== undefined) {
    const projectFilter = { owner: req.user._id };
    if (serviceType)    projectFilter.serviceType  = serviceType;
    if (priority)       projectFilter.priority     = priority;
    if (isRecurring !== undefined) projectFilter.isRecurring = isRecurring === "true";
    const matchingProjects = await Project.find(projectFilter).distinct("client");
    filter._id = { $in: matchingProjects };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const sortOrder = order === "asc" ? 1 : -1;
  const [clients, total] = await Promise.all([
    Client.find(filter).sort({ [sortBy]: sortOrder }).skip(skip).limit(Number(limit)).lean(),
    Client.countDocuments(filter),
  ]);

  // Attach totalBudget (sum of project budgets) to each client
  const clientIds = clients.map(c => c._id);
  const budgetAgg = await Project.aggregate([
    { $match: { client: { $in: clientIds }, owner: req.user._id, budget: { $ne: null } } },
    { $group: { _id: "$client", totalBudget: { $sum: "$budget" } } },
  ]);
  const budgetMap = Object.fromEntries(budgetAgg.map(b => [b._id.toString(), b.totalBudget]));
  const clientsWithBudget = clients.map(c => ({ ...c, totalBudget: budgetMap[c._id.toString()] || 0 }));
  sendSuccess(res, 200, "Clients fetched successfully", {
    clients: clientsWithBudget,
    pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
  });
};

export const getClientById = async (req, res) => {
  const client = await Client.findOne({ _id: req.params.id, owner: req.user._id });
  if (!client) throw new AppError("Client not found", 404);
  sendSuccess(res, 200, "Client fetched successfully", { client });
};

// ─── Full Client Profile ──────────────────────────────────────────────────────
export const getClientProfile = async (req, res) => {
  const client = await Client.findOne({ _id: req.params.id, owner: req.user._id });
  if (!client) throw new AppError("Client not found", 404);

  const [projects, payments, notes, milestones, invoices] = await Promise.all([
    Project.find({ client: client._id }).sort({ createdAt: -1 }).lean(),
    Payment.find({ client: client._id }).populate("project", "title status").sort({ createdAt: -1 }).lean(),
    Note.find({ client: client._id }).populate("project", "title").sort({ createdAt: -1 }).lean(),
    Milestone.find({ client: client._id }).populate("project", "title").sort({ dueDate: 1 }).lean(),
    Invoice.find({ client: client._id }).populate("project", "title").populate("milestone", "title percentage").sort({ createdAt: -1 }).lean(),
  ]);

  // Revenue stats
  const totalRevenue  = payments.reduce((s, p) => s + p.totalAmount, 0);
  const totalPaid     = payments.reduce((s, p) => s + p.paidAmount, 0);
  const totalPending  = totalRevenue - totalPaid;

  // Project stats
  const projectStats = {
    total:     projects.length,
    active:    projects.filter(p => p.status === "Active").length,
    completed: projects.filter(p => p.status === "Completed").length,
    onHold:    projects.filter(p => p.status === "On Hold").length,
  };

  // Overdue milestones
  const overdueMilestones = milestones.filter(m => m.status === "Overdue");
  const upcomingMilestones = milestones.filter(m => {
    const soon = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return m.status !== "Paid" && m.dueDate && new Date(m.dueDate) <= soon && new Date(m.dueDate) >= new Date();
  });

  sendSuccess(res, 200, "Client profile fetched", {
    client,
    projects,
    payments,
    notes,
    milestones,
    invoices,
    overdueMilestones,
    upcomingMilestones,
    stats: { totalRevenue, totalPaid, totalPending, projectStats },
  });
};

export const createClient = async (req, res) => {
  const { name, email, phone, address, company } = req.body;
  const client = await Client.create({
    owner: req.user._id, name, email, phone, address, company });
  sendSuccess(res, 201, "Client created successfully", { client });
};

export const updateClient = async (req, res) => {
  const { name, email, phone, address, company, isActive } = req.body;
  const client = await Client.findOneAndUpdate({ _id: req.params.id, owner: req.user._id },
    { name, email, phone, address, company, isActive },
    { new: true, runValidators: true, omitUndefined: true }
  );
  if (!client) throw new AppError("Client not found", 404);
  sendSuccess(res, 200, "Client updated successfully", { client });
};

export const deleteClient = async (req, res) => {
  const client = await Client.findOne({ _id: req.params.id, owner: req.user._id });
  if (!client) throw new AppError("Client not found", 404);
  await client.deleteOne();
  sendSuccess(res, 200, "Client deleted successfully");
};

export const toggleClientStatus = async (req, res) => {
  const client = await Client.findOne({ _id: req.params.id, owner: req.user._id });
  if (!client) throw new AppError("Client not found", 404);
  client.isActive = !client.isActive;
  await client.save();
  sendSuccess(res, 200, `Client ${client.isActive ? "activated" : "deactivated"} successfully`, { client });
};