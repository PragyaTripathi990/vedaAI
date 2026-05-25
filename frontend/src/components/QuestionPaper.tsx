"use client";

import { useState } from "react";
import { Loader2, RotateCw } from "lucide-react";
import { Assignment, Bloom, BLOOM_LABELS, Question, Section } from "@/lib/types";
import { useStudentStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: "Easy",
  moderate: "Moderate",
  hard: "Challenging",
};

// Subtle colored Bloom badges (each level gets its own hue).
const BLOOM_BG: Record<Bloom, string> = {
  remember: "bg-sky-50 text-sky-700",
  understand: "bg-teal-50 text-teal-700",
  apply: "bg-emerald-50 text-emerald-700",
  analyze: "bg-violet-50 text-violet-700",
  evaluate: "bg-amber-50 text-amber-700",
  create: "bg-rose-50 text-rose-700",
};

export type ViewMode = "student" | "teacher";

function QuestionItem({
  q,
  idx,
  viewMode,
  onRegenerate,
}: {
  q: Question;
  idx: number;
  viewMode: ViewMode;
  onRegenerate?: () => Promise<void>;
}) {
  const [regenerating, setRegenerating] = useState(false);
  const handleRegen = async () => {
    if (!onRegenerate || regenerating) return;
    setRegenerating(true);
    try {
      await onRegenerate();
    } finally {
      setRegenerating(false);
    }
  };
  // Partial/streaming data can arrive with missing fields — be defensive.
  const difficulty = q?.difficulty || "";
  const type = q?.type || "";
  const marks = typeof q?.marks === "number" ? q.marks : 0;
  const text = q?.text || "";
  return (
    <li className="group relative text-[15px] leading-relaxed">
      <div className="flex gap-2">
        <span className="shrink-0 text-ink-900">{idx + 1}.</span>
        <span className="flex-1">
          {difficulty && (
            <>
              <span className="font-medium">[{DIFFICULTY_LABEL[difficulty] || difficulty}]</span>{" "}
            </>
          )}
          {text}{" "}
          {marks > 0 && (
            <span className="text-ink-700 whitespace-nowrap">
              [{marks} {marks === 1 ? "Mark" : "Marks"}]
            </span>
          )}
          {q?.bloom && BLOOM_LABELS[q.bloom] && (
            <span
              className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${BLOOM_BG[q.bloom] || "bg-ink-100 text-ink-700"}`}
              title={`Bloom's Taxonomy: ${BLOOM_LABELS[q.bloom]}`}
            >
              {BLOOM_LABELS[q.bloom]}
            </span>
          )}
          {type.toLowerCase().includes("multiple choice") && Array.isArray(q?.options) && (
            <ol className="mt-1.5 ml-1 grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-ink-700">
              {q.options.map((opt, j) => (
                <li key={j} className="flex gap-2">
                  <span className="text-ink-500 font-medium">
                    {String.fromCharCode(65 + j)}.
                  </span>
                  <span>{opt}</span>
                </li>
              ))}
            </ol>
          )}
          {viewMode === "teacher" && q?.answer && (
            <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-sm">
              <span className="font-semibold text-emerald-800">Answer:</span>{" "}
              <span className="text-emerald-900 whitespace-pre-wrap">{q.answer}</span>
            </div>
          )}
        </span>
      </div>
      {onRegenerate && (
        <button
          onClick={handleRegen}
          disabled={regenerating}
          title="Regenerate this question"
          className="no-print absolute -right-2 top-0 lg:opacity-0 lg:group-hover:opacity-100 transition opacity-60 h-8 w-8 rounded-full bg-white border border-line shadow-card flex items-center justify-center text-ink-500 hover:text-ink-900 hover:bg-muted disabled:opacity-100"
        >
          {regenerating ? (
            <Loader2 size={14} className="animate-spin text-accent" />
          ) : (
            <RotateCw size={14} />
          )}
        </button>
      )}
    </li>
  );
}

function SectionBlock({
  section,
  sectionIndex,
  startIdx,
  viewMode,
  onRegenerateQuestion,
}: {
  section: Section;
  sectionIndex: number;
  startIdx: number;
  viewMode: ViewMode;
  onRegenerateQuestion?: (sectionIndex: number, questionIndex: number) => Promise<void>;
}) {
  const questions = Array.isArray(section?.questions) ? section.questions : [];
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-center mb-4">{section?.title || ""}</h2>
      {questions[0]?.type && (
        <h3 className="font-semibold">{questions[0].type}</h3>
      )}
      <p className="italic text-sm text-ink-700 mb-3">{section?.instruction || ""}</p>
      <ol className="list-none p-0 space-y-2.5">
        {questions.map((q, i) => (
          <QuestionItem
            key={i}
            q={q}
            idx={startIdx + i}
            viewMode={viewMode}
            onRegenerate={
              onRegenerateQuestion ? () => onRegenerateQuestion(sectionIndex, i) : undefined
            }
          />
        ))}
      </ol>
    </section>
  );
}

function AnswerKey({ assignment }: { assignment: Assignment }) {
  const sections = Array.isArray(assignment?.sections) ? assignment.sections : [];
  const flat = sections.flatMap((s) =>
    Array.isArray(s?.questions) ? s.questions : []
  );
  return (
    <section className="mt-10">
      <h3 className="text-base font-bold mb-3">Answer Key:</h3>
      <ol className="list-none p-0 space-y-3">
        {flat.map((q, i) => (
          <li key={i} className="flex gap-2 text-[15px] leading-relaxed">
            <span className="shrink-0 text-ink-900">{i + 1}.</span>
            <span className="flex-1 whitespace-pre-wrap text-ink-700">{q?.answer || ""}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function QuestionPaper({
  assignment,
  viewMode = "student",
  onRegenerateQuestion,
}: {
  assignment: Assignment;
  viewMode?: ViewMode;
  onRegenerateQuestion?: (sectionIndex: number, questionIndex: number) => Promise<void>;
}) {
  const { name, rollNumber, section, setStudent } = useStudentStore();
  const safeSections = Array.isArray(assignment?.sections) ? assignment.sections : [];
  const totalMarks =
    assignment?.totalMarks ||
    safeSections.reduce(
      (s, sec) =>
        s +
        (Array.isArray(sec?.questions)
          ? sec.questions.reduce((ss, q) => ss + (typeof q?.marks === "number" ? q.marks : 0), 0)
          : 0),
      0
    );

  let running = 0;
  const authUser = useAuth((s) => s.user);
  const schoolName =
    authUser && authUser.school
      ? `${authUser.school}${authUser.schoolCity ? `, ${authUser.schoolCity}` : ""}`
      : assignment.title;

  return (
    <div id="paper-root" className="card p-8 sm:p-12 print:p-8 print:shadow-none">
      <header className="text-center mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">{schoolName}</h1>
        <div className="mt-1 text-base">Subject: {assignment.subject || "—"}</div>
        <div className="text-base">Class: {assignment.grade || "—"}</div>
      </header>

      <div className="flex items-center justify-between text-sm mb-3">
        <span>
          Time Allowed:{" "}
          <span className="font-medium">
            {assignment.timeAllowedMinutes || 45} minutes
          </span>
        </span>
        <span>
          Maximum Marks: <span className="font-medium">{totalMarks}</span>
        </span>
      </div>

      <p className="text-sm font-medium mb-5">
        All questions are compulsory unless stated otherwise.
      </p>

      <div className="space-y-1.5 mb-8 text-sm">
        <StudentField label="Name" value={name} onChange={(v) => setStudent({ name: v })} />
        <StudentField
          label="Roll Number"
          value={rollNumber}
          onChange={(v) => setStudent({ rollNumber: v })}
        />
        <StudentField
          label="Class / Section"
          value={section}
          onChange={(v) => setStudent({ section: v })}
        />
      </div>

      {safeSections.map((sec, i) => {
        const start = running;
        running += Array.isArray(sec?.questions) ? sec.questions.length : 0;
        return (
          <SectionBlock
            key={i}
            section={sec}
            sectionIndex={i}
            startIdx={start}
            viewMode={viewMode}
            onRegenerateQuestion={onRegenerateQuestion}
          />
        );
      })}

      <div className="text-sm font-bold mt-6">End of Question Paper</div>

      {viewMode === "teacher" && <AnswerKey assignment={assignment} />}
    </div>
  );
}

function StudentField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-semibold w-28 shrink-0">{label}:</span>
      <input
        className="flex-1 max-w-xs border-b border-ink-900 bg-transparent px-1 focus:outline-none focus:border-accent print:border-ink-900"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
