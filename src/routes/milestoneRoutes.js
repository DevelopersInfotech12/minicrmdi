import express from "express";
import {
  getMilestonesByProject,
  getMilestoneAlerts,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  markMilestonePaid,
} from "../controllers/milestoneController.js";
import {
  createMilestoneValidator,
  updateMilestoneValidator,
  mongoIdValidator,
} from "../middleware/validators/milestoneValidator.js";
import { param } from "express-validator";
import handleValidationErrors from "../middleware/validate.js";

const router = express.Router();

router.get("/alerts", getMilestoneAlerts);

router.get(
  "/project/:projectId",
  [param("projectId").isMongoId().withMessage("Invalid project ID")],
  handleValidationErrors,
  getMilestonesByProject
);

router
  .route("/")
  .post(createMilestoneValidator, handleValidationErrors, createMilestone);

router
  .route("/:id")
  .put(updateMilestoneValidator, handleValidationErrors, updateMilestone)
  .delete(mongoIdValidator, handleValidationErrors, deleteMilestone);

router.patch("/:id/mark-paid", mongoIdValidator, handleValidationErrors, markMilestonePaid);

export default router;
