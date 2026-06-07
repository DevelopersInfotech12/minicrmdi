import Note from "../models/Note.js";
import Project from "../models/Project.js";
import AppError from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { logActivity } from "../utils/activityLogger.js";

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
    owner:  req.user._id,
    content,
    project,
    client: projectExists.client,
  });

  const snippet = content.length > 60 ? content.slice(0, 60) + "…" : content;
  await logActivity({
    owner:       req.user._id,
    entityType:  "note",
    entityId:    note._id,
    entityName:  snippet,
    project:     project,
    client:      projectExists.client,
    action:      "created",
    description: `Note added to project "${projectExists.title}"`,
    page:        "project",
    icon:        "pencil",
    color:       "#6366f1",
  });

  sendSuccess(res, 201, "Note added successfully", { note });
};

export const updateNote = async (req, res) => {
  const existing = await Note.findOne({ _id: req.params.id, owner: req.user._id });
  if (!existing) throw new AppError("Note not found", 404);

  const note = await Note.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id },
    { content: req.body.content },
    { new: true, runValidators: true }
  );

  await logActivity({
    owner:       req.user._id,
    entityType:  "note",
    entityId:    note._id,
    project:     note.project,
    client:      note.client,
    action:      "updated",
    description: `Note updated on project`,
    page:        "project",
    icon:        "pencil",
    color:       "#f59e0b",
  });

  sendSuccess(res, 200, "Note updated successfully", { note });
};

export const deleteNote = async (req, res) => {
  const note = await Note.findOne({ _id: req.params.id, owner: req.user._id });
  if (!note) throw new AppError("Note not found", 404);

  await logActivity({
    owner:       req.user._id,
    entityType:  "note",
    entityId:    note._id,
    project:     note.project,
    client:      note.client,
    action:      "deleted",
    description: `Note was deleted`,
    page:        "project",
    icon:        "trash-2",
    color:       "#ef4444",
  });

  await note.deleteOne();
  sendSuccess(res, 200, "Note deleted successfully");
};
