import express from "express";
import {
  getNotesByProject,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
} from "../controllers/noteController.js";
import {
  createNoteValidator,
  updateNoteValidator,
  mongoIdValidator,
} from "../middleware/validators/noteValidator.js";
import { param } from "express-validator";
import handleValidationErrors from "../middleware/validate.js";

const router = express.Router();

router
  .route("/")
  .post(createNoteValidator, handleValidationErrors, createNote);

router.get(
  "/project/:projectId",
  [param("projectId").isMongoId().withMessage("Invalid project ID")],
  handleValidationErrors,
  getNotesByProject
);

router
  .route("/:id")
  .get(mongoIdValidator, handleValidationErrors, getNoteById)
  .put(updateNoteValidator, handleValidationErrors, updateNote)
  .delete(mongoIdValidator, handleValidationErrors, deleteNote);

export default router;