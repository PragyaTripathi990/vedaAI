"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, ChevronDown, Mic, Plus, Upload, X } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { Stepper } from "@/components/Stepper";
import { NumberStepper } from "@/components/NumberStepper";
import { useFormStore } from "@/lib/store";
import { QUESTION_TYPE_OPTIONS } from "@/lib/types";
import { uploadFile } from "@/lib/api";

export default function NewAssignmentStep1() {
  const router = useRouter();
  const form = useFormStore();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

  const totals = useMemo(() => {
    return form.questionTypeRows.reduce(
      (acc, r) => ({
        totalQuestions: acc.totalQuestions + r.count,
        totalMarks: acc.totalMarks + r.count * r.marksPerQuestion,
      }),
      { totalQuestions: 0, totalMarks: 0 }
    );
  }, [form.questionTypeRows]);

  const onUpload = async (file: File) => {
    setErrors((e) => ({ ...e, upload: "" }));
    if (file.size > 10 * 1024 * 1024) {
      setErrors((e) => ({
        ...e,
        upload: "File is too large. Please upload a file under 10MB.",
      }));
      return;
    }
    setUploading(true);
    try {
      const r = await uploadFile(file);
      form.patch({ sourceText: r.text, uploadedFileName: r.originalName });
    } catch (err) {
      setErrors((e) => ({ ...e, upload: err instanceof Error ? err.message : "Upload failed" }));
    } finally {
      setUploading(false);
    }
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Title is required";
    if (!form.dueDate) e.dueDate = "Due date is required";
    else if (new Date(form.dueDate).getTime() < Date.now() - 86400000)
      e.dueDate = "Due date must be in the future";
    if (form.questionTypeRows.length === 0)
      e.rows = "Add at least one question type";
    form.questionTypeRows.forEach((r, i) => {
      if (!r.label) e[`row-${i}-label`] = "Pick a type";
      if (r.count < 1) e[`row-${i}-count`] = "Min 1";
      if (r.marksPerQuestion < 1) e[`row-${i}-marks`] = "Min 1";
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (validate()) router.push("/assignments/new/review");
  };

  const updateRow = (i: number, patch: Partial<(typeof form.questionTypeRows)[number]>) => {
    const rows = form.questionTypeRows.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    form.set("questionTypeRows", rows);
  };

  const removeRow = (i: number) => {
    form.set(
      "questionTypeRows",
      form.questionTypeRows.filter((_, idx) => idx !== i)
    );
  };

  const addRow = () => {
    const used = new Set(form.questionTypeRows.map((r) => r.label));
    const next = QUESTION_TYPE_OPTIONS.find((o) => !used.has(o)) || QUESTION_TYPE_OPTIONS[0];
    form.set("questionTypeRows", [
      ...form.questionTypeRows,
      { label: next, count: 4, marksPerQuestion: 2 },
    ]);
  };

  return (
    <>
      <Topbar title="Assignment" />
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <h1 className="text-2xl">Create Assignment</h1>
        </div>
        <p className="text-sm text-ink-500">Set up a new assignment for your students</p>
      </div>

      <Stepper step={1} total={2} />

      <div className="card p-6 lg:p-10 max-w-3xl mx-auto">
        <h2 className="text-xl mb-1">Assignment Details</h2>
        <p className="text-sm text-ink-500 mb-6">Basic information about your assignment</p>

        <div className="space-y-5">
          {/* Title + Subject + Grade — required but not in Figma upload card; add subtly above the file upload */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Title</label>
              <input
                className="input"
                placeholder="e.g. Quiz on Electricity"
                value={form.title}
                onChange={(e) => form.set("title", e.target.value)}
              />
              {errors.title && <p className="err">{errors.title}</p>}
            </div>
            <div>
              <label className="label">Subject</label>
              <input
                className="input"
                placeholder="Science"
                value={form.subject}
                onChange={(e) => form.set("subject", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Class / Grade</label>
              <input
                className="input"
                placeholder="Grade 8"
                value={form.grade}
                onChange={(e) => form.set("grade", e.target.value)}
              />
            </div>
          </div>

          {/* File upload — dashed box */}
          <div>
            {form.uploadedFileName ? (
              <div className="flex items-center justify-between rounded-2xl border border-line bg-muted px-4 py-3">
                <div className="text-sm truncate">{form.uploadedFileName}</div>
                <button
                  type="button"
                  onClick={() => form.patch({ sourceText: "", uploadedFileName: "" })}
                  className="text-ink-500 hover:text-hard h-8 w-8 rounded-full flex items-center justify-center hover:bg-ink-100"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-200 bg-muted px-4 py-10 cursor-pointer hover:bg-ink-100">
                <div className="h-10 w-10 rounded-full bg-surface flex items-center justify-center text-ink-700 shadow-card">
                  <Upload size={18} />
                </div>
                <div className="text-sm font-medium text-ink-900">
                  Choose a file or drag & drop it here
                </div>
                <div className="text-xs text-ink-500">PDF or TXT, up to 10MB</div>
                <span className="mt-2 btn-ghost text-xs px-4 py-2">
                  {uploading ? "Uploading…" : "Browse Files"}
                </span>
                <input
                  type="file"
                  accept=".pdf,.txt,.md,text/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUpload(f);
                  }}
                />
              </label>
            )}
            <p className="text-xs text-ink-500 text-center mt-2">
              Upload source material to base questions on (optional)
            </p>
            {errors.upload && <p className="err text-center">{errors.upload}</p>}
          </div>

          {/* Due date */}
          <div>
            <label className="label">Due Date</label>
            <div className="relative">
              <input
                type="datetime-local"
                className="input pr-12"
                value={form.dueDate}
                onChange={(e) => form.set("dueDate", e.target.value)}
              />
              <CalendarDays
                size={16}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none"
              />
            </div>
            {errors.dueDate && <p className="err">{errors.dueDate}</p>}
          </div>

          {/* Question type rows */}
          <div>
            <div className="hidden sm:grid sm:grid-cols-[1fr_120px_120px_32px] items-center gap-3 mb-3">
              <span className="label !mb-0">Question Type</span>
              <span className="text-xs font-medium text-ink-500 text-center">
                No. of Questions
              </span>
              <span className="text-xs font-medium text-ink-500 text-center">
                Marks
              </span>
              <span />
            </div>
            <span className="label sm:hidden">Question Type</span>

            <div className="space-y-4 sm:space-y-3">
              {form.questionTypeRows.map((row, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-line bg-surface p-3 sm:border-0 sm:bg-transparent sm:p-0 sm:grid sm:grid-cols-[1fr_120px_120px_32px] sm:items-center sm:gap-3"
                >
                  {/* Type selector + remove on mobile */}
                  <div className="flex items-center gap-2 sm:gap-0 sm:contents">
                    <div className="relative flex-1 sm:flex-none">
                      <select
                        className="select"
                        value={row.label}
                        onChange={(e) => updateRow(i, { label: e.target.value })}
                      >
                        {QUESTION_TYPE_OPTIONS.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                        {!QUESTION_TYPE_OPTIONS.includes(row.label as typeof QUESTION_TYPE_OPTIONS[number]) && (
                          <option value={row.label}>{row.label}</option>
                        )}
                      </select>
                      <ChevronDown
                        size={16}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="sm:hidden h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center text-ink-500 shrink-0"
                      aria-label="Remove row"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Steppers row on mobile, columns on desktop */}
                  <div className="mt-3 sm:mt-0 grid grid-cols-2 gap-2 sm:contents">
                    <div>
                      <div className="text-[11px] font-medium text-ink-500 mb-1 sm:hidden">
                        No. of Questions
                      </div>
                      <NumberStepper
                        value={row.count}
                        onChange={(n) => updateRow(i, { count: n })}
                        min={1}
                        max={100}
                      />
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-ink-500 mb-1 sm:hidden">
                        Marks
                      </div>
                      <NumberStepper
                        value={row.marksPerQuestion}
                        onChange={(n) => updateRow(i, { marksPerQuestion: n })}
                        min={1}
                        max={50}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="hidden sm:flex h-8 w-8 rounded-full hover:bg-muted items-center justify-center text-ink-500"
                    aria-label="Remove row"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addRow}
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium"
            >
              <span className="h-7 w-7 rounded-full bg-ink-900 text-white flex items-center justify-center">
                <Plus size={14} />
              </span>
              Add Question Type
            </button>

            <div className="mt-4 text-right text-sm text-ink-700">
              <div>
                Total Questions : <span className="font-semibold">{totals.totalQuestions}</span>
              </div>
              <div>
                Total Marks : <span className="font-semibold">{totals.totalMarks}</span>
              </div>
            </div>
            {errors.rows && <p className="err">{errors.rows}</p>}
          </div>

          {/* Additional Information */}
          <div>
            <label className="label">Additional Information (For better output)</label>
            <div className="relative">
              <textarea
                className="textarea pr-12"
                placeholder="e.g Generate a question paper for 3 hour exam duration…"
                value={form.instructions}
                onChange={(e) => form.set("instructions", e.target.value)}
              />
              <Mic size={16} className="absolute right-4 bottom-4 text-ink-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto mt-6 flex items-center justify-between">
        <button onClick={() => router.push("/assignments")} className="btn-ghost">
          <ArrowLeft size={16} /> Previous
        </button>
        <button onClick={next} className="btn-black">
          Next <ArrowRight size={16} />
        </button>
      </div>
    </>
  );
}
