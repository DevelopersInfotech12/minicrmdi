import { body, param } from "express-validator";
import { PP_TYPES, PP_STATUSES, PP_VISIBILITY, PP_TECH_STACKS } from "../../models/PersonalProject.js";


export const createPersonalProjectValidator = [
  body("title").notEmpty().trim().withMessage("Title is required").isLength({ max: 150 }),
  body("description").optional().trim().isLength({ max: 1000 }),
  body("type").optional().isIn(PP_TYPES),
  body("status").optional().isIn(PP_STATUSES),
  body("visibility").optional().isIn(PP_VISIBILITY),
  body("techStack").optional().isArray(),
  body("techStack.*").optional().isIn(PP_TECH_STACKS),
  body("liveUrl").optional().trim().isLength({ max: 300 }),
  body("repoUrl").optional().trim().isLength({ max: 300 }),
  body("startDate").optional().isISO8601(),
  body("endDate").optional().isISO8601(),
  body("notes").optional().trim().isLength({ max: 2000 }),
];

export const updatePersonalProjectValidator = [
  param("id").isMongoId().withMessage("Invalid project ID"),
  body("title").optional().trim().notEmpty().isLength({ max: 150 }),
  body("description").optional().trim().isLength({ max: 1000 }),
  body("type").optional().isIn(PP_TYPES),
  body("status").optional().isIn(PP_STATUSES),
  body("visibility").optional().isIn(PP_VISIBILITY),
  body("techStack").optional().isArray(),
  body("techStack.*").optional().isIn(PP_TECH_STACKS),
  body("liveUrl").optional().trim().isLength({ max: 300 }),
  body("repoUrl").optional().trim().isLength({ max: 300 }),
  body("startDate").optional().isISO8601(),
  body("endDate").optional().isISO8601(),
  body("notes").optional().trim().isLength({ max: 2000 }),
];

export const mongoIdValidator = [
  param("id").isMongoId().withMessage("Invalid project ID"),
];
