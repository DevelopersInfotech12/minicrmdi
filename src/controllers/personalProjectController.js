import PersonalProject from "../models/PersonalProject.js";
import AppError from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";

export const getAllPersonalProjects = async (req, res) => {
  const { status, type, search, page = 1, limit = 12, sortBy = "createdAt", order = "desc" } = req.query;
  const filter = { owner: req.user._id };
  if (status) filter.status = status;
  if (type)   filter.type   = type;
  if (search) filter.title  = { $regex: search, $options: "i" };

  const skip = (Number(page) - 1) * Number(limit);
  const [projects, total] = await Promise.all([
    PersonalProject.find(filter)
      .sort({ [sortBy]: order === "asc" ? 1 : -1 })
      .skip(skip).limit(Number(limit)).lean(),
    PersonalProject.countDocuments(filter),
  ]);
  sendSuccess(res, 200, "Personal projects fetched", {
    projects,
    pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
  });
};

export const getPersonalProjectById = async (req, res) => {
  const project = await PersonalProject.findOne({ _id: req.params.id, owner: req.user._id });
  if (!project) throw new AppError("Personal project not found", 404);
  sendSuccess(res, 200, "Personal project fetched", { project });
};

export const createPersonalProject = async (req, res) => {
  const { title, description, type, status, visibility, techStack, liveUrl, repoUrl, startDate, endDate, notes } = req.body;
  const project = await PersonalProject.create({
    owner: req.user._id, title, description, type, status, visibility,
    techStack: techStack || [], liveUrl, repoUrl, startDate, endDate, notes,
  });
  sendSuccess(res, 201, "Personal project created", { project });
};

export const updatePersonalProject = async (req, res) => {
  const project = await PersonalProject.findOne({ _id: req.params.id, owner: req.user._id });
  if (!project) throw new AppError("Personal project not found", 404);
  const fields = ["title","description","type","status","visibility","techStack","liveUrl","repoUrl","startDate","endDate","notes"];
  fields.forEach(f => { if (req.body[f] !== undefined) project[f] = req.body[f]; });
  await project.save();
  sendSuccess(res, 200, "Personal project updated", { project });
};

export const deletePersonalProject = async (req, res) => {
  const project = await PersonalProject.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!project) throw new AppError("Personal project not found", 404);
  sendSuccess(res, 200, "Personal project deleted", {});
};
