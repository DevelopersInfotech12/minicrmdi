import express from "express";
import {
  getAllProjects, getProjectById, getProjectsByClient,
  createProject, updateProject, deleteProject,
  getRecurringDue, getClientRecurringSummary, getProjectMeta,
} from "../controllers/projectController.js";
import { createProjectValidator, updateProjectValidator, mongoIdValidator } from "../middleware/validators/projectValidator.js";
import { param } from "express-validator";
import handleValidationErrors from "../middleware/validate.js";

const router = express.Router();

router.get("/meta",                getProjectMeta);
router.get("/recurring/due",       getRecurringDue);
router.get("/recurring/clients",   getClientRecurringSummary);

router.route("/")
  .get(getAllProjects)
  .post(createProjectValidator, handleValidationErrors, createProject);

router.get("/client/:clientId",
  [param("clientId").isMongoId().withMessage("Invalid client ID")],
  handleValidationErrors, getProjectsByClient
);

router.route("/:id")
  .get(mongoIdValidator, handleValidationErrors, getProjectById)
  .put(updateProjectValidator, handleValidationErrors, updateProject)
  .delete(mongoIdValidator, handleValidationErrors, deleteProject);

export default router;
