import Employee from "../models/Employee.js";
import { sendSuccess } from "../utils/apiResponse.js";
import AppError from "../utils/AppError.js";

export const getAllEmployees = async (req, res) => {
  const { search, status, department } = req.query;
  const filter = { owner: req.user._id };
  if (status)     filter.status     = status;
  if (department) filter.department = department;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { role:  { $regex: search, $options: "i" } },
    ];
  }
  const employees = await Employee.find(filter).sort({ createdAt: -1 }).lean();
  sendSuccess(res, 200, "Employees fetched", { employees, total: employees.length });
};

export const getEmployeeById = async (req, res) => {
  const employee = await Employee.findOne({ _id: req.params.id, owner: req.user._id });
  if (!employee) throw new AppError("Employee not found", 404);
  sendSuccess(res, 200, "Employee fetched", { employee });
};

export const createEmployee = async (req, res) => {
  const employee = await Employee.create({ ...req.body, owner: req.user._id });
  sendSuccess(res, 201, "Employee added", { employee });
};

export const updateEmployee = async (req, res) => {
  const employee = await Employee.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id }, req.body, { new: true, runValidators: true }
  );
  if (!employee) throw new AppError("Employee not found", 404);
  sendSuccess(res, 200, "Employee updated", { employee });
};

export const deleteEmployee = async (req, res) => {
  const employee = await Employee.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!employee) throw new AppError("Employee not found", 404);
  sendSuccess(res, 200, "Employee deleted");
};

export const toggleStatus = async (req, res) => {
  const emp = await Employee.findOne({ _id: req.params.id, owner: req.user._id });
  if (!emp) throw new AppError("Employee not found", 404);
  emp.status = emp.status === "Active" ? "Inactive" : "Active";
  await emp.save();
  sendSuccess(res, 200, "Status updated", { employee: emp });
};
