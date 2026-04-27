import { body, param } from "express-validator";

export const createMilestoneValidator = [
  body("project").notEmpty().isMongoId().withMessage("Valid project ID required"),
  body("title").notEmpty().trim().withMessage("Title is required"),
  body("percentage").isFloat({ min: 1, max: 100 }).withMessage("Percentage must be between 1–100"),
  body("amount").isFloat({ min: 0 }).withMessage("Amount must be a positive number"),
  body("dueDate").optional().isISO8601().withMessage("Invalid due date"),
];

export const updateMilestoneValidator = [
  param("id").isMongoId().withMessage("Invalid milestone ID"),
  body("title").optional().trim().notEmpty(),
  body("percentage").optional().isFloat({ min: 1, max: 100 }),
  body("amount").optional().isFloat({ min: 0 }),
  body("paidAmount").optional().isFloat({ min: 0 }),
  body("dueDate").optional().isISO8601(),
  body("paidDate").optional().isISO8601(),
];

export const mongoIdValidator = [
  param("id").isMongoId().withMessage("Invalid ID"),
];
