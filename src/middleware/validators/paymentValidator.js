import { body, param } from "express-validator";

export const createPaymentValidator = [
  body("project")
    .notEmpty().withMessage("Project ID is required")
    .isMongoId().withMessage("Invalid project ID"),

  body("totalAmount")
    .notEmpty().withMessage("Total amount is required")
    .isFloat({ min: 0 }).withMessage("Total amount must be a positive number"),

  body("paidAmount")
    .optional()
    .isFloat({ min: 0 }).withMessage("Paid amount must be a positive number"),
];

export const updatePaymentValidator = [
  param("id").isMongoId().withMessage("Invalid payment ID"),

  body("totalAmount")
    .optional()
    .isFloat({ min: 0 }).withMessage("Total amount must be a positive number"),

  body("paidAmount")
    .optional()
    .isFloat({ min: 0 }).withMessage("Paid amount must be a positive number"),
];

export const mongoIdValidator = [
  param("id").isMongoId().withMessage("Invalid payment ID"),
];