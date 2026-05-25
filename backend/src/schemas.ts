import { z } from "zod";

// Per-question-type row — label + count + marks per question
export const questionTypeRowSchema = z.object({
  label: z.string().min(1).max(80),
  count: z.coerce.number().int().positive().max(100),
  marksPerQuestion: z.coerce.number().int().positive().max(50),
});

export const createAssignmentSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  subject: z.string().max(100).optional().default(""),
  grade: z.string().max(50).optional().default(""),
  dueDate: z
    .string()
    .refine((s) => !isNaN(Date.parse(s)), "Invalid due date")
    .refine((s) => new Date(s).getTime() > Date.now() - 86400000, "Due date must be in the future"),
  instructions: z.string().max(2000).optional().default(""),
  sourceText: z.string().max(50000).optional().default(""),
  questionTypeRows: z
    .array(questionTypeRowSchema)
    .min(1, "Add at least one question type"),
  difficultyMix: z
    .object({
      easy: z.coerce.number().int().nonnegative().default(0),
      moderate: z.coerce.number().int().nonnegative().default(0),
      hard: z.coerce.number().int().nonnegative().default(0),
    })
    .optional()
    .default({ easy: 0, moderate: 0, hard: 0 }),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;

export const bloomLevels = [
  "remember",
  "understand",
  "apply",
  "analyze",
  "evaluate",
  "create",
] as const;

export const questionSchema = z.object({
  text: z.string().min(1),
  type: z.string().min(1),
  options: z.array(z.string()).optional(),
  answer: z.string().min(1),
  difficulty: z.enum(["easy", "moderate", "hard"]),
  bloom: z.enum(bloomLevels),
  marks: z.number().positive(),
});

export const sectionSchema = z.object({
  title: z.string().min(1),
  instruction: z.string().min(1),
  questions: z.array(questionSchema).min(1),
});

export const generatedPaperSchema = z.object({
  greeting: z.string().min(1),
  timeAllowedMinutes: z.number().int().positive().optional(),
  sections: z.array(sectionSchema).min(1),
});

export type GeneratedPaper = z.infer<typeof generatedPaperSchema>;
