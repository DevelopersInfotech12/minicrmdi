import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema({
  owner:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name:       { type: String, required: true, trim: true },
  email:      { type: String, required: true, lowercase: true, trim: true },
  phone:      { type: String, trim: true },
  role:       { type: String, required: true, trim: true },
  department: { type: String, trim: true },
  employeeId: { type: String, trim: true },
  joinDate:   { type: Date },
  salary:     { type: Number, default: 0 },
  salaryType: { type: String, enum: ["Monthly","Hourly","Contract"], default: "Monthly" },
  status:     { type: String, enum: ["Active","Inactive","On Leave"], default: "Active" },
  address:    { type: String, trim: true },
  avatar:     { type: String, default: null },
  skills:     [{ type: String }],
  notes:      { type: String, trim: true },
}, { timestamps: true });

employeeSchema.index({ owner: 1, email: 1 }, { unique: true });
export default mongoose.model("Employee", employeeSchema);
