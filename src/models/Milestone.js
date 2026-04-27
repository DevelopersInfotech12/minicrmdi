import mongoose from "mongoose";

const milestoneSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project is required"],
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: [true, "Client is required"],
    },
    title: {
      type: String,
      required: [true, "Milestone title is required"],
      trim: true,
      maxlength: [150, "Title cannot exceed 150 characters"],
    },
    percentage: {
      type: Number,
      required: [true, "Percentage is required"],
      min: [1, "Percentage must be at least 1"],
      max: [100, "Percentage cannot exceed 100"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    dueDate: {
      type: Date,
      default: null,
    },
    paidDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["Pending", "Partial", "Paid", "Overdue"],
      default: "Pending",
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: [0, "Paid amount cannot be negative"],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Auto-compute status before save
milestoneSchema.pre("save", function (next) {
  if (this.paidAmount >= this.amount && this.amount > 0) {
    this.status = "Paid";
    if (!this.paidDate) this.paidDate = new Date();
  } else if (this.dueDate && new Date(this.dueDate) < new Date() && this.paidAmount < this.amount) {
    this.status = "Overdue";
  } else if (this.paidAmount > 0 && this.paidAmount < this.amount) {
    this.status = "Partial";
  } else {
    this.status = "Pending";
  }
  next();
});

milestoneSchema.virtual("pendingAmount").get(function () {
  return Math.max(0, this.amount - this.paidAmount);
});

const Milestone = mongoose.model("Milestone", milestoneSchema);
export default Milestone;
