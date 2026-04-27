import Lead, { STAGES, SOURCES, SERVICES } from "../models/Lead.js";
import Client from "../models/Client.js";
import AppError from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";

// @desc  Get all leads
// @route GET /api/v1/leads
export const getAllLeads = async (req, res) => {
  const { stage, source, search, isArchived = "false", page = 1, limit = 20, sortBy = "createdAt", order = "desc" } = req.query;

  const filter = { isArchived: isArchived === "true" };
  if (stage)  filter.stage  = stage;
  if (source) filter.source = source;
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
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Lead.countDocuments(filter),
  ]);

  sendSuccess(res, 200, "Leads fetched", {
    leads,
    pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
  });
};

// @desc  Get pipeline summary (count per stage)
// @route GET /api/v1/leads/pipeline
export const getPipeline = async (req, res) => {
  const [stageCounts, sourceCounts, followUpsDue, totalBudget] = await Promise.all([
    Lead.aggregate([
      { $match: { isArchived: false } },
      { $group: { _id: "$stage", count: { $sum: 1 } } },
    ]),
    Lead.aggregate([
      { $match: { isArchived: false } },
      { $group: { _id: "$source", count: { $sum: 1 } } },
    ]),
    Lead.countDocuments({
      isArchived: false,
      followUpDate: { $lte: new Date() },
      stage: { $nin: ["Converted", "Lost"] },
    }),
    Lead.aggregate([
      { $match: { isArchived: false, budget: { $ne: null } } },
      { $group: { _id: null, total: { $sum: "$budget" } } },
    ]),
  ]);

  // Build ordered stage map
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

// @desc  Get single lead
// @route GET /api/v1/leads/:id
export const getLeadById = async (req, res) => {
  const lead = await Lead.findById(req.params.id).populate("convertedTo", "name email company");
  if (!lead) throw new AppError("Lead not found", 404);
  sendSuccess(res, 200, "Lead fetched", { lead });
};

// @desc  Create lead
// @route POST /api/v1/leads
export const createLead = async (req, res) => {
  const { name, phone, email, referenceName, source, services, stage, budget, followUpDate, notes } = req.body;
  const lead = await Lead.create({ name, phone, email, referenceName, source, services, stage, budget, followUpDate, notes });
  sendSuccess(res, 201, "Lead created", { lead });
};

// @desc  Update lead
// @route PUT /api/v1/leads/:id
export const updateLead = async (req, res) => {
  const { name, phone, email, referenceName, source, services, stage, budget, followUpDate, notes, lostReason } = req.body;

  const lead = await Lead.findById(req.params.id);
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

// @desc  Add activity note
// @route POST /api/v1/leads/:id/activity
export const addActivity = async (req, res) => {
  const { note } = req.body;
  if (!note?.trim()) throw new AppError("Note is required", 400);

  const lead = await Lead.findById(req.params.id);
  if (!lead) throw new AppError("Lead not found", 404);

  lead.activities.push({ note: note.trim(), stage: lead.stage });
  await lead.save();

  sendSuccess(res, 201, "Activity added", { activities: lead.activities });
};

// @desc  Convert lead to client
// @route POST /api/v1/leads/:id/convert
export const convertLead = async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) throw new AppError("Lead not found", 404);
  if (lead.stage === "Converted") throw new AppError("Lead already converted", 400);

  // Create client from lead data
  const client = await Client.create({
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

// @desc  Delete lead
// @route DELETE /api/v1/leads/:id
export const deleteLead = async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) throw new AppError("Lead not found", 404);
  await lead.deleteOne();
  sendSuccess(res, 200, "Lead deleted");
};

// @desc  Get meta (stages, sources, services for dropdowns)
// @route GET /api/v1/leads/meta
export const getLeadMeta = async (req, res) => {
  sendSuccess(res, 200, "Meta fetched", { STAGES, SOURCES, SERVICES });
};
