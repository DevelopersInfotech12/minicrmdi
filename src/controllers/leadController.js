import Lead, { STAGES, SOURCES, SERVICES } from "../models/Lead.js";
import Client from "../models/Client.js";
import AppError from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";

export const getAllLeads = async (req, res) => {
  const { stage, source, search, followUp, isArchived = "false", page = 1, limit = 20, sortBy = "createdAt", order = "desc" } = req.query;

  const filter = {
    owner: req.user._id,
    isArchived: isArchived === "true",
  };
  if (stage)  filter.stage  = stage;
  if (source) filter.source = source;
  if (followUp) {
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(today); todayEnd.setDate(todayEnd.getDate() + 1);
    const weekEnd  = new Date(today); weekEnd.setDate(weekEnd.getDate() + 7);
    const nextWeekStart = new Date(today); nextWeekStart.setDate(nextWeekStart.getDate() + 7);
    const nextWeekEnd   = new Date(today); nextWeekEnd.setDate(nextWeekEnd.getDate() + 14);
    if (followUp === "overdue")   { filter.followUpDate = { $lt: today }; filter.stage = { $nin: ["Converted", "Lost"] }; }
    if (followUp === "today")     { filter.followUpDate = { $gte: today, $lt: todayEnd }; }
    if (followUp === "this_week") { filter.followUpDate = { $gte: today, $lt: weekEnd }; }
    if (followUp === "next_week") { filter.followUpDate = { $gte: nextWeekStart, $lt: nextWeekEnd }; }
    if (followUp === "no_date")   { filter.followUpDate = { $in: [null, undefined] }; }
  }
  if (search) {
    filter.$or = [
      { name:  { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { referenceName: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [leads, total] = await Promise.all([
    Lead.find(filter)
      .populate("convertedTo", "name email")
      .sort({ [sortBy]: order === "asc" ? 1 : -1 })
      .skip(skip).limit(Number(limit)).lean(),
    Lead.countDocuments(filter),
  ]);

  sendSuccess(res, 200, "Leads fetched", {
    leads,
    pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
  });
};

export const getPipeline = async (req, res) => {
  const ownerId = req.user._id;
  const [stageCounts, sourceCounts, followUpsDue, totalBudget] = await Promise.all([
    Lead.aggregate([
      { $match: { owner: ownerId, isArchived: false } },
      { $group: { _id: "$stage", count: { $sum: 1 } } },
    ]),
    Lead.aggregate([
      { $match: { owner: ownerId, isArchived: false } },
      { $group: { _id: "$source", count: { $sum: 1 } } },
    ]),
    Lead.countDocuments({
      owner: ownerId,
      isArchived: false,
      followUpDate: { $lte: new Date() },
      stage: { $nin: ["Converted", "Lost"] },
    }),
    Lead.aggregate([
      { $match: { owner: ownerId, isArchived: false, budget: { $ne: null } } },
      { $group: { _id: null, total: { $sum: "$budget" } } },
    ]),
  ]);

  const stageMap = {};
  STAGES.forEach(s => { stageMap[s] = 0; });
  stageCounts.forEach(({ _id, count }) => { stageMap[_id] = count; });

  const sourceMap = {};
  sourceCounts.forEach(({ _id, count }) => { sourceMap[_id] = count; });

  sendSuccess(res, 200, "Pipeline fetched", {
    stages: stageMap,
    sources: sourceMap,
    followUpsDue,
    totalPipelineBudget: totalBudget[0]?.total || 0,
  });
};

export const getLeadById = async (req, res) => {
  const lead = await Lead.findOne({ _id: req.params.id, owner: req.user._id })
    .populate("convertedTo", "name email company");
  if (!lead) throw new AppError("Lead not found", 404);
  sendSuccess(res, 200, "Lead fetched", { lead });
};

export const createLead = async (req, res) => {
  const { name, phone, email, referenceName, source, services, stage, budget, followUpDate, notes } = req.body;
  const lead = await Lead.create({
    owner: req.user._id,        // ← already correct
    name, phone, email, referenceName, source, services, stage, budget, followUpDate, notes,
  });
  sendSuccess(res, 201, "Lead created", { lead });
};

export const updateLead = async (req, res) => {
  const { name, phone, email, referenceName, source, services, stage, budget, followUpDate, notes, lostReason } = req.body;

  const lead = await Lead.findOne({ _id: req.params.id, owner: req.user._id });
  if (!lead) throw new AppError("Lead not found", 404);

  const prevStage = lead.stage;
  if (name !== undefined)          lead.name          = name;
  if (phone !== undefined)         lead.phone         = phone;
  if (email !== undefined)         lead.email         = email;
  if (referenceName !== undefined) lead.referenceName = referenceName;
  if (source !== undefined)        lead.source        = source;
  if (services !== undefined)      lead.services      = services;
  if (budget !== undefined)        lead.budget        = budget;
  if (followUpDate !== undefined)  lead.followUpDate  = followUpDate || null;
  if (notes !== undefined)         lead.notes         = notes;
  if (lostReason !== undefined)    lead.lostReason    = lostReason;

  if (stage !== undefined && stage !== prevStage) {
    lead.stage = stage;
    lead.activities.push({ note: `Stage changed: ${prevStage} → ${stage}`, stage });
  }

  await lead.save();
  sendSuccess(res, 200, "Lead updated", { lead });
};

export const addActivity = async (req, res) => {
  const { note } = req.body;
  if (!note?.trim()) throw new AppError("Note is required", 400);
  const lead = await Lead.findOne({ _id: req.params.id, owner: req.user._id });
  if (!lead) throw new AppError("Lead not found", 404);
  lead.activities.push({ note: note.trim(), stage: lead.stage });
  await lead.save();
  sendSuccess(res, 201, "Activity added", { activities: lead.activities });
};

export const convertLead = async (req, res) => {
  const lead = await Lead.findOne({ _id: req.params.id, owner: req.user._id });
  if (!lead) throw new AppError("Lead not found", 404);
  if (lead.stage === "Converted") throw new AppError("Lead already converted", 400);

  const client = await Client.create({
    owner:   req.user._id,      // ← FIXED
    name:    lead.name,
    email:   lead.email || `${lead.phone}@lead.minicrm.io`,
    phone:   lead.phone,
    company: lead.referenceName || "",
  });

  lead.stage       = "Converted";
  lead.convertedTo = client._id;
  lead.activities.push({ note: `Converted to client: ${client.name}`, stage: "Converted" });
  await lead.save();

  sendSuccess(res, 200, "Lead converted to client", { client, lead });
};

export const deleteLead = async (req, res) => {
  const lead = await Lead.findOne({ _id: req.params.id, owner: req.user._id });
  if (!lead) throw new AppError("Lead not found", 404);
  await lead.deleteOne();
  sendSuccess(res, 200, "Lead deleted");
};

export const getLeadMeta = async (req, res) => {
  sendSuccess(res, 200, "Meta fetched", { STAGES, SOURCES, SERVICES });
};