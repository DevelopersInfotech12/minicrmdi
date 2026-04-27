import mongoose from "mongoose";

const STAGES   = ["New", "Called", "Meeting Done", "Proposal Sent", "Converted", "Lost"];
const SOURCES  = ["LinkedIn","Instagram","Facebook","Referral","Google Ads","Walk-in","Cold Call","Website Form","WhatsApp"];
const SERVICES = ["Website Development","App Development","SEO","Social Media Marketing","Google Ads","Meta Ads","Branding / Design","Content Writing","Other"];

const activitySchema = new mongoose.Schema({
  note:      { type: String, required: true, trim: true },
  stage:     { type: String, enum: STAGES },
  createdAt: { type: Date, default: Date.now },
});

const leadSchema = new mongoose.Schema(
  {
    name:          { type: String, required: [true, "Name is required"], trim: true, maxlength: 100 },
    phone:         { type: String, required: [true, "Phone is required"], trim: true, maxlength: 20 },
    email:         { type: String, trim: true, lowercase: true, default: "" },
    referenceName: { type: String, trim: true, default: "" },
    source:        { type: String, enum: SOURCES, required: [true, "Source is required"] },
    services:      [{ type: String, enum: SERVICES }],
    stage:         { type: String, enum: STAGES, default: "New" },
    budget:        { type: Number, default: null },
    followUpDate:  { type: Date, default: null },
    notes:         { type: String, trim: true, maxlength: 1000, default: "" },
    activities:    [activitySchema],
    convertedTo:   { type: mongoose.Schema.Types.ObjectId, ref: "Client", default: null },
    lostReason:    { type: String, trim: true, default: "" },
    isArchived:    { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

leadSchema.virtual("isOverdue").get(function () {
  return this.followUpDate && new Date(this.followUpDate) < new Date() && !["Converted","Lost"].includes(this.stage);
});

const Lead = mongoose.model("Lead", leadSchema);
export { STAGES, SOURCES, SERVICES };
export default Lead;
