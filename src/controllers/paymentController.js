import Payment from "../models/Payment.js";
import Project from "../models/Project.js";
import AppError from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { logActivity, diffObjects } from "../utils/activityLogger.js";

export const getAllPayments = async (req, res) => {
  const { client, project, page = 1, limit = 10 } = req.query;
  const filter = { owner: req.user._id };   // ← already correct
  if (client)  filter.client  = client;
  if (project) filter.project = project;
  const skip = (Number(page) - 1) * Number(limit);
  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate("client",  "name email phone")
      .populate("project", "title status")
      .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Payment.countDocuments(filter),
  ]);
  sendSuccess(res, 200, "Payments fetched successfully", {
    payments,
    pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
  });
};

export const getPaymentById = async (req, res) => {
  const payment = await Payment.findOne({ _id: req.params.id, owner: req.user._id })
    .populate("client",  "name email phone")
    .populate("project", "title status");
  if (!payment) throw new AppError("Payment not found", 404);
  sendSuccess(res, 200, "Payment fetched successfully", { payment });
};

export const getPaymentByProject = async (req, res) => {
  const payment = await Payment.findOne({ project: req.params.projectId, owner: req.user._id })
    .populate("client",  "name email phone")
    .populate("project", "title status");
  if (!payment) throw new AppError("No payment found for this project", 404);
  sendSuccess(res, 200, "Payment fetched successfully", { payment });
};

export const createPayment = async (req, res) => {
  const { project, totalAmount, paidAmount, dueDate } = req.body;
  const projectExists = await Project.findOne({ _id: project, owner: req.user._id });
  if (!projectExists) throw new AppError("Project not found", 404);

  const existingPayment = await Payment.findOne({ project, owner: req.user._id });
  if (existingPayment) throw new AppError("Payment record already exists for this project.", 409);

  if (paidAmount && paidAmount > totalAmount) throw new AppError("Paid amount cannot exceed total amount", 400);

  const payment = await Payment.create({
    owner:   req.user._id,    // ← already correct
    project, client: projectExists.client,
    totalAmount, paidAmount: paidAmount || 0,
    dueDate: dueDate || null,
  });
  await payment.populate([
    { path: "client",  select: "name email phone" },
    { path: "project", select: "title status" },
  ]);

  await logActivity({
    owner: req.user._id,
    entityType: "payment",
    entityId: payment._id,
    entityName: payment.project?.title || "Payment",
    project: payment.project?._id || payment.project,
    client: payment.client?._id || payment.client,
    action: "created",
    description: `Payment created for project "${payment.project?.title}" — Total: ₹${payment.totalAmount}`,
    page: "payment",
    icon: "credit-card",
    color: "#10b981",
  });

  sendSuccess(res, 201, "Payment created successfully", { payment });
};

export const updatePayment = async (req, res) => {
  const { totalAmount, paidAmount, dueDate } = req.body;
  const payment = await Payment.findOne({ _id: req.params.id, owner: req.user._id });
  if (!payment) throw new AppError("Payment not found", 404);

  const before = { totalAmount: payment.totalAmount, paidAmount: payment.paidAmount };

  const newTotal = totalAmount !== undefined ? totalAmount : payment.totalAmount;
  const newPaid  = paidAmount  !== undefined ? paidAmount  : payment.paidAmount;
  if (newPaid > newTotal) throw new AppError("Paid amount cannot exceed total amount", 400);

  payment.totalAmount = newTotal;
  payment.paidAmount  = newPaid;
  if (dueDate !== undefined) payment.dueDate = dueDate || null;
  await payment.save();
  await payment.populate([
    { path: "client",  select: "name email phone" },
    { path: "project", select: "title status" },
  ]);

  const changes = diffObjects(before, { totalAmount: newTotal, paidAmount: newPaid }, ["totalAmount", "paidAmount"]);

  await logActivity({
    owner: req.user._id,
    entityType: "payment",
    entityId: payment._id,
    entityName: payment.project?.title || "Payment",
    project: payment.project?._id || payment.project,
    client: payment.client?._id || payment.client,
    action: "payment_updated",
    description: `Payment updated for "${payment.project?.title}" — Paid: ₹${newPaid} / ₹${newTotal}`,
    changes,
    page: "payment",
    icon: "credit-card",
    color: "#6366f1",
  });

  sendSuccess(res, 200, "Payment updated successfully", { payment });
};

export const deletePayment = async (req, res) => {
  const payment = await Payment.findOne({ _id: req.params.id, owner: req.user._id })
    .populate("project", "title");
  if (!payment) throw new AppError("Payment not found", 404);

  await logActivity({
    owner: req.user._id,
    entityType: "payment",
    entityId: payment._id,
    entityName: payment.project?.title || "Payment",
    project: payment.project?._id || payment.project,
    client: payment.client,
    action: "deleted",
    description: `Payment for "${payment.project?.title}" was deleted`,
    page: "payment",
    icon: "trash-2",
    color: "#ef4444",
  });

  await payment.deleteOne();
  sendSuccess(res, 200, "Payment deleted successfully");
};
