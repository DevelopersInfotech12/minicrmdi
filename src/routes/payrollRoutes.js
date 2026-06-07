import express from "express";
import {
  getAllPayroll,
  getPayrollStats,
  getPayrollById,
  createPayroll,
  bulkGenerate,
  updatePayroll,
  markAsPaid,
  deletePayroll,
} from "../controllers/payrollController.js";

const router = express.Router();

router.get("/stats",     getPayrollStats);
router.post("/bulk",     bulkGenerate);
router.route("/").get(getAllPayroll).post(createPayroll);
router.route("/:id").get(getPayrollById).put(updatePayroll).delete(deletePayroll);
router.patch("/:id/pay", markAsPaid);

export default router;