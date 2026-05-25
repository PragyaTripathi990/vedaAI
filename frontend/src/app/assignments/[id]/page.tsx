"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  createVariant,
  getAssignment,
  regenerateAssignment,
  regenerateQuestion,
  setActiveVariant,
} from "@/lib/api";
import { Assignment } from "@/lib/types";
import { subscribeToAssignment } from "@/lib/socket";
import { QuestionPaper, ViewMode } from "@/components/QuestionPaper";
import { Topbar } from "@/components/Topbar";
import {
  Download,
  Eye,
  GraduationCap,
  Loader2,
  Plus,
  RotateCw,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

interface PartialPaper {
  greeting?: string;
  timeAllowedMinutes?: number;
  sections?: Assignment["sections"];
}

export default function AssignmentPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [a, setA] = useState<Assignment | null>(null);
  const [partial, setPartial] = useState<PartialPaper | null>(null);
  const [err, setErr] = useState("");
  const [progressMsg, setProgressMsg] = useState("Queued");
  const [downloading, setDownloading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("student");
  const [activeVariant, setActiveVariantIdx] = useState(0);
  const [creatingVariant, setCreatingVariant] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await getAssignment(id);
        if (mounted) setA(data);
      } catch (e) {
        if (mounted) setErr(e instanceof Error ? e.message : "Failed");
      }
    };
    load();
    const unsub = subscribeToAssignment(id, {
      onUpdate: (ev) => {
        setProgressMsg(ev.message || ev.status);
        setA((prev) =>
          prev
            ? {
                ...prev,
                status: ev.status as Assignment["status"],
                progress: ev.progress,
                error: ev.error || prev.error,
              }
            : prev
        );
      },
      onPartial: (paper) => {
        setPartial(paper as PartialPaper);
      },
      onComplete: () => {
        setPartial(null);
        load();
      },
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, [id]);

  const onRegenerate = async () => {
    await regenerateAssignment(id);
    setProgressMsg("Queued");
    setPartial(null);
    const data = await getAssignment(id);
    setA(data);
  };

  const onRegenerateQuestion = async (sectionIndex: number, questionIndex: number) => {
    await regenerateQuestion(id, sectionIndex, questionIndex);
    // The server emits assignment:partial — but also do an immediate fetch as a fallback.
    const data = await getAssignment(id);
    setA(data);
  };

  const onSwitchVariant = async (index: number) => {
    if (!a || index === activeVariant) return;
    setActiveVariantIdx(index);
    await setActiveVariant(id, index);
    const data = await getAssignment(id);
    setA(data);
  };

  const onAddVariant = async () => {
    setCreatingVariant(true);
    try {
      const r = await createVariant(id);
      const data = await getAssignment(id);
      setA(data);
      // Switch to the newly created variant
      const newIndex = (data.variants?.length || 1) - 1;
      setActiveVariantIdx(newIndex);
      await setActiveVariant(id, newIndex);
      const fresh = await getAssignment(id);
      setA(fresh);
      void r;
    } finally {
      setCreatingVariant(false);
    }
  };

  const onDownloadPdf = async () => {
    setDownloading(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const url = `${API}/api/assignments/${id}/pdf?mode=${viewMode}`;
      const link = document.createElement("a");
      link.href = url;
      link.download = "";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } finally {
      // Browser handles the download; give it a beat
      setTimeout(() => setDownloading(false), 800);
    }
  };

  if (err) {
    return (
      <>
        <Topbar title="Create New" />
        <div className="card p-6 text-hard flex items-center gap-2">
          <AlertTriangle size={18} /> {err}
        </div>
      </>
    );
  }

  if (!a) {
    return (
      <>
        <Topbar title="Create New" />
        <div className="card p-6 flex items-center gap-3 text-ink-500">
          <Loader2 className="animate-spin" size={18} /> Loading…
        </div>
      </>
    );
  }

  const isReady = a.status === "completed" && a.sections.length > 0;
  const isStreaming =
    (a.status === "processing" || a.status === "queued") &&
    partial &&
    partial.sections &&
    partial.sections.length > 0;
  const greeting =
    a.greeting ||
    partial?.greeting ||
    (isReady ? `Here is your customized question paper for ${a.title}.` : "");

  // Build a synthetic assignment-shaped object for partial rendering.
  const streamingAssignment: Assignment | null = isStreaming
    ? {
        ...a,
        greeting: partial?.greeting || "",
        timeAllowedMinutes: partial?.timeAllowedMinutes || a.timeAllowedMinutes,
        sections: partial?.sections || [],
      }
    : null;

  return (
    <>
      <Topbar title="Create New" />

      <div className="space-y-4">
        {/* Dark greeting banner */}
        <div className="rounded-3xl bg-ink-900 text-white px-6 sm:px-8 py-6">
          {isReady ? (
            <>
              <p className="text-sm sm:text-base leading-relaxed mb-4">{greeting}</p>
              {a.variants && a.variants.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {a.variants.map((v, i) => (
                    <button
                      key={i}
                      onClick={() => onSwitchVariant(i)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        i === activeVariant
                          ? "bg-accent text-white"
                          : "bg-ink-700/60 text-white hover:bg-ink-500/40"
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                  <button
                    onClick={onAddVariant}
                    disabled={creatingVariant}
                    title="Generate another variant with different questions"
                    className="inline-flex items-center gap-1.5 rounded-full bg-ink-700/60 text-white hover:bg-ink-500/40 px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                  >
                    {creatingVariant ? (
                      <>
                        <Loader2 className="animate-spin" size={12} /> Creating…
                      </>
                    ) : (
                      <>
                        <Plus size={12} /> New variant
                      </>
                    )}
                  </button>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <ViewToggle value={viewMode} onChange={setViewMode} />
                <button
                  onClick={onDownloadPdf}
                  disabled={downloading}
                  className="inline-flex items-center gap-2 rounded-full bg-white text-ink-900 px-4 py-2 text-sm font-semibold hover:bg-ink-100 disabled:opacity-60"
                >
                  {downloading ? (
                    <>
                      <Loader2 className="animate-spin" size={14} /> Preparing…
                    </>
                  ) : (
                    <>
                      <Download size={14} /> Download as PDF
                    </>
                  )}
                </button>
                <button
                  onClick={onRegenerate}
                  className="inline-flex items-center gap-2 rounded-full bg-ink-700 text-white px-4 py-2 text-sm font-semibold hover:bg-ink-500/40"
                >
                  <RotateCw size={14} /> Regenerate
                </button>
              </div>
            </>
          ) : a.status === "failed" ? (
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-rose-400 shrink-0" />
              <div>
                <h2 className="font-semibold mb-1">Generation failed</h2>
                <p className="text-sm text-ink-300">{a.error || "Something went wrong."}</p>
                <button
                  onClick={onRegenerate}
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-white text-ink-900 px-4 py-2 text-sm font-semibold"
                >
                  <RotateCw size={14} /> Try Again
                </button>
              </div>
            </div>
          ) : (
            <ProgressBlock
              progress={a.progress}
              message={progressMsg}
              title={a.title}
              greeting={partial?.greeting}
            />
          )}
        </div>

        {/* Streaming partial preview while generation is in progress */}
        {streamingAssignment && (
          <div className="relative">
            <div className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-accent-50 text-accent-700 px-3 py-1 text-xs font-semibold border border-accent-100">
              <Sparkles size={12} className="animate-pulse" />
              Writing…
            </div>
            <QuestionPaper assignment={streamingAssignment} viewMode="student" />
          </div>
        )}

        {isReady && (
          <QuestionPaper
            assignment={a}
            viewMode={viewMode}
            onRegenerateQuestion={onRegenerateQuestion}
          />
        )}
      </div>
    </>
  );
}

function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div className="inline-flex items-center bg-ink-700/60 rounded-full p-1 border border-ink-500/40">
      <button
        onClick={() => onChange("student")}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
          value === "student" ? "bg-white text-ink-900" : "text-white hover:bg-ink-500/30"
        }`}
      >
        <Eye size={12} /> Student
      </button>
      <button
        onClick={() => onChange("teacher")}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
          value === "teacher" ? "bg-white text-ink-900" : "text-white hover:bg-ink-500/30"
        }`}
      >
        <GraduationCap size={12} /> Teacher
      </button>
    </div>
  );
}

function ProgressBlock({
  progress,
  message,
  title,
  greeting,
}: {
  progress: number;
  message: string;
  title: string;
  greeting?: string;
}) {
  const pct = Math.max(5, Math.min(100, progress || 5));
  return (
    <div className="flex items-start gap-4">
      <div className="h-10 w-10 rounded-full bg-ink-700 flex items-center justify-center shrink-0">
        <Sparkles size={18} className="text-accent animate-pulse" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm sm:text-base mb-1">
          {greeting || (
            <>
              Generating your <span className="font-semibold">{title}</span>…
            </>
          )}
        </p>
        <p className="text-xs text-ink-300 mb-3">{message}</p>
        <div className="h-1.5 w-full rounded-full bg-ink-700 overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
