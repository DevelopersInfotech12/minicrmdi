import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Which entity this activity is about
    entityType: {
      type: String,
      enum: ["project", "client", "payment", "milestone", "note", "task", "meeting", "invoice", "recurring"],
      required: true,
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    entityName: { type: String, trim: true }, // snapshot name at time of action

    // Cross-references so we can filter by project or client
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null, index: true },
    client:  { type: mongoose.Schema.Types.ObjectId, ref: "Client",  default: null, index: true },

    action: {
      type: String,
      enum: ["created", "updated", "deleted", "status_changed", "payment_added", "payment_updated", "assigned", "completed", "cancelled", "rescheduled", "billed"],
      required: true,
    },

    description: { type: String, trim: true, maxlength: 500 },

    // Key changes (e.g. { field: "status", from: "Active", to: "Completed" })
    changes: [
      {
        field:    String,
        from:     mongoose.Schema.Types.Mixed,
        to:       mongoose.Schema.Types.Mixed,
      },
    ],

    // Page context for frontend filtering
    page: {
      type: String,
      enum: ["project", "client", "payment", "calendar", "recurring"],
      required: true,
    },

    icon:  { type: String, default: "activity" }, // lucide icon name hint
    color: { type: String, default: "#6366f1" },  // hex color hint
  },
  { timestamps: true }
);

// Compound index for fast per-project / per-client queries
activityLogSchema.index({ owner: 1, project: 1, createdAt: -1 });
activityLogSchema.index({ owner: 1, client:  1, createdAt: -1 });
activityLogSchema.index({ owner: 1, page:    1, createdAt: -1 });

const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);
export default ActivityLog;
