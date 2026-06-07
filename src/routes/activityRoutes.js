import express from "express";
import {
  getProjectActivity,
  getClientActivity,
  getPageActivity,
  getAllActivity,
} from "../controllers/activityController.js";
import { param } from "express-validator";
import handleValidationErrors from "../middleware/validate.js";

const router = express.Router();

router.get("/all", getAllActivity);
router.get(
  "/project/:projectId",
  [param("projectId").isMongoId().withMessage("Invalid project ID")],
  handleValidationErrors,
  getProjectActivity
);
router.get(
  "/client/:clientId",
  [param("clientId").isMongoId().withMessage("Invalid client ID")],
  handleValidationErrors,
  getClientActivity
);
router.get("/page/:pageName", getPageActivity);

export default router;
