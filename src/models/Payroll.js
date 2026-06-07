import mongoose from "mongoose";

const deductionSchema = new mongoose.Schema({
  label:  { type: String, required: true },  // e.g. "PF", "TDS", "Health Insurance"
  amount: { type: Number, required: true, min: 0 },
  type:   { type: String, enum: ["fixed", "percent"], default: "fixed" },
}, { _id: false });

const allowanceSchema = new mongoose.Schema({
  label:  { type: String, required: true },  // e.g. "HRA", "Travel", "Bonus"
  amount: { type: Number, required: true, min: 0 },
}, { _id: false });

const payrollSchema = new mongoose.Schema({
  owner:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  employee:     { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  month:        { type: Number, required: true, min: 1, max: 12 },  // 1-12
  year:         { type: Number, required: true },
  baseSalary:   { type: Number, required: true, min: 0 },
  allowances:   [allowanceSchema],
  deductions:   [deductionSchema],
  grossSalary:  { type: Number, required: true, min: 0 },   // baseSalary + allowances
  totalDeductions: { type: Number, required: true, min: 0 },
  netSalary:    { type: Number, required: true, min: 0 },   // grossSalary - totalDeductions
  paymentStatus: { type: String, enum: ["Pending","Paid","On Hold"], default: "Pending" },
  paymentDate:  { type: Date },
  paymentMode:  { type: String, enum: ["Bank Transfer","Cash","Cheque","UPI"], default: "Bank Transfer" },
  notes:        { type: String, trim: true },
  // working days info
  workingDays:  { type: Number, default: 26 },
  daysWorked:   { type: Number, default: 26 },
}, { timestamps: true });

// unique per employee per month/year
payrollSchema.index({ owner: 1, employee: 1, month: 1, year: 1 }, { unique: true });
payrollSchema.index({ owner: 1, year: 1, month: 1 });

export default mongoose.model("Payroll", payrollSchema);