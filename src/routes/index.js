import express from "express";
import { protect } from "../middleware/auth.js";
import authRoutes      from "./authRoutes.js";
import clientRoutes    from "./clientRoutes.js";
import projectRoutes   from "./projectRoutes.js";
import noteRoutes      from "./noteRoutes.js";
import paymentRoutes   from "./paymentRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";
import milestoneRoutes from "./milestoneRoutes.js";
import invoiceRoutes   from "./invoiceRoutes.js";
import leadRoutes      from "./leadRoutes.js";
import taskRoutes      from "./taskRoutes.js";
import meetingRoutes   from "./meetingRoutes.js";
import employeeRoutes  from "./employeeRoutes.js";
import activityRoutes  from "./activityRoutes.js";
import payrollRoutes          from "./payrollRoutes.js";
import personalProjectRoutes  from "./personalProjectRoutes.js";

const router = express.Router();

router.use("/auth",      authRoutes);
router.use("/clients",   protect, clientRoutes);
router.use("/projects",  protect, projectRoutes);
router.use("/notes",     protect, noteRoutes);
router.use("/payments",  protect, paymentRoutes);
router.use("/dashboard", protect, dashboardRoutes);
router.use("/milestones",protect, milestoneRoutes);
router.use("/invoices",  protect, invoiceRoutes);
router.use("/leads",     protect, leadRoutes);
router.use("/tasks",     protect, taskRoutes);
router.use("/meetings",  protect, meetingRoutes);
router.use("/employees", protect, employeeRoutes);
router.use("/activity",  protect, activityRoutes);
router.use("/payroll",          protect, payrollRoutes);
router.use("/personal-projects", protect, personalProjectRoutes);

export default router;