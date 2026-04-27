import { body, param } from "express-validator";

const SERVICE_TYPES  = ["Website Development","App Development","SEO","Social Media Marketing","Google Ads","Meta Ads","Branding / Design","Content Writing","Other"];
const PRIORITY_TYPES = ["Urgent","Long-term","One-time","Retainer"];
const BILLING_CYCLES = ["Monthly","Quarterly","Half-yearly","Yearly"];

export const createProjectValidator = [
  body("title").notEmpty().trim().withMessage("Title is required").isLength({ max: 150 }),
  body("client").notEmpty().isMongoId().withMessage("Valid client ID required"),
  body("description").optional().trim().isLength({ max: 1000 }),
  body("status").optional().isIn(["Active","Completed","On Hold"]),
  body("serviceType").optional().isIn(SERVICE_TYPES),
  body("priority").optional().isIn(PRIORITY_TYPES),
  body("isRecurring").optional().isBoolean(),
  body("billingCycle").optional().isIn(BILLING_CYCLES),
  body("recurringAmount").optional().isFloat({ min: 0 }),
  body("nextBillingDate").optional().isISO8601(),
  body("startDate").optional().isISO8601(),
  body("endDate").optional().isISO8601(),
];

export const updateProjectValidator = [
  param("id").isMongoId().withMessage("Invalid project ID"),
  body("title").optional().trim().notEmpty().isLength({ max: 150 }),
  body("description").optional().trim().isLength({ max: 1000 }),
  body("status").optional().isIn(["Active","Completed","On Hold"]),
  body("serviceType").optional().isIn([...SERVICE_TYPES, null]),
  body("priority").optional().isIn([...PRIORITY_TYPES, null]),
  body("isRecurring").optional().isBoolean(),
  body("billingCycle").optional().isIn([...BILLING_CYCLES, null]),
  body("recurringAmount").optional().isFloat({ min: 0 }),
  body("nextBillingDate").optional().isISO8601(),
  body("lastBilledDate").optional().isISO8601(),
  body("recurringActive").optional().isBoolean(),
  body("startDate").optional().isISO8601(),
  body("endDate").optional().isISO8601(),
];

export const mongoIdValidator = [
  param("id").isMongoId().withMessage("Invalid project ID"),
];
