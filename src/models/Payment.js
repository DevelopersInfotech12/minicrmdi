import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project is required"],
      unique: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: [true, "Client is required"],
    },
    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: [0, "Total amount cannot be negative"],
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: [0, "Paid amount cannot be negative"],
    },
    dueDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

paymentSchema.virtual("pendingAmount").get(function () {
  return this.totalAmount - this.paidAmount;
});

paymentSchema.virtual("status").get(function () {
  const pct = this.totalAmount > 0 ? (this.paidAmount / this.totalAmount) * 100 : 0;
  const overdue = this.dueDate && new Date(this.dueDate) < new Date() && pct < 100;
  if (pct >= 100) return "Paid";
  if (overdue) return "Overdue";
  if (pct > 0) return "Partial";
  return "Pending";
});

paymentSchema.pre("save", function (next) {
  if (this.paidAmount > this.totalAmount) {
    return next(new Error("Paid amount cannot exceed total amount"));
  }
  next();
});

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;