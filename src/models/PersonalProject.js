import mongoose from "mongoose";

export const PP_TECH_STACKS = [
  "React", "Next.js", "Vue", "Nuxt", "Angular", "Svelte",
  "Node.js", "Express", "FastAPI", "Django", "Laravel", "Rails",
  "React Native", "Flutter", "Swift", "Kotlin",
  "MongoDB", "PostgreSQL", "MySQL", "Supabase", "Firebase",
  "TypeScript", "JavaScript", "Python", "PHP", "Go", "Rust",
  "Tailwind CSS", "Other",
];

export const PP_TYPES = ["Website", "Web App", "Mobile App", "API / Backend", "Chrome Extension", "CLI Tool", "Other"];
export const PP_STATUSES = ["In Progress", "Completed", "On Hold", "Idea"];
export const PP_VISIBILITY = ["Public", "Private", "Open Source"];

const personalProjectSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title:       { type: String, required: [true, "Title is required"], trim: true, maxlength: 150 },
    description: { type: String, trim: true, maxlength: 1000 },
    type:        { type: String, enum: PP_TYPES, default: null },
    status:      { type: String, enum: PP_STATUSES, default: "In Progress" },
    visibility:  { type: String, enum: PP_VISIBILITY, default: "Private" },
    techStack:   [{ type: String, enum: PP_TECH_STACKS }],
    liveUrl:     { type: String, trim: true, maxlength: 300 },
    repoUrl:     { type: String, trim: true, maxlength: 300 },
    startDate:   { type: Date },
    endDate:     { type: Date },
    notes:       { type: String, trim: true, maxlength: 2000 },
    assignedTo:  [{ type: String, trim: true, maxlength: 100 }],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

const PersonalProject = mongoose.model("PersonalProject", personalProjectSchema);
export default PersonalProject;
