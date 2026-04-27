import express from "express";
import {
  getAllLeads, getPipeline, getLeadById, getLeadMeta,
  createLead, updateLead, addActivity, convertLead, deleteLead,
} from "../controllers/leadController.js";
import { createLeadValidator, updateLeadValidator, mongoIdValidator } from "../middleware/validators/leadValidator.js";
import handleValidationErrors from "../middleware/validate.js";
import { body } from "express-validator";

const router = express.Router();

router.get("/meta",     getLeadMeta);
router.get("/pipeline", getPipeline);

router.route("/")
  .get(getAllLeads)
  .post(createLeadValidator, handleValidationErrors, createLead);

router.route("/:id")
  .get(mongoIdValidator, handleValidationErrors, getLeadById)
  .put(updateLeadValidator, handleValidationErrors, updateLead)
  .delete(mongoIdValidator, handleValidationErrors, deleteLead);

router.post("/:id/activity",
  [body("note").notEmpty().withMessage("Note is required")],
  handleValidationErrors, addActivity
);

router.post("/:id/convert", mongoIdValidator, handleValidationErrors, convertLead);

export default router;
