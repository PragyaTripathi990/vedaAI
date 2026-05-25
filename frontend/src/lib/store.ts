"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { QuestionTypeRow } from "./types";

export interface CreateFormState {
  title: string;
  subject: string;
  grade: string;
  dueDate: string;
  instructions: string;
  sourceText: string;
  uploadedFileName: string;
  questionTypeRows: QuestionTypeRow[];
  difficultyMix: { easy: number; moderate: number; hard: number };
}

const initial: CreateFormState = {
  title: "",
  subject: "",
  grade: "",
  dueDate: "",
  instructions: "",
  sourceText: "",
  uploadedFileName: "",
  questionTypeRows: [
    { label: "Multiple Choice Questions", count: 4, marksPerQuestion: 1 },
    { label: "Short Questions", count: 3, marksPerQuestion: 2 },
  ],
  difficultyMix: { easy: 0, moderate: 0, hard: 0 },
};

interface FormStore extends CreateFormState {
  set: <K extends keyof CreateFormState>(key: K, value: CreateFormState[K]) => void;
  patch: (p: Partial<CreateFormState>) => void;
  reset: () => void;
}

export const useFormStore = create<FormStore>()(
  persist(
    (set) => ({
      ...initial,
      set: (key, value) => set({ [key]: value } as Partial<CreateFormState>),
      patch: (p) => set(p),
      reset: () => set({ ...initial }),
    }),
    { name: "vedaai-form" }
  )
);

interface StudentInfo {
  name: string;
  rollNumber: string;
  section: string;
}

interface StudentStore extends StudentInfo {
  setStudent: (p: Partial<StudentInfo>) => void;
}

export const useStudentStore = create<StudentStore>((set) => ({
  name: "",
  rollNumber: "",
  section: "",
  setStudent: (p) => set(p),
}));
