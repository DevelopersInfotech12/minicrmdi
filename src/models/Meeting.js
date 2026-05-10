import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title:       { type: String, required: [true, "Title is required"], trim: true, maxlength: 150 },
    description: { type: String, trim: true, maxlength: 1000 },
    date:        { type: Date,   required: [true, "Date is required"] },
    startTime:   { type: String, required: [true, "Start time is required"] },
    endTime:     { type: String },
    type: {
      type: String,
      enum: ["Meeting", "Call", "Follow-up", "Demo", "Review", "Other"],
      default: "Meeting",
    },
    status: {
      type: String,
      enum: ["Scheduled", "Completed", "Cancelled", "Rescheduled"],
      default: "Scheduled",
    },
    priority:    { type: String, enum: ["Low", "Medium", "High"], default: "Medium" },
    location:    { type: String, trim: true },
    meetingLink: { type: String, trim: true },
    client:      { type: mongoose.Schema.Types.ObjectId, ref: "Client",  default: null },
    lead:        { type: mongoose.Schema.Types.ObjectId, ref: "Lead",    default: null },
    project:     { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
    notes:       { type: String, trim: true },
  },
  { timestamps: true }
);

meetingSchema.index({ owner: 1, date: 1 });
export default mongoose.model("Meeting", meetingSchema);
