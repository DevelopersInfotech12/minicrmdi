import ActivityLog from "../models/ActivityLog.js";
import { sendSuccess } from "../utils/apiResponse.js";
import AppError from "../utils/AppError.js";

// GET /activity/project/:projectId
export const getProjectActivity = async (req, res) => {
  const { projectId } = req.params;
  const { page = 1, limit = 50 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [logs, total] = await Promise.all([
    ActivityLog.find({ owner: req.user._id, project: projectId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    ActivityLog.countDocuments({ owner: req.user._id, project: projectId }),
  ]);

  sendSuccess(res, 200, "Project activity fetched", {
    logs,
    pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
  });
};

// GET /activity/client/:clientId
export const getClientActivity = async (req, res) => {
  const { clientId } = req.params;
  const { page = 1, limit = 50 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [logs, total] = await Promise.all([
    ActivityLog.find({ owner: req.user._id, client: clientId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    ActivityLog.countDocuments({ owner: req.user._id, client: clientId }),
  ]);

  sendSuccess(res, 200, "Client activity fetched", {
    logs,
    pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
  });
};

// GET /activity/page/:pageName   (pageName: payment | calendar | recurring)
export const getPageActivity = async (req, res) => {
  const { pageName } = req.params;
  const allowed = ["payment", "calendar", "recurring"];
  if (!allowed.includes(pageName)) throw new AppError("Invalid page name", 400);

  const { page = 1, limit = 50 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [logs, total] = await Promise.all([
    ActivityLog.find({ owner: req.user._id, page: pageName })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    ActivityLog.countDocuments({ owner: req.user._id, page: pageName }),
  ]);

  sendSuccess(res, 200, `${pageName} activity fetched`, {
    logs,
    pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
  });
};

// GET /activity/all  (all activity for the owner, latest first)
export const getAllActivity = async (req, res) => {
  const { page = 1, limit = 50, entityType, action } = req.query;
  const filter = { owner: req.user._id };
  if (entityType) filter.entityType = entityType;
  if (action)     filter.action     = action;

  const skip = (Number(page) - 1) * Number(limit);

  const [logs, total] = await Promise.all([
    ActivityLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    ActivityLog.countDocuments(filter),
  ]);

  sendSuccess(res, 200, "All activity fetched", {
    logs,
    pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
  });
};
