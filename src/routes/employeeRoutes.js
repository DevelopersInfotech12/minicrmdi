import express from "express";
import { getAllEmployees, getEmployeeById, createEmployee, updateEmployee, deleteEmployee, toggleStatus } from "../controllers/employeeController.js";

const router = express.Router();
router.route("/").get(getAllEmployees).post(createEmployee);
router.route("/:id").get(getEmployeeById).put(updateEmployee).delete(deleteEmployee);
router.patch("/:id/toggle", toggleStatus);
export default router;
