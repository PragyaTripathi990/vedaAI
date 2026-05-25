import OpenAI from "openai";
import { env } from "./env";
import { CreateAssignmentInput, generatedPaperSchema, GeneratedPaper } from "./schemas";

const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const PAPER_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    greeting: { type: "string" },
    timeAllowedMinutes: { type: "integer" },
    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          instruction: { type: "string" },
          questions: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                text: { type: "string" },
                type: { type: "string" },
                options: {
                  anyOf: [
                    { type: "array", items: { type: "string" } },
                    { type: "null" },
                  ],
                },
                answer: { type: "string" },
                difficulty: { type: "string", enum: ["easy", "moderate", "hard"] },
                bloom: {
                  type: "string",
                  enum: [
                    "remember",
                    "understand",
                    "apply",
                    "analyze",
                    "evaluate",
                    "create",
                  ],
                },
                marks: { type: "number" },
              },
              required: [
                "text",
                "type",
                "options",
                "answer",
                "difficulty",
                "bloom",
                "marks",
              ],
            },
          },
        },
        required: ["title", "instruction", "questions"],
      },
    },
  },
  required: ["greeting", "timeAllowedMinutes", "sections"],
} as const;

function buildSystemPrompt(): string {
  return `You are an expert academic assessment designer. You silently plan before you generate.

INTERNAL PLANNING (do not output reasoning — just apply it):
1. Identify the 3–6 core topics from the source/subject the assessment should cover.
2. Map each requested question-type row to specific topics, ensuring breadth.
3. For each question, pick the right Bloom's taxonomy level so the paper escalates from recall to higher-order thinking.
4. Pick difficulty so it matches the teacher's mix and pairs sensibly with Bloom level (e.g. "create" tends to be hard; "remember" tends to be easy).
5. Write each question, verify it has exactly one defensible answer.

OUTPUT RULES:
- Respond only by populating the JSON schema. No prose outside JSON.
- Greeting: friendly one-line addressed to the teacher (e.g. "Certainly! Here is a customized paper for your Grade 8 Science class.").
- Sections: one per question-type row, titled "Section A", "Section B", … in order. Instruction must include per-question marks ("Each question carries N marks.").
- Use the EXACT question-type label the teacher gave — don't paraphrase.
- MCQ: exactly 4 options; "answer" = full text of correct option.
- Non-MCQ: "options" must be null.
- "answer" required for every question — a model answer or worked solution, never empty.
- "bloom" must be one of: remember, understand, apply, analyze, evaluate, create.
- "difficulty" must be one of: easy, moderate, hard.
- Match the teacher's requested count and marks-per-question per row exactly.`;
}

function buildUserPrompt(input: CreateAssignmentInput): string {
  const totalQs = input.questionTypeRows.reduce((s, r) => s + r.count, 0);
  const totalMarks = input.questionTypeRows.reduce(
    (s, r) => s + r.count * r.marksPerQuestion,
    0
  );
  const mix = input.difficultyMix;
  const mixLine =
    mix.easy + mix.moderate + mix.hard > 0
      ? `Difficulty mix: easy=${mix.easy}, moderate=${mix.moderate}, hard=${mix.hard}.`
      : `Difficulty mix: balanced across easy/moderate/hard.`;

  const rows = input.questionTypeRows
    .map(
      (r, i) =>
        `${i + 1}. ${r.label} — ${r.count} questions × ${r.marksPerQuestion} marks each`
    )
    .join("\n");

  return `Create an assessment.

Title: ${input.title}
${input.subject ? `Subject: ${input.subject}` : ""}
${input.grade ? `Grade / Class: ${input.grade}` : ""}
Total questions: ${totalQs}
Total marks: ${totalMarks}

Question types (one section per row, use the exact label):
${rows}

${mixLine}
${input.instructions ? `\nTeacher's notes: ${input.instructions}` : ""}
${input.sourceText ? `\nSource material:\n---\n${input.sourceText.slice(0, 3000)}\n---` : ""}

Plan internally, then produce the JSON. Include a model answer and Bloom level for every question.`;
}

export type StreamEvent =
  | { type: "progress"; pct: number; message: string }
  | { type: "partial"; paper: Partial<GeneratedPaper> };

// Single-question regenerate
const SINGLE_QUESTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    text: { type: "string" },
    type: { type: "string" },
    options: {
      anyOf: [
        { type: "array", items: { type: "string" } },
        { type: "null" },
      ],
    },
    answer: { type: "string" },
    difficulty: { type: "string", enum: ["easy", "moderate", "hard"] },
    bloom: {
      type: "string",
      enum: ["remember", "understand", "apply", "analyze", "evaluate", "create"],
    },
    marks: { type: "number" },
  },
  required: ["text", "type", "options", "answer", "difficulty", "bloom", "marks"],
} as const;

export async function regenerateOneQuestion(args: {
  subject: string;
  grade: string;
  sourceText: string;
  instructions: string;
  sectionTitle: string;
  questionType: string;
  marks: number;
  difficulty: "easy" | "moderate" | "hard";
  avoid: string;
}) {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  const completion = await client.chat.completions.create({
    model: env.OPENAI_MODEL,
    messages: [
      {
        role: "system",
        content: `You write one replacement question. The "type" field MUST be set to the exact label the teacher gave — do not paraphrase, abbreviate, or change capitalization. Provide a model answer. Use the JSON schema. No prose outside JSON.`,
      },
      {
        role: "user",
        content: `Write ONE replacement question for ${args.sectionTitle}.

Type (use this exact label): ${args.questionType}
Marks: ${args.marks}
Difficulty: ${args.difficulty}
${args.subject ? `Subject: ${args.subject}` : ""}
${args.grade ? `Grade: ${args.grade}` : ""}
${args.instructions ? `Teacher's notes: ${args.instructions}` : ""}
${args.sourceText ? `\nSource:\n---\n${args.sourceText.slice(0, 2000)}\n---` : ""}

AVOID this previous question (write something different):
"${args.avoid}"

Rules: MCQ must have exactly 4 options + answer = full text of correct option. Non-MCQ: options = null. answer is required. Pick a Bloom level that fits the difficulty.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "single_question",
        strict: true,
        schema: SINGLE_QUESTION_SCHEMA,
      },
    },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("Model returned no content");
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    throw new Error("Invalid JSON");
  }
  if (raw && typeof raw === "object" && "options" in raw) {
    if ((raw as { options: unknown }).options === null) {
      delete (raw as { options?: unknown }).options;
    }
  }
  // Reuse the question slot of the paper schema by importing the question piece.
  const { questionSchema } = await import("./schemas");
  const parsed = questionSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.message);
  return parsed.data;
}

export async function generateQuestionPaper(
  input: CreateAssignmentInput,
  onEvent?: (e: StreamEvent) => void
): Promise<GeneratedPaper> {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  onEvent?.({ type: "progress", pct: 10, message: "Planning paper" });

  const stream = await client.chat.completions.create({
    model: env.OPENAI_MODEL,
    stream: true,
    messages: [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: buildUserPrompt(input) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "question_paper",
        strict: true,
        schema: PAPER_JSON_SCHEMA,
      },
    },
  });

  let buffer = "";
  let lastEmittedQs = 0;
  let lastEmittedAt = Date.now();
  const totalQs = input.questionTypeRows.reduce((s, r) => s + r.count, 0);

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (!delta) continue;
    buffer += delta;

    // Try a partial parse on each chunk (throttled).
    if (Date.now() - lastEmittedAt > 400) {
      lastEmittedAt = Date.now();
      const partial = tryParsePartial(buffer);
      if (partial) {
        const completedQs = countCompleteQuestions(partial);
        if (completedQs > lastEmittedQs) {
          lastEmittedQs = completedQs;
          const pct = Math.min(
            90,
            20 + Math.round((completedQs / Math.max(totalQs, 1)) * 65)
          );
          onEvent?.({
            type: "progress",
            pct,
            message: `Wrote question ${completedQs} of ${totalQs}`,
          });
          onEvent?.({ type: "partial", paper: partial });
        }
      }
    }
  }

  onEvent?.({ type: "progress", pct: 92, message: "Validating" });

  let raw: unknown;
  try {
    raw = JSON.parse(buffer);
  } catch {
    throw new Error("Model returned invalid JSON");
  }

  if (raw && typeof raw === "object" && "sections" in raw) {
    const sections = (raw as { sections: unknown }).sections;
    if (Array.isArray(sections)) {
      for (const sec of sections) {
        if (sec && typeof sec === "object" && "questions" in sec) {
          const qs = (sec as { questions: unknown }).questions;
          if (Array.isArray(qs)) {
            for (const q of qs) {
              if (q && typeof q === "object" && "options" in q) {
                if ((q as { options: unknown }).options === null) {
                  delete (q as { options?: unknown }).options;
                }
              }
            }
          }
        }
      }
    }
  }

  const parsed = generatedPaperSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Generated paper failed validation: ${parsed.error.message}`);
  }

  onEvent?.({ type: "progress", pct: 100, message: "Done" });
  return parsed.data;
}

// Best-effort: try to parse partial JSON by appending closing brackets.
// Works for the common case where the model has emitted full sections + some
// complete questions inside the current section.
function tryParsePartial(buffer: string): Partial<GeneratedPaper> | null {
  // Quick guard: must have at least started "sections"
  if (!buffer.includes('"sections"')) return null;

  // Walk from the end, find last complete `}` followed by `,` or `]`.
  // Then close the outer structure naively.
  const candidates: string[] = [];
  let depth = 0;
  let inStr = false;
  let escape = false;
  let lastClosedTop = -1;
  for (let i = 0; i < buffer.length; i++) {
    const ch = buffer[i];
    if (inStr) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{" || ch === "[") depth++;
    else if (ch === "}" || ch === "]") {
      depth--;
      if (depth === 0) lastClosedTop = i;
    }
  }

  // Build closing patches. Easiest: append enough `]` and `}` to close.
  // Open brackets remaining = depth.
  if (depth <= 0) {
    candidates.push(buffer);
  } else {
    // Strip a trailing incomplete token (e.g. mid-string or mid-key) by
    // truncating to last syntactically safe boundary.
    let safe = buffer;
    // Truncate to last comma at depth >= 1 outside string — cheap heuristic.
    // Then close.
    // We just close with whatever's needed.
    let closer = "";
    const stack: string[] = [];
    let s = false;
    let e = false;
    for (let i = 0; i < safe.length; i++) {
      const ch = safe[i];
      if (s) {
        if (e) e = false;
        else if (ch === "\\") e = true;
        else if (ch === '"') s = false;
        continue;
      }
      if (ch === '"') s = true;
      else if (ch === "{") stack.push("}");
      else if (ch === "[") stack.push("]");
      else if (ch === "}" || ch === "]") stack.pop();
    }
    // If currently mid-string, truncate before that string.
    if (s) {
      const lastQuote = safe.lastIndexOf('"');
      if (lastQuote > 0) safe = safe.slice(0, lastQuote);
    }
    // Remove trailing comma if any.
    safe = safe.replace(/[,\s]+$/, "");
    // Also remove trailing partial key like `"answ` (key without colon+value).
    safe = safe.replace(/,\s*"[^"]*$/, "");
    closer = stack.reverse().join("");
    candidates.push(safe + closer);
  }

  for (const c of candidates) {
    try {
      const obj = JSON.parse(c);
      if (obj && typeof obj === "object") return obj as Partial<GeneratedPaper>;
    } catch {
      // continue
    }
  }
  // Silence unused var warning
  void lastClosedTop;
  return null;
}

export async function generateVariant(
  input: CreateAssignmentInput,
  avoidQuestionTexts: string[]
): Promise<GeneratedPaper> {
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

  const avoidBlock = avoidQuestionTexts
    .slice(0, 80)
    .map((t, i) => `${i + 1}. ${t}`)
    .join("\n");

  const completion = await client.chat.completions.create({
    model: env.OPENAI_MODEL,
    messages: [
      { role: "system", content: buildSystemPrompt() },
      {
        role: "user",
        content: `${buildUserPrompt(input)}

This is a VARIANT paper. The following questions appeared in previous variants — do NOT repeat or near-duplicate them. Cover the same topics with fresh questions:
---
${avoidBlock || "(no previous questions)"}
---`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "question_paper",
        strict: true,
        schema: PAPER_JSON_SCHEMA,
      },
    },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("Model returned no content");
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    throw new Error("Invalid JSON");
  }
  if (raw && typeof raw === "object" && "sections" in raw) {
    const sections = (raw as { sections: unknown }).sections;
    if (Array.isArray(sections)) {
      for (const sec of sections) {
        if (sec && typeof sec === "object" && "questions" in sec) {
          const qs = (sec as { questions: unknown }).questions;
          if (Array.isArray(qs)) {
            for (const q of qs) {
              if (q && typeof q === "object" && "options" in q) {
                if ((q as { options: unknown }).options === null) {
                  delete (q as { options?: unknown }).options;
                }
              }
            }
          }
        }
      }
    }
  }
  const parsed = generatedPaperSchema.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.message);
  return parsed.data;
}

function countCompleteQuestions(p: Partial<GeneratedPaper>): number {
  if (!p.sections || !Array.isArray(p.sections)) return 0;
  let n = 0;
  for (const sec of p.sections) {
    if (sec && Array.isArray(sec.questions)) {
      for (const q of sec.questions) {
        if (
          q &&
          typeof q === "object" &&
          "text" in q &&
          typeof q.text === "string" &&
          "answer" in q &&
          typeof q.answer === "string" &&
          q.answer.length > 0
        )
          n++;
      }
    }
  }
  return n;
}
