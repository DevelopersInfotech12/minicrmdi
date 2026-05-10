import Note from "../models/Note.js";
import Project from "../models/Project.js";
import AppError from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";

export const getNotesByProject = async (req, res) => {
  const project = await Project.findOne({ _id: req.params.projectId, owner: req.user._id });
  if (!project) throw new AppError("Project not found", 404);

  const notes = await Note.find({ project: req.params.projectId, owner: req.user._id })
    .sort({ createdAt: -1 }).lean();

  sendSuccess(res, 200, "Notes fetched successfully", { notes });
};

export const getNoteById = async (req, res) => {
  const note = await Note.findOne({ _id: req.params.id, owner: req.user._id })
    .populate("project", "title status")
    .populate("client", "name email");
  if (!note) throw new AppError("Note not found", 404);
  sendSuccess(res, 200, "Note fetched successfully", { note });
};

export const createNote = async (req, res) => {
  const { content, project } = req.body;
  const projectExists = await Project.findOne({ _id: project, owner: req.user._id });
  if (!projectExists) throw new AppError("Project not found", 404);

  const note = await Note.create({
    owner:   req.user._id,    // ← FIXED
    content,
    project,
    client: projectExists.client,
  });
  sendSuccess(res, 201, "Note added successfully", { note });
};

export const updateNote = async (req, res) => {
  const note = await Note.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id },
    { content: req.body.content },
    { new: true, runValidators: true }
  );
  if (!note) throw new AppError("Note not found", 404);
  sendSuccess(res, 200, "Note updated successfully", { note });
};

export const deleteNote = async (req, res) => {
  const note = await Note.findOne({ _id: req.params.id, owner: req.user._id });
  if (!note) throw new AppError("Note not found", 404);
  await note.deleteOne();
  sendSuccess(res, 200, "Note deleted successfully");
};
