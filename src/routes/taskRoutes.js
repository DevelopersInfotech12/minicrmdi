import express from "express";
import {
  getTasksByProject, getOverdueTasks,
  createTask, updateTask, toggleTask, deleteTask,
} from "../controllers/taskController.js";
import { createTaskValidator, updateTaskValidator, mongoIdValidator } from "../middleware/validators/taskValidator.js";
import { param } from "express-validator";
import handleValidationErrors from "../middleware/validate.js";

const router = express.Router();

router.get("/overdue", getOverdueTasks);

router.get(
  "/project/:projectId",
  [param("projectId").isMongoId().withMessage("Invalid project ID")],
  handleValidationErrors,
  getTasksByProject
);

router.route("/")
  .post(createTaskValidator, handleValidationErrors, createTask);

router.route("/:id")
  .put(updateTaskValidator, handleValidationErrors, updateTask)
  .delete(mongoIdValidator, handleValidationErrors, deleteTask);

router.patch("/:id/toggle", mongoIdValidator, handleValidationErrors, toggleTask);

export default router;
