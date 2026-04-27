import mongoose from "mongoose";

const SERVICE_TYPES = ["Website Development","App Development","SEO","Social Media Marketing","Google Ads","Meta Ads","Branding / Design","Content Writing","Other"];
const PRIORITY_TYPES = ["Urgent","Long-term","One-time","Retainer"];
const BILLING_CYCLES = ["Monthly","Quarterly","Half-yearly","Yearly"];

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true,"Project title is required"], trim: true, maxlength: 150 },
    description: { type: String, trim: true, maxlength: 1000 },
    client: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: [true,"Client is required"] },
    status: { type: String, enum: ["Active","Completed","On Hold"], default: "Active" },

    // ── Phase 4 additions ──────────────────────────────────────────
    serviceType:  { type: String, enum: SERVICE_TYPES, default: null },
    priority:     { type: String, enum: PRIORITY_TYPES, default: null },

    // Recurring payment fields
    isRecurring:     { type: Boolean, default: false },
    billingCycle:    { type: String, enum: BILLING_CYCLES, default: null },
    recurringAmount: { type: Number, default: null, min: 0 },
    nextBillingDate: { type: Date, default: null },
    lastBilledDate:  { type: Date, default: null },
    recurringActive: { type: Boolean, default: true },

    startDate: { type: Date },
    endDate:   { type: Date },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

projectSchema.virtual("notes",   { ref: "Note",    localField: "_id", foreignField: "project" });
projectSchema.virtual("payment", { ref: "Payment", localField: "_id", foreignField: "project", justOne: true });

// Auto-calculate nextBillingDate when billingCycle or lastBilledDate changes
projectSchema.methods.computeNextBillingDate = function () {
  if (!this.isRecurring || !this.billingCycle) return;
  const base = this.lastBilledDate ? new Date(this.lastBilledDate) : new Date();
  const next = new Date(base);
  switch (this.billingCycle) {
    case "Monthly":     next.setMonth(next.getMonth() + 1); break;
    case "Quarterly":   next.setMonth(next.getMonth() + 3); break;
    case "Half-yearly": next.setMonth(next.getMonth() + 6); break;
    case "Yearly":      next.setFullYear(next.getFullYear() + 1); break;
  }
  this.nextBillingDate = next;
};

export { SERVICE_TYPES, PRIORITY_TYPES, BILLING_CYCLES };
const Project = mongoose.model("Project", projectSchema);
export default Project;
