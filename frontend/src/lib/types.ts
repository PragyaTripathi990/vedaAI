export type Difficulty = "easy" | "moderate" | "hard";
export type Bloom =
  | "remember"
  | "understand"
  | "apply"
  | "analyze"
  | "evaluate"
  | "create";
export type AssignmentStatus = "queued" | "processing" | "completed" | "failed";

export const BLOOM_LABELS: Record<Bloom, string> = {
  remember: "Remember",
  understand: "Understand",
  apply: "Apply",
  analyze: "Analyze",
  evaluate: "Evaluate",
  create: "Create",
};

export interface Question {
  text: string;
  type: string;
  options?: string[];
  answer: string;
  difficulty: Difficulty;
  bloom: Bloom;
  marks: number;
}

export interface Section {
  title: string;
  instruction: string;
  questions: Question[];
}

export interface QuestionTypeRow {
  label: string;
  count: number;
  marksPerQuestion: number;
}

export interface Variant {
  label: string;
  sections: Section[];
}

export interface Assignment {
  _id: string;
  title: string;
  subject: string;
  grade: string;
  dueDate: string;
  instructions: string;
  sourceText: string;
  questionTypeRows: QuestionTypeRow[];
  totalQuestions: number;
  totalMarks: number;
  difficultyMix: { easy: number; moderate: number; hard: number };
  status: AssignmentStatus;
  progress: number;
  error: string;
  greeting: string;
  timeAllowedMinutes: number;
  sections: Section[];
  variants: Variant[];
  activeVariantIndex?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentSummary {
  _id: string;
  title: string;
  subject: string;
  grade: string;
  status: AssignmentStatus;
  progress: number;
  dueDate: string;
  createdAt: string;
  totalQuestions: number;
  totalMarks: number;
}

// Question type options shown in the Create form dropdown.
// These mirror the labels in the Figma exactly.
export const QUESTION_TYPE_OPTIONS = [
  "Multiple Choice Questions",
  "Short Questions",
  "Long Answer Questions",
  "True / False",
  "Fill in the Blanks",
  "Diagram/Graph-Based Questions",
  "Numerical Problems",
] as const;
