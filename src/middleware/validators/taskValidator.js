import { body, param } from "express-validator";

const PRIORITIES = ["High","Medium","Low"];
const STATUSES   = ["To Do","In Progress","Done"];

export const createTaskValidator = [
  body("project").notEmpty().isMongoId().withMessage("Valid project ID required"),
  body("title").notEmpty().trim().withMessage("Title is required").isLength({ max: 200 }),
  body("description").optional().trim().isLength({ max: 1000 }),
  body("status").optional().isIn(STATUSES).withMessage("Invalid status"),
  body("priority").optional().isIn(PRIORITIES).withMessage("Invalid priority"),
  body("assignedTo").optional().trim().isLength({ max: 100 }),
  body("dueDate").optional().isISO8601().withMessage("Invalid due date"),
  body("estimatedHours").optional().isFloat({ min: 0 }).withMessage("Must be positive"),
];

export const updateTaskValidator = [
  param("id").isMongoId().withMessage("Invalid task ID"),
  body("title").optional().trim().notEmpty().isLength({ max: 200 }),
  body("description").optional().trim().isLength({ max: 1000 }),
  body("status").optional().isIn(STATUSES),
  body("priority").optional().isIn(PRIORITIES),
  body("assignedTo").optional().trim().isLength({ max: 100 }),
  body("dueDate").optional().isISO8601(),
  body("estimatedHours").optional().isFloat({ min: 0 }),
];

export const mongoIdValidator = [
  param("id").isMongoId().withMessage("Invalid task ID"),
];
