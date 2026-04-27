import { body, param } from "express-validator";

const STAGES   = ["New","Called","Meeting Done","Proposal Sent","Converted","Lost"];
const SOURCES  = ["LinkedIn","Instagram","Facebook","Referral","Google Ads","Walk-in","Cold Call","Website Form","WhatsApp"];
const SERVICES = ["Website Development","App Development","SEO","Social Media Marketing","Google Ads","Meta Ads","Branding / Design","Content Writing","Other"];

export const createLeadValidator = [
  body("name").notEmpty().trim().withMessage("Name is required"),
  body("phone").notEmpty().trim().withMessage("Phone is required"),
  body("email").optional().isEmail().normalizeEmail().withMessage("Invalid email"),
  body("source").notEmpty().isIn(SOURCES).withMessage("Invalid source"),
  body("stage").optional().isIn(STAGES).withMessage("Invalid stage"),
  body("services").optional().isArray().withMessage("Services must be an array"),
  body("budget").optional().isFloat({ min: 0 }).withMessage("Budget must be a positive number"),
  body("followUpDate").optional().isISO8601().withMessage("Invalid follow-up date"),
];

export const updateLeadValidator = [
  param("id").isMongoId().withMessage("Invalid lead ID"),
  body("name").optional().trim().notEmpty(),
  body("phone").optional().trim().notEmpty(),
  body("email").optional().isEmail().normalizeEmail(),
  body("source").optional().isIn(SOURCES),
  body("stage").optional().isIn(STAGES),
  body("services").optional().isArray(),
  body("budget").optional().isFloat({ min: 0 }),
  body("followUpDate").optional().isISO8601(),
];

export const mongoIdValidator = [
  param("id").isMongoId().withMessage("Invalid lead ID"),
];
