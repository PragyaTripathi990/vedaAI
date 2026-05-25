import { Router } from "express";
import multer from "multer";
import pdfParse from "pdf-parse";
import mongoose from "mongoose";
import { Assignment } from "../models/Assignment";
import { assignmentQueue } from "../queue";
import { createAssignmentSchema } from "../schemas";
import { generateVariant, regenerateOneQuestion } from "../ai";
import { emitAssignmentPartial } from "../socket";
import { streamAssignmentPdf } from "../pdf";
import { AuthedRequest, requireAuth } from "../auth";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// All assignment routes require auth.
router.use(requireAuth);

function computeTotals(rows: { count: number; marksPerQuestion: number }[]) {
  return rows.reduce(
    (acc, r) => ({
      totalQuestions: acc.totalQuestions + r.count,
      totalMarks: acc.totalMarks + r.count * r.marksPerQuestion,
    }),
    { totalQuestions: 0, totalMarks: 0 }
  );
}

function findOwned(req: AuthedRequest, id: string | string[] | undefined) {
  if (typeof id !== "string" || !mongoose.isValidObjectId(id)) return null;
  return Assignment.findOne({ _id: id, userId: req.userId });
}

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const { mimetype, buffer, originalname } = req.file;
    let text = "";
    if (mimetype === "application/pdf" || originalname.toLowerCase().endsWith(".pdf")) {
      const data = await pdfParse(buffer);
      text = data.text;
    } else if (mimetype.startsWith("text/") || originalname.match(/\.(txt|md)$/i)) {
      text = buffer.toString("utf8");
    } else {
      return res.status(415).json({ error: "Unsupported file type. Use PDF or text." });
    }
    res.json({ text: text.slice(0, 50000), originalName: originalname });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

router.post("/", async (req: AuthedRequest, res) => {
  const parsed = createAssignmentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Validation failed",
      issues: parsed.error.flatten().fieldErrors,
    });
  }

  const input = parsed.data;
  const totals = computeTotals(input.questionTypeRows);

  const doc = await Assignment.create({
    userId: req.userId,
    title: input.title,
    subject: input.subject,
    grade: input.grade,
    dueDate: new Date(input.dueDate),
    instructions: input.instructions,
    sourceText: input.sourceText,
    questionTypeRows: input.questionTypeRows,
    totalQuestions: totals.totalQuestions,
    totalMarks: totals.totalMarks,
    difficultyMix: input.difficultyMix,
    status: "queued",
    progress: 0,
  });

  const job = await assignmentQueue.add(
    "generate",
    { assignmentId: doc._id.toString(), input },
    { jobId: doc._id.toString() }
  );
  doc.jobId = job.id || "";
  await doc.save();

  res.status(201).json({ id: doc._id.toString(), status: doc.status });
});

router.post("/:id/regenerate", async (req: AuthedRequest, res) => {
  const doc = await findOwned(req, req.params.id);
  if (!doc) return res.status(404).json({ error: "Not found" });
  doc.status = "queued";
  doc.progress = 0;
  doc.error = "";
  doc.sections = [] as never;
  doc.greeting = "";
  await doc.save();

  const input = {
    title: doc.title,
    subject: doc.subject,
    grade: doc.grade,
    dueDate: doc.dueDate.toISOString(),
    instructions: doc.instructions,
    sourceText: doc.sourceText,
    questionTypeRows: doc.questionTypeRows.map((r) => ({
      label: r.label,
      count: r.count,
      marksPerQuestion: r.marksPerQuestion,
    })),
    difficultyMix: {
      easy: doc.difficultyMix?.easy ?? 0,
      moderate: doc.difficultyMix?.moderate ?? 0,
      hard: doc.difficultyMix?.hard ?? 0,
    },
  };
  const job = await assignmentQueue.add(
    "generate",
    { assignmentId: doc._id.toString(), input },
    { jobId: `${doc._id.toString()}-${Date.now()}` }
  );
  doc.jobId = job.id || "";
  await doc.save();
  res.json({ id: doc._id.toString(), status: doc.status });
});

router.post("/:id/regenerate-question", async (req: AuthedRequest, res) => {
  const { sectionIndex, questionIndex } = req.body as {
    sectionIndex: number;
    questionIndex: number;
  };
  if (
    typeof sectionIndex !== "number" ||
    typeof questionIndex !== "number" ||
    sectionIndex < 0 ||
    questionIndex < 0
  ) {
    return res.status(400).json({ error: "Invalid indices" });
  }
  const doc = await findOwned(req, req.params.id);
  if (!doc) return res.status(404).json({ error: "Not found" });
  const section = doc.sections?.[sectionIndex];
  if (!section) return res.status(404).json({ error: "Section not found" });
  const existing = section.questions?.[questionIndex];
  if (!existing) return res.status(404).json({ error: "Question not found" });

  try {
    const replacement = await regenerateOneQuestion({
      subject: doc.subject,
      grade: doc.grade,
      sourceText: doc.sourceText,
      instructions: doc.instructions,
      sectionTitle: section.title,
      questionType: existing.type,
      marks: existing.marks,
      difficulty: existing.difficulty,
      avoid: existing.text,
    });

    await Assignment.updateOne(
      { _id: doc._id, userId: req.userId },
      { $set: { [`sections.${sectionIndex}.questions.${questionIndex}`]: replacement } }
    );

    const fresh = await Assignment.findOne({ _id: doc._id, userId: req.userId });
    if (fresh) {
      emitAssignmentPartial(doc._id.toString(), {
        greeting: fresh.greeting,
        timeAllowedMinutes: fresh.timeAllowedMinutes,
        sections: fresh.sections,
      });
    }
    res.json({ ok: true, question: replacement });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

router.post("/:id/variants", async (req: AuthedRequest, res) => {
  const doc = await findOwned(req, req.params.id);
  if (!doc) return res.status(404).json({ error: "Not found" });
  if (doc.status !== "completed") {
    return res.status(400).json({ error: "Original must be completed first" });
  }
  const nextLetter = String.fromCharCode("A".charCodeAt(0) + (doc.variants?.length || 0));
  const label = `Set ${nextLetter}`;

  const avoid: string[] = [];
  for (const v of doc.variants || []) {
    for (const s of v.sections) {
      for (const q of s.questions) avoid.push(q.text);
    }
  }

  try {
    const input = {
      title: doc.title,
      subject: doc.subject,
      grade: doc.grade,
      dueDate: doc.dueDate.toISOString(),
      instructions: doc.instructions,
      sourceText: doc.sourceText,
      questionTypeRows: doc.questionTypeRows.map((r) => ({
        label: r.label,
        count: r.count,
        marksPerQuestion: r.marksPerQuestion,
      })),
      difficultyMix: {
        easy: doc.difficultyMix?.easy ?? 0,
        moderate: doc.difficultyMix?.moderate ?? 0,
        hard: doc.difficultyMix?.hard ?? 0,
      },
    };
    const paper = await generateVariant(input, avoid);
    await Assignment.updateOne(
      { _id: doc._id, userId: req.userId },
      { $push: { variants: { label, sections: paper.sections } } }
    );
    res.json({ ok: true, label });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

router.post("/:id/active-variant", async (req: AuthedRequest, res) => {
  const { index } = req.body as { index: number };
  const doc = await findOwned(req, req.params.id);
  if (!doc) return res.status(404).json({ error: "Not found" });
  const v = doc.variants?.[index];
  if (!v) return res.status(404).json({ error: "Variant not found" });
  await Assignment.updateOne({ _id: doc._id, userId: req.userId }, { sections: v.sections });
  res.json({ ok: true });
});

router.delete("/:id", async (req: AuthedRequest, res) => {
  await Assignment.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  res.json({ ok: true });
});

router.get("/:id/pdf", async (req: AuthedRequest, res) => {
  const doc = await findOwned(req, req.params.id);
  if (!doc) return res.status(404).json({ error: "Not found" });
  const teacherMode = req.query.mode === "teacher";
  const { User } = await import("../models/User");
  const user = await User.findById(req.userId).select("school schoolCity");
  const schoolName =
    user && user.school
      ? `${user.school}${user.schoolCity ? `, ${user.schoolCity}` : ""}`
      : doc.title;
  try {
    streamAssignmentPdf(
      res,
      doc as unknown as Parameters<typeof streamAssignmentPdf>[1],
      { teacherMode, schoolName }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

router.get("/:id", async (req: AuthedRequest, res) => {
  const doc = await findOwned(req, req.params.id);
  if (!doc) return res.status(404).json({ error: "Not found" });
  res.json(doc);
});

router.get("/", async (req: AuthedRequest, res) => {
  const docs = await Assignment.find({ userId: req.userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .select(
      "title subject grade status progress dueDate createdAt totalQuestions totalMarks"
    );
  res.json(docs);
});

export default router;
