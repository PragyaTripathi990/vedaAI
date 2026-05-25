"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { Stepper } from "@/components/Stepper";
import { useFormStore } from "@/lib/store";
import { createAssignment } from "@/lib/api";

export default function ReviewStep() {
  const router = useRouter();
  const form = useFormStore();
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const totals = useMemo(
    () =>
      form.questionTypeRows.reduce(
        (acc, r) => ({
          totalQuestions: acc.totalQuestions + r.count,
          totalMarks: acc.totalMarks + r.count * r.marksPerQuestion,
        }),
        { totalQuestions: 0, totalMarks: 0 }
      ),
    [form.questionTypeRows]
  );

  const submit = async () => {
    setErr("");
    setSubmitting(true);
    try {
      const res = await createAssignment({
        title: form.title,
        subject: form.subject,
        grade: form.grade,
        dueDate: form.dueDate,
        instructions: form.instructions,
        sourceText: form.sourceText,
        questionTypeRows: form.questionTypeRows,
        difficultyMix: form.difficultyMix,
      });
      router.push(`/assignments/${res.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Topbar title="Assignment" />
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <h1 className="text-2xl">Review &amp; Generate</h1>
        </div>
        <p className="text-sm text-ink-500">Double-check the details. The AI will start as soon as you confirm.</p>
      </div>

      <Stepper step={2} total={2} />

      <div className="card p-6 lg:p-10 max-w-3xl mx-auto space-y-6">
        <Row label="Title" value={form.title || "—"} />
        <div className="grid sm:grid-cols-3 gap-4">
          <Row label="Subject" value={form.subject || "—"} />
          <Row label="Class / Grade" value={form.grade || "—"} />
          <Row
            label="Due date"
            value={form.dueDate ? new Date(form.dueDate).toLocaleString() : "—"}
          />
        </div>

        <div>
          <div className="text-xs font-medium text-ink-500 mb-2">Question Types</div>
          <div className="rounded-2xl border border-line divide-y divide-line">
            {form.questionTypeRows.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <span className="font-medium">{r.label}</span>
                <span className="text-ink-500">
                  {r.count} × {r.marksPerQuestion} marks ={" "}
                  <span className="text-ink-900 font-semibold">
                    {r.count * r.marksPerQuestion} marks
                  </span>
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-right text-sm">
            <div>Total Questions : <span className="font-semibold">{totals.totalQuestions}</span></div>
            <div>Total Marks : <span className="font-semibold">{totals.totalMarks}</span></div>
          </div>
        </div>

        {form.uploadedFileName && (
          <Row label="Source material" value={form.uploadedFileName} />
        )}

        {form.instructions && (
          <div>
            <div className="text-xs font-medium text-ink-500 mb-1">Additional Information</div>
            <p className="text-sm text-ink-700 whitespace-pre-wrap">{form.instructions}</p>
          </div>
        )}

        {err && (
          <div className="rounded-xl bg-rose-50 text-hard text-sm px-4 py-3">{err}</div>
        )}
      </div>

      <div className="max-w-3xl mx-auto mt-6 flex items-center justify-between">
        <button
          onClick={() => router.push("/assignments/new")}
          className="btn-ghost"
          disabled={submitting}
        >
          <ArrowLeft size={16} /> Previous
        </button>
        <button onClick={submit} className="btn-primary" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="animate-spin" size={16} /> Generating…
            </>
          ) : (
            <>
              <Sparkles size={16} /> Generate Question Paper
            </>
          )}
        </button>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-ink-500 mb-1">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
