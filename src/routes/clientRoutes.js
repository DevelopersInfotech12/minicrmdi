import express from "express";
import {
  getAllClients, getClientById, getClientProfile,
  createClient, updateClient, deleteClient, toggleClientStatus,
} from "../controllers/clientController.js";
import {
  createClientValidator, updateClientValidator, mongoIdValidator,
} from "../middleware/validators/clientValidator.js";
import handleValidationErrors from "../middleware/validate.js";
import { param } from "express-validator";

const router = express.Router();

router.route("/")
  .get(getAllClients)
  .post(createClientValidator, handleValidationErrors, createClient);

router.get(
  "/:id/profile",
  [param("id").isMongoId().withMessage("Invalid client ID")],
  handleValidationErrors,
  getClientProfile
);

router.route("/:id")
  .get(mongoIdValidator, handleValidationErrors, getClientById)
  .put(updateClientValidator, handleValidationErrors, updateClient)
  .delete(mongoIdValidator, handleValidationErrors, deleteClient);

router.patch("/:id/toggle-status", mongoIdValidator, handleValidationErrors, toggleClientStatus);

export default router;
