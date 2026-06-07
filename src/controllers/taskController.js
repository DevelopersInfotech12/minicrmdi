import Task from "../models/Task.js";
import Project from "../models/Project.js";
import AppError from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { logActivity } from "../utils/activityLogger.js";

export const getTasksByProject = async (req, res) => {
  const project = await Project.findOne({ _id: req.params.projectId, owner: req.user._id });
  if (!project) throw new AppError("Project not found", 404);

  const tasks = await Task.find({ project: req.params.projectId, owner: req.user._id })
    .sort({ order: 1, createdAt: 1 });

  const total      = tasks.length;
  const done       = tasks.filter(t => t.status === "Done").length;
  const overdue    = tasks.filter(t => t.isOverdue).length;
  const inProgress = tasks.filter(t => t.status === "In Progress").length;
  const pct        = total > 0 ? Math.round((done / total) * 100) : 0;

  sendSuccess(res, 200, "Tasks fetched", {
    tasks,
    stats: { total, done, inProgress, overdue, completionPct: pct },
  });
};

export const getOverdueTasks = async (req, res) => {
  const now = new Date();
  const tasks = await Task.find({
    owner:   req.user._id,
    dueDate: { $lt: now },
    status:  { $ne: "Done" },
  })
    .populate("project", "title")
    .sort({ dueDate: 1 })
    .limit(10);

  const totalOverdue = await Task.countDocuments({
    owner:   req.user._id,
    dueDate: { $lt: now },
    status:  { $ne: "Done" },
  });

  sendSuccess(res, 200, "Overdue tasks fetched", { tasks, totalOverdue });
};

export const createTask = async (req, res) => {
  const { project, title, description, status, priority, assignedTo, dueDate, estimatedHours, order } = req.body;

  const projectExists = await Project.findOne({ _id: project, owner: req.user._id });
  if (!projectExists) throw new AppError("Project not found", 404);

  const task = new Task({
    owner:   req.user._id,
    project,
    client:  projectExists.client,
    title, description, status, priority,
    assignedTo, estimatedHours,
    dueDate: dueDate || null,
    order:   order   || 0,
  });
  await task.save();

  await logActivity({
    owner:       req.user._id,
    entityType:  "task",
    entityId:    task._id,
    entityName:  task.title,
    project:     project,
    client:      projectExists.client,
    action:      "created",
    description: `Task "${task.title}" created in project "${projectExists.title}"`,
    page:        "project",
    icon:        "check-circle",
    color:       "#10b981",
  });

  sendSuccess(res, 201, "Task created", { task });
};

export const updateTask = async (req, res) => {
  const { title, description, status, priority, assignedTo, dueDate, estimatedHours, order } = req.body;

  const task = await Task.findOne({ _id: req.params.id, owner: req.user._id });
  if (!task) throw new AppError("Task not found", 404);

  const prevStatus = task.status;

  if (title          !== undefined) task.title          = title;
  if (description    !== undefined) task.description    = description;
  if (status         !== undefined) task.status         = status;
  if (priority       !== undefined) task.priority       = priority;
  if (assignedTo     !== undefined) task.assignedTo     = assignedTo;
  if (dueDate        !== undefined) task.dueDate        = dueDate || null;
  if (estimatedHours !== undefined) task.estimatedHours = estimatedHours;
  if (order          !== undefined) task.order          = order;

  await task.save();

  const isStatusChange = status !== undefined && status !== prevStatus;
  // Only log meaningful updates (skip silent reorder-only updates)
  if (title !== undefined || description !== undefined || status !== undefined || priority !== undefined) {
    await logActivity({
      owner:       req.user._id,
      entityType:  "task",
      entityId:    task._id,
      entityName:  task.title,
      project:     task.project,
      client:      task.client,
      action:      isStatusChange ? "status_changed" : "updated",
      description: isStatusChange
        ? `Task "${task.title}" moved to "${task.status}"`
        : `Task "${task.title}" was updated`,
      changes:     isStatusChange ? [{ field: "status", from: prevStatus, to: task.status }] : [],
      page:        "project",
      icon:        task.status === "Done" ? "check-circle" : "pencil",
      color:       task.status === "Done" ? "#10b981" : "#6366f1",
    });
  }

  sendSuccess(res, 200, "Task updated", { task });
};

export const toggleTask = async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, owner: req.user._id });
  if (!task) throw new AppError("Task not found", 404);
  const prev = task.status;
  task.status = task.status === "Done" ? "To Do" : "Done";
  await task.save();

  await logActivity({
    owner:       req.user._id,
    entityType:  "task",
    entityId:    task._id,
    entityName:  task.title,
    project:     task.project,
    client:      task.client,
    action:      task.status === "Done" ? "completed" : "status_changed",
    description: task.status === "Done"
      ? `Task "${task.title}" marked as Done`
      : `Task "${task.title}" reopened`,
    changes:     [{ field: "status", from: prev, to: task.status }],
    page:        "project",
    icon:        task.status === "Done" ? "check-circle" : "refresh-cw",
    color:       task.status === "Done" ? "#10b981" : "#f59e0b",
  });

  sendSuccess(res, 200, "Task toggled", { task });
};

export const deleteTask = async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, owner: req.user._id });
  if (!task) throw new AppError("Task not found", 404);

  await logActivity({
    owner:       req.user._id,
    entityType:  "task",
    entityId:    task._id,
    entityName:  task.title,
    project:     task.project,
    client:      task.client,
    action:      "deleted",
    description: `Task "${task.title}" was deleted`,
    page:        "project",
    icon:        "trash-2",
    color:       "#ef4444",
  });

  await task.deleteOne();
  sendSuccess(res, 200, "Task deleted");
};
