import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
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
    milestone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Milestone",
      default: null, // null = project-level invoice (one-time)
    },
    fileName: {
      type: String,
      required: true, // original file name shown to user
    },
    storedName: {
      type: String,
      required: true, // UUID-based name on disk
    },
    filePath: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number, // bytes
    },
    mimeType: {
      type: String,
    },
    label: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },
  },
  { timestamps: true }
);

const Invoice = mongoose.model("Invoice", invoiceSchema);
export default Invoice;
