import express from "express";
import {
  getAllPersonalProjects, getPersonalProjectById,
  createPersonalProject, updatePersonalProject, deletePersonalProject,
} from "../controllers/personalProjectController.js";
import { createPersonalProjectValidator, updatePersonalProjectValidator, mongoIdValidator } from "../middleware/validators/personalProjectValidator.js";
import handleValidationErrors from "../middleware/validate.js";

const router = express.Router();

router.route("/")
  .get(getAllPersonalProjects)
  .post(createPersonalProjectValidator, handleValidationErrors, createPersonalProject);

router.route("/:id")
  .get(mongoIdValidator, handleValidationErrors, getPersonalProjectById)
  .put(updatePersonalProjectValidator, handleValidationErrors, updatePersonalProject)
  .delete(mongoIdValidator, handleValidationErrors, deletePersonalProject);

export default router;
