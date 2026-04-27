import express from "express";
import {
  getAllPayments,
  getPaymentById,
  getPaymentByProject,
  createPayment,
  updatePayment,
  deletePayment,
} from "../controllers/paymentController.js";
import {
  createPaymentValidator,
  updatePaymentValidator,
  mongoIdValidator,
} from "../middleware/validators/paymentValidator.js";
import { param } from "express-validator";
import handleValidationErrors from "../middleware/validate.js";

const router = express.Router();

router
  .route("/")
  .get(getAllPayments)
  .post(createPaymentValidator, handleValidationErrors, createPayment);

router.get(
  "/project/:projectId",
  [param("projectId").isMongoId().withMessage("Invalid project ID")],
  handleValidationErrors,
  getPaymentByProject
);

router
  .route("/:id")
  .get(mongoIdValidator, handleValidationErrors, getPaymentById)
  .put(updatePaymentValidator, handleValidationErrors, updatePayment)
  .delete(mongoIdValidator, handleValidationErrors, deletePayment);

export default router;