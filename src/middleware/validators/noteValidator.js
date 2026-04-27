import { body, param } from "express-validator";

export const createNoteValidator = [
  body("content")
    .notEmpty().withMessage("Note content is required")
    .trim()
    .isLength({ max: 2000 }).withMessage("Note cannot exceed 2000 characters"),

  body("project")
    .notEmpty().withMessage("Project ID is required")
    .isMongoId().withMessage("Invalid project ID"),
];

export const updateNoteValidator = [
  param("id").isMongoId().withMessage("Invalid note ID"),

  body("content")
    .notEmpty().withMessage("Note content is required")
    .trim()
    .isLength({ max: 2000 }).withMessage("Note cannot exceed 2000 characters"),
];

export const mongoIdValidator = [
  param("id").isMongoId().withMessage("Invalid note ID"),
];