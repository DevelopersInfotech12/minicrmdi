import express from "express";
import { upload } from "../config/multer.js";
import {
  getInvoicesByProject,
  uploadInvoice,
  downloadInvoice,
  deleteInvoice,
} from "../controllers/invoiceController.js";
import { param } from "express-validator";
import handleValidationErrors from "../middleware/validate.js";

const router = express.Router();

router.get(
  "/project/:projectId",
  [param("projectId").isMongoId().withMessage("Invalid project ID")],
  handleValidationErrors,
  getInvoicesByProject
);

router.post(
  "/upload",
  upload.single("invoice"),
  uploadInvoice
);

router.get(
  "/:id/download",
  [param("id").isMongoId().withMessage("Invalid invoice ID")],
  handleValidationErrors,
  downloadInvoice
);

router.delete(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid invoice ID")],
  handleValidationErrors,
  deleteInvoice
);

export default router;
