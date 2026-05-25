import mongoose, { Schema, InferSchemaType } from "mongoose";

const QuestionSchema = new Schema(
  {
    text: { type: String, required: true },
    type: { type: String, required: true },
    options: { type: [String], default: undefined },
    answer: { type: String, required: true },
    difficulty: {
      type: String,
      enum: ["easy", "moderate", "hard"],
      required: true,
    },
    bloom: {
      type: String,
      enum: ["remember", "understand", "apply", "analyze", "evaluate", "create"],
      required: true,
    },
    marks: { type: Number, required: true },
  },
  { _id: false }
);

const SectionSchema = new Schema(
  {
    title: { type: String, required: true },
    instruction: { type: String, required: true },
    questions: { type: [QuestionSchema], required: true },
  },
  { _id: false }
);

const VariantSchema = new Schema(
  {
    label: { type: String, required: true },
    sections: { type: [SectionSchema], required: true },
  },
  { _id: false }
);

const QuestionTypeRowSchema = new Schema(
  {
    label: { type: String, required: true },
    count: { type: Number, required: true },
    marksPerQuestion: { type: Number, required: true },
  },
  { _id: false }
);

const AssignmentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    subject: { type: String, default: "" },
    grade: { type: String, default: "" },
    dueDate: { type: Date, required: true },
    instructions: { type: String, default: "" },
    sourceText: { type: String, default: "" },
    questionTypeRows: { type: [QuestionTypeRowSchema], required: true },
    totalQuestions: { type: Number, required: true },
    totalMarks: { type: Number, required: true },
    difficultyMix: {
      easy: { type: Number, default: 0 },
      moderate: { type: Number, default: 0 },
      hard: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ["queued", "processing", "completed", "failed"],
      default: "queued",
    },
    progress: { type: Number, default: 0 },
    error: { type: String, default: "" },
    greeting: { type: String, default: "" },
    timeAllowedMinutes: { type: Number, default: 0 },
    sections: { type: [SectionSchema], default: [] },
    variants: { type: [VariantSchema], default: [] },
    activeVariantIndex: { type: Number, default: 0 },
    jobId: { type: String, default: "" },
  },
  { timestamps: true }
);

export type AssignmentDoc = InferSchemaType<typeof AssignmentSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Assignment = mongoose.model("Assignment", AssignmentSchema);
