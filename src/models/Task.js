import mongoose from "mongoose";

const PRIORITIES = ["High", "Medium", "Low"];
const STATUSES   = ["To Do", "In Progress", "Done"];

const taskSchema = new mongoose.Schema(
  {
    project:     { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: [true, "Project is required"] },
    client:      { type: mongoose.Schema.Types.ObjectId, ref: "Client",  required: [true, "Client is required"]  },
    title:       { type: String, required: [true, "Task title is required"], trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 1000, default: "" },
    status:      { type: String, enum: STATUSES,   default: "To Do"  },
    priority:    { type: String, enum: PRIORITIES, default: "Medium" },
    assignedTo:  { type: String, trim: true, maxlength: 100, default: "" },
    dueDate:     { type: Date, default: null },
    estimatedHours: { type: Number, min: 0, default: null },
    completedAt: { type: Date, default: null },
    order:       { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

taskSchema.virtual("isOverdue").get(function () {
  return this.dueDate && new Date(this.dueDate) < new Date() && this.status !== "Done";
});

// Auto-set completedAt when status → Done
taskSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    if (this.status === "Done" && !this.completedAt) this.completedAt = new Date();
    if (this.status !== "Done") this.completedAt = null;
  }
  next();
});

export { PRIORITIES, STATUSES };
const Task = mongoose.model("Task", taskSchema);
export default Task;
