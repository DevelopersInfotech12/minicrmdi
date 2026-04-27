import { body, param } from "express-validator";

export const createClientValidator = [
  body("name")
    .notEmpty().withMessage("Name is required")
    .trim()
    .isLength({ max: 100 }).withMessage("Name cannot exceed 100 characters"),

  body("email")
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Please enter a valid email")
    .normalizeEmail(),

  body("phone")
    .notEmpty().withMessage("Phone number is required")
    .trim()
    .isLength({ max: 20 }).withMessage("Phone number cannot exceed 20 characters"),

  body("address")
    .optional()
    .trim()
    .isLength({ max: 300 }).withMessage("Address cannot exceed 300 characters"),

  body("company")
    .optional()
    .trim()
    .isLength({ max: 150 }).withMessage("Company name cannot exceed 150 characters"),
];

export const updateClientValidator = [
  param("id")
    .isMongoId().withMessage("Invalid client ID"),

  body("name")
    .optional()
    .trim()
    .notEmpty().withMessage("Name cannot be empty")
    .isLength({ max: 100 }).withMessage("Name cannot exceed 100 characters"),

  body("email")
    .optional()
    .isEmail().withMessage("Please enter a valid email")
    .normalizeEmail(),

  body("phone")
    .optional()
    .trim()
    .notEmpty().withMessage("Phone cannot be empty")
    .isLength({ max: 20 }).withMessage("Phone number cannot exceed 20 characters"),

  body("address")
    .optional()
    .trim()
    .isLength({ max: 300 }).withMessage("Address cannot exceed 300 characters"),

  body("company")
    .optional()
    .trim()
    .isLength({ max: 150 }).withMessage("Company name cannot exceed 150 characters"),

  body("isActive")
    .optional()
    .isBoolean().withMessage("isActive must be a boolean"),
];

export const mongoIdValidator = [
  param("id")
    .isMongoId().withMessage("Invalid client ID"),
];