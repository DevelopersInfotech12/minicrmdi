import Invoice from "../models/Invoice.js";
import Project from "../models/Project.js";
import AppError from "../utils/AppError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import fs from "fs";
import path from "path";

// @desc  Get all invoices for a project
// @route GET /api/v1/invoices/project/:projectId
export const getInvoicesByProject = async (req, res) => {
  const project = await Project.findById(req.params.projectId);
  if (!project) throw new AppError("Project not found", 404);

  const invoices = await Invoice.find({ project: req.params.projectId })
    .populate("milestone", "title percentage")
    .sort({ createdAt: -1 });

  sendSuccess(res, 200, "Invoices fetched", { invoices });
};

// @desc  Upload invoice
// @route POST /api/v1/invoices/upload
export const uploadInvoice = async (req, res) => {
  if (!req.file) throw new AppError("No file uploaded", 400);

  const { projectId, milestoneId, label } = req.body;

  const project = await Project.findById(projectId);
  if (!project) {
    // Remove uploaded file if project not found
    fs.unlinkSync(req.file.path);
    throw new AppError("Project not found", 404);
  }

  const invoice = await Invoice.create({
    project: projectId,
    client: project.client,
    milestone: milestoneId || null,
    fileName: req.file.originalname,
    storedName: req.file.filename,
    filePath: req.file.path,
    fileSize: req.file.size,
    mimeType: req.file.mimetype,
    label: label || "",
  });

  await invoice.populate("milestone", "title percentage");

  sendSuccess(res, 201, "Invoice uploaded successfully", { invoice });
};

// @desc  Download invoice
// @route GET /api/v1/invoices/:id/download
export const downloadInvoice = async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) throw new AppError("Invoice not found", 404);

  const absolutePath = path.resolve(invoice.filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new AppError("File not found on server", 404);
  }

  res.setHeader("Content-Disposition", `attachment; filename="${invoice.fileName}"`);
  res.setHeader("Content-Type", invoice.mimeType || "application/pdf");
  res.sendFile(absolutePath);
};

// @desc  Delete invoice
// @route DELETE /api/v1/invoices/:id
export const deleteInvoice = async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) throw new AppError("Invoice not found", 404);

  // Delete file from disk
  const absolutePath = path.resolve(invoice.filePath);
  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }

  await invoice.deleteOne();
  sendSuccess(res, 200, "Invoice deleted");
};
