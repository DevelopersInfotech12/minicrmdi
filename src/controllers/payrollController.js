import Payroll from "../models/Payroll.js";
import Employee from "../models/Employee.js";
import { sendSuccess } from "../utils/apiResponse.js";
import AppError from "../utils/AppError.js";

// Helper: compute gross/net from base + allowances + deductions
function computeSalary(baseSalary, allowances = [], deductions = [], daysWorked = 26, workingDays = 26) {
  const ratio = workingDays > 0 ? daysWorked / workingDays : 1;
  const effectiveBase = baseSalary * ratio;
  const totalAllowances = allowances.reduce((s, a) => s + (a.amount || 0), 0);
  const grossSalary = effectiveBase + totalAllowances;

  const totalDeductions = deductions.reduce((s, d) => {
    if (d.type === "percent") return s + (grossSalary * (d.amount / 100));
    return s + (d.amount || 0);
  }, 0);

  const netSalary = grossSalary - totalDeductions;
  return {
    grossSalary: Math.round(grossSalary),
    totalDeductions: Math.round(totalDeductions),
    netSalary: Math.round(netSalary),
  };
}

// GET /payroll?month=&year=&status=&employeeId=
export const getAllPayroll = async (req, res) => {
  const { month, year, status, employeeId } = req.query;
  const filter = { owner: req.user._id };
  if (month)      filter.month = Number(month);
  if (year)       filter.year  = Number(year);
  if (status)     filter.paymentStatus = status;
  if (employeeId) filter.employee = employeeId;

  const payrolls = await Payroll.find(filter)
    .populate("employee", "name email role department avatar employeeId")
    .sort({ year: -1, month: -1, createdAt: -1 })
    .lean();

  sendSuccess(res, 200, "Payroll fetched", { payrolls, total: payrolls.length });
};

// GET /payroll/stats?year=
export const getPayrollStats = async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();

  const [monthly, statusBreakdown, topEarners] = await Promise.all([
    // monthly totals for the year
    Payroll.aggregate([
      { $match: { owner: req.user._id, year } },
      { $group: {
        _id: "$month",
        totalNet:   { $sum: "$netSalary" },
        totalGross: { $sum: "$grossSalary" },
        count:      { $sum: 1 },
        paid:       { $sum: { $cond: [{ $eq: ["$paymentStatus", "Paid"] }, 1, 0] } },
      }},
      { $sort: { _id: 1 } },
    ]),

    // status breakdown this year
    Payroll.aggregate([
      { $match: { owner: req.user._id, year } },
      { $group: {
        _id: "$paymentStatus",
        count: { $sum: 1 },
        total: { $sum: "$netSalary" },
      }},
    ]),

    // top 5 earners (net) current year
    Payroll.aggregate([
      { $match: { owner: req.user._id, year } },
      { $group: { _id: "$employee", totalNet: { $sum: "$netSalary" }, months: { $sum: 1 } } },
      { $sort: { totalNet: -1 } },
      { $limit: 5 },
      { $lookup: { from: "employees", localField: "_id", foreignField: "_id", as: "employee" } },
      { $unwind: "$employee" },
      { $project: { "employee.name": 1, "employee.role": 1, "employee.department": 1, totalNet: 1, months: 1 } },
    ]),
  ]);

  sendSuccess(res, 200, "Stats fetched", { monthly, statusBreakdown, topEarners, year });
};

// GET /payroll/:id
export const getPayrollById = async (req, res) => {
  const payroll = await Payroll.findOne({ _id: req.params.id, owner: req.user._id })
    .populate("employee", "name email role department avatar employeeId phone joinDate");
  if (!payroll) throw new AppError("Payroll record not found", 404);
  sendSuccess(res, 200, "Payroll fetched", { payroll });
};

// POST /payroll - create single record
export const createPayroll = async (req, res) => {
  const { employee: employeeId, month, year, baseSalary, allowances, deductions, daysWorked, workingDays, paymentMode, paymentDate, paymentStatus, notes } = req.body;

  // verify employee belongs to owner
  const emp = await Employee.findOne({ _id: employeeId, owner: req.user._id });
  if (!emp) throw new AppError("Employee not found", 404);

  const computed = computeSalary(baseSalary, allowances, deductions, daysWorked || 26, workingDays || 26);

  const payroll = await Payroll.create({
    owner: req.user._id,
    employee: employeeId,
    month, year,
    baseSalary,
    allowances: allowances || [],
    deductions: deductions || [],
    daysWorked: daysWorked || 26,
    workingDays: workingDays || 26,
    paymentMode: paymentMode || "Bank Transfer",
    paymentDate: paymentDate || null,
    paymentStatus: paymentStatus || "Pending",
    notes: notes || "",
    ...computed,
  });

  await payroll.populate("employee", "name email role department avatar employeeId");
  sendSuccess(res, 201, "Payroll record created", { payroll });
};

// POST /payroll/bulk-generate - generate for all active employees for a month
export const bulkGenerate = async (req, res) => {
  const { month, year, workingDays = 26 } = req.body;
  if (!month || !year) throw new AppError("Month and year required", 400);

  const employees = await Employee.find({ owner: req.user._id, status: "Active" }).lean();
  if (!employees.length) throw new AppError("No active employees found", 400);

  const results = { created: 0, skipped: 0, errors: [] };

  for (const emp of employees) {
    try {
      // default deductions: PF 12%, Professional Tax fixed 200
      const defaultDeductions = [
        { label: "PF (Employee)", amount: 12, type: "percent" },
        { label: "Professional Tax", amount: 200, type: "fixed" },
      ];
      const defaultAllowances = emp.salaryType === "Monthly" ? [
        { label: "HRA", amount: Math.round(emp.salary * 0.1) },
      ] : [];

      const computed = computeSalary(emp.salary, defaultAllowances, defaultDeductions, workingDays, workingDays);

      await Payroll.create({
        owner: req.user._id,
        employee: emp._id,
        month, year,
        baseSalary: emp.salary,
        allowances: defaultAllowances,
        deductions: defaultDeductions,
        workingDays,
        daysWorked: workingDays,
        ...computed,
      });
      results.created++;
    } catch (err) {
      if (err.code === 11000) results.skipped++; // already exists
      else results.errors.push({ employee: emp.name, error: err.message });
    }
  }

  sendSuccess(res, 200, `Bulk generate done: ${results.created} created, ${results.skipped} skipped`, { results });
};

// PUT /payroll/:id
export const updatePayroll = async (req, res) => {
  const { baseSalary, allowances, deductions, daysWorked, workingDays, ...rest } = req.body;

  let updateData = { ...rest };
  if (baseSalary !== undefined || allowances || deductions) {
    const existing = await Payroll.findOne({ _id: req.params.id, owner: req.user._id });
    if (!existing) throw new AppError("Payroll record not found", 404);
    const b = baseSalary ?? existing.baseSalary;
    const a = allowances ?? existing.allowances;
    const d = deductions ?? existing.deductions;
    const dw = daysWorked ?? existing.daysWorked;
    const wd = workingDays ?? existing.workingDays;
    const computed = computeSalary(b, a, d, dw, wd);
    updateData = { ...updateData, baseSalary: b, allowances: a, deductions: d, daysWorked: dw, workingDays: wd, ...computed };
  }

  const payroll = await Payroll.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id },
    updateData,
    { new: true, runValidators: true }
  ).populate("employee", "name email role department avatar employeeId");

  if (!payroll) throw new AppError("Payroll record not found", 404);
  sendSuccess(res, 200, "Payroll updated", { payroll });
};

// PATCH /payroll/:id/pay - mark as paid
export const markAsPaid = async (req, res) => {
  const { paymentDate, paymentMode } = req.body;
  const payroll = await Payroll.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id },
    { paymentStatus: "Paid", paymentDate: paymentDate || new Date(), paymentMode: paymentMode || "Bank Transfer" },
    { new: true }
  ).populate("employee", "name email role department avatar employeeId");
  if (!payroll) throw new AppError("Payroll record not found", 404);
  sendSuccess(res, 200, "Marked as paid", { payroll });
};

// DELETE /payroll/:id
export const deletePayroll = async (req, res) => {
  const payroll = await Payroll.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!payroll) throw new AppError("Payroll record not found", 404);
  sendSuccess(res, 200, "Payroll record deleted");
};