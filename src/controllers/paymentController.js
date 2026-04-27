import Payment from "../models/Payment.js";
import Project from "../models/Project.js";
import AppError from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";

export const getAllPayments = async (req, res) => {
  const { client, project, page = 1, limit = 10 } = req.query;
  const filter = {};
  if (client) filter.client = client;
  if (project) filter.project = project;
  const skip = (Number(page) - 1) * Number(limit);
  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate("client", "name email phone")
      .populate("project", "title status")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Payment.countDocuments(filter),
  ]);
  sendSuccess(res, 200, "Payments fetched successfully", {
    payments,
    pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
  });
};

export const getPaymentById = async (req, res) => {
  const payment = await Payment.findById(req.params.id)
    .populate("client", "name email phone")
    .populate("project", "title status");
  if (!payment) throw new AppError("Payment not found", 404);
  sendSuccess(res, 200, "Payment fetched successfully", { payment });
};

export const getPaymentByProject = async (req, res) => {
  const payment = await Payment.findOne({ project: req.params.projectId })
    .populate("client", "name email phone")
    .populate("project", "title status");
  if (!payment) throw new AppError("No payment found for this project", 404);
  sendSuccess(res, 200, "Payment fetched successfully", { payment });
};

export const createPayment = async (req, res) => {
  const { project, totalAmount, paidAmount, dueDate } = req.body;
  const projectExists = await Project.findById(project);
  if (!projectExists) throw new AppError("Project not found", 404);
  const existingPayment = await Payment.findOne({ project });
  if (existingPayment) throw new AppError("Payment record already exists for this project.", 409);
  if (paidAmount && paidAmount > totalAmount) throw new AppError("Paid amount cannot exceed total amount", 400);
  const payment = await Payment.create({
    project,
    client: projectExists.client,
    totalAmount,
    paidAmount: paidAmount || 0,
    dueDate: dueDate || null,
  });
  await payment.populate([
    { path: "client", select: "name email phone" },
    { path: "project", select: "title status" },
  ]);
  sendSuccess(res, 201, "Payment created successfully", { payment });
};

export const updatePayment = async (req, res) => {
  const { totalAmount, paidAmount, dueDate } = req.body;
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw new AppError("Payment not found", 404);
  const newTotal = totalAmount !== undefined ? totalAmount : payment.totalAmount;
  const newPaid = paidAmount !== undefined ? paidAmount : payment.paidAmount;
  if (newPaid > newTotal) throw new AppError("Paid amount cannot exceed total amount", 400);
  payment.totalAmount = newTotal;
  payment.paidAmount = newPaid;
  if (dueDate !== undefined) payment.dueDate = dueDate || null;
  await payment.save();
  await payment.populate([
    { path: "client", select: "name email phone" },
    { path: "project", select: "title status" },
  ]);
  sendSuccess(res, 200, "Payment updated successfully", { payment });
};

export const deletePayment = async (req, res) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw new AppError("Payment not found", 404);
  await payment.deleteOne();
  sendSuccess(res, 200, "Payment deleted successfully");
};