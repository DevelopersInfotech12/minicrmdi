import Task from "../models/Task.js";
import Project from "../models/Project.js";
import AppError from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";

// @desc  Get all tasks for a project
// @route GET /api/v1/tasks/project/:projectId
export const getTasksByProject = async (req, res) => {
  const project = await Project.findById(req.params.projectId);
  if (!project) throw new AppError("Project not found", 404);

  const tasks = await Task.find({ project: req.params.projectId })
    .sort({ order: 1, createdAt: 1 });

  // Stats
  const total     = tasks.length;
  const done      = tasks.filter(t => t.status === "Done").length;
  const overdue   = tasks.filter(t => t.isOverdue).length;
  const inProgress = tasks.filter(t => t.status === "In Progress").length;
  const pct       = total > 0 ? Math.round((done / total) * 100) : 0;

  sendSuccess(res, 200, "Tasks fetched", {
    tasks,
    stats: { total, done, inProgress, overdue, completionPct: pct },
  });
};

// @desc  Get overdue tasks (for dashboard alert)
// @route GET /api/v1/tasks/overdue
export const getOverdueTasks = async (req, res) => {
  const now = new Date();
  const tasks = await Task.find({
    dueDate: { $lt: now },
    status:  { $ne: "Done" },
  })
    .populate("project", "title")
    .populate("client",  "name")
    .sort({ dueDate: 1 })
    .limit(10);

  const totalOverdue = await Task.countDocuments({
    dueDate: { $lt: now },
    status:  { $ne: "Done" },
  });

  sendSuccess(res, 200, "Overdue tasks fetched", { tasks, totalOverdue });
};

// @desc  Create task
// @route POST /api/v1/tasks
export const createTask = async (req, res) => {
  const { project, title, description, status, priority, assignedTo, dueDate, estimatedHours, order } = req.body;

  const projectExists = await Project.findById(project);
  if (!projectExists) throw new AppError("Project not found", 404);

  const task = new Task({
    project,
    client: projectExists.client,
    title, description, status, priority,
    assignedTo, estimatedHours,
    dueDate:  dueDate || null,
    order:    order   || 0,
  });
  await task.save();

  sendSuccess(res, 201, "Task created", { task });
};

// @desc  Update task
// @route PUT /api/v1/tasks/:id
export const updateTask = async (req, res) => {
  const { title, description, status, priority, assignedTo, dueDate, estimatedHours, order } = req.body;

  const task = await Task.findById(req.params.id);
  if (!task) throw new AppError("Task not found", 404);

  if (title          !== undefined) task.title          = title;
  if (description    !== undefined) task.description    = description;
  if (status         !== undefined) task.status         = status;
  if (priority       !== undefined) task.priority       = priority;
  if (assignedTo     !== undefined) task.assignedTo     = assignedTo;
  if (dueDate        !== undefined) task.dueDate        = dueDate || null;
  if (estimatedHours !== undefined) task.estimatedHours = estimatedHours;
  if (order          !== undefined) task.order          = order;

  await task.save();
  sendSuccess(res, 200, "Task updated", { task });
};

// @desc  Toggle task done/undone quickly
// @route PATCH /api/v1/tasks/:id/toggle
export const toggleTask = async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw new AppError("Task not found", 404);

  task.status = task.status === "Done" ? "To Do" : "Done";
  await task.save();

  sendSuccess(res, 200, "Task toggled", { task });
};

// @desc  Delete task
// @route DELETE /api/v1/tasks/:id
export const deleteTask = async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw new AppError("Task not found", 404);
  await task.deleteOne();
  sendSuccess(res, 200, "Task deleted");
};
