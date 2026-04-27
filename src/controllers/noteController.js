import Note from "../models/Note.js";
import Project from "../models/Project.js";
import AppError from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";

// @desc    Get all notes for a project
// @route   GET /api/v1/notes/project/:projectId
export const getNotesByProject = async (req, res) => {
  const project = await Project.findById(req.params.projectId);
  if (!project) throw new AppError("Project not found", 404);

  const notes = await Note.find({ project: req.params.projectId })
    .sort({ createdAt: -1 })
    .lean();

  sendSuccess(res, 200, "Notes fetched successfully", { notes });
};

// @desc    Get single note
// @route   GET /api/v1/notes/:id
export const getNoteById = async (req, res) => {
  const note = await Note.findById(req.params.id)
    .populate("project", "title status")
    .populate("client", "name email");

  if (!note) throw new AppError("Note not found", 404);

  sendSuccess(res, 200, "Note fetched successfully", { note });
};

// @desc    Create note
// @route   POST /api/v1/notes
export const createNote = async (req, res) => {
  const { content, project } = req.body;

  const projectExists = await Project.findById(project);
  if (!projectExists) throw new AppError("Project not found", 404);

  const note = await Note.create({
    content,
    project,
    client: projectExists.client,
  });

  sendSuccess(res, 201, "Note added successfully", { note });
};

// @desc    Update note
// @route   PUT /api/v1/notes/:id
export const updateNote = async (req, res) => {
  const note = await Note.findByIdAndUpdate(
    req.params.id,
    { content: req.body.content },
    { new: true, runValidators: true }
  );

  if (!note) throw new AppError("Note not found", 404);

  sendSuccess(res, 200, "Note updated successfully", { note });
};

// @desc    Delete note
// @route   DELETE /api/v1/notes/:id
export const deleteNote = async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) throw new AppError("Note not found", 404);

  await note.deleteOne();

  sendSuccess(res, 200, "Note deleted successfully");
};