import PDFDocument from "pdfkit";
import type { Response } from "express";
import type { AssignmentDoc } from "./models/Assignment";

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: "Easy",
  moderate: "Moderate",
  hard: "Challenging",
};
const BLOOM_LABEL: Record<string, string> = {
  remember: "Remember",
  understand: "Understand",
  apply: "Apply",
  analyze: "Analyze",
  evaluate: "Evaluate",
  create: "Create",
};

export function streamAssignmentPdf(
  res: Response,
  doc: AssignmentDoc,
  opts: { teacherMode: boolean; schoolName?: string }
) {
  const filename = `${(doc.title || "assignment").replace(/[^\w\s.-]/g, "_")}${opts.teacherMode ? " (Teacher)" : ""}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const pdf = new PDFDocument({
    size: "A4",
    margins: { top: 56, bottom: 56, left: 56, right: 56 },
    info: { Title: doc.title, Author: "VedaAI" },
  });
  pdf.pipe(res);

  const schoolName = opts.schoolName || doc.title;
  const totalMarks =
    doc.totalMarks ||
    doc.sections.reduce(
      (s: number, sec) => s + sec.questions.reduce((ss: number, q) => ss + q.marks, 0),
      0
    );

  // Header
  pdf.font("Helvetica-Bold").fontSize(16).text(schoolName, { align: "center" });
  pdf.moveDown(0.2);
  pdf.font("Helvetica").fontSize(12).text(`Subject: ${doc.subject || "—"}`, { align: "center" });
  pdf.text(`Class: ${doc.grade || "—"}`, { align: "center" });
  pdf.moveDown(0.5);

  // Time / Marks row
  const top = pdf.y;
  pdf.fontSize(10);
  pdf.text(`Time Allowed: ${doc.timeAllowedMinutes || 45} minutes`, 56, top, {
    continued: false,
  });
  pdf.text(`Maximum Marks: ${totalMarks}`, 56, top, { align: "right" });
  pdf.moveDown(0.6);
  pdf
    .font("Helvetica-Bold")
    .fontSize(10)
    .text("All questions are compulsory unless stated otherwise.");
  pdf.moveDown(0.6);

  // Student fields
  pdf.font("Helvetica").fontSize(10);
  drawStudentField(pdf, "Name");
  drawStudentField(pdf, "Roll Number");
  drawStudentField(pdf, "Class / Section");
  pdf.moveDown(0.5);

  // Sections
  let qIndex = 0;
  for (const sec of doc.sections) {
    pdf.moveDown(0.6);
    pdf
      .font("Helvetica-Bold")
      .fontSize(13)
      .text(sec.title, { align: "center" });
    pdf.moveDown(0.2);
    const firstType = sec.questions[0]?.type;
    if (firstType) {
      pdf.font("Helvetica-Bold").fontSize(11).text(firstType);
    }
    pdf
      .font("Helvetica-Oblique")
      .fontSize(10)
      .fillColor("#555")
      .text(sec.instruction);
    pdf.fillColor("#000");
    pdf.moveDown(0.4);

    for (const q of sec.questions) {
      qIndex++;
      pdf.font("Helvetica").fontSize(11);
      const diff = DIFFICULTY_LABEL[q.difficulty] || q.difficulty;
      const bloom = BLOOM_LABEL[q.bloom] || q.bloom;
      const markLabel = `[${q.marks} ${q.marks === 1 ? "Mark" : "Marks"}]`;
      const head = `${qIndex}. [${diff}] ${q.text} ${markLabel}  · ${bloom}`;
      pdf.text(head, { paragraphGap: 4 });

      if (
        q.type.toLowerCase().includes("multiple choice") &&
        q.options &&
        q.options.length
      ) {
        for (let i = 0; i < q.options.length; i++) {
          pdf
            .font("Helvetica")
            .fontSize(10.5)
            .text(`     ${String.fromCharCode(65 + i)}. ${q.options[i]}`);
        }
        pdf.moveDown(0.2);
      } else {
        pdf.moveDown(0.3);
      }

      if (opts.teacherMode && q.answer) {
        pdf
          .font("Helvetica-Bold")
          .fontSize(10)
          .fillColor("#065f46")
          .text("Answer: ", { continued: true })
          .font("Helvetica")
          .fillColor("#064e3b")
          .text(q.answer);
        pdf.fillColor("#000");
        pdf.moveDown(0.3);
      }
    }
  }

  pdf.moveDown(0.6);
  pdf.font("Helvetica-Bold").fontSize(11).text("End of Question Paper");

  if (opts.teacherMode) {
    pdf.addPage();
    pdf.font("Helvetica-Bold").fontSize(14).text("Answer Key");
    pdf.moveDown(0.5);
    let idx = 0;
    for (const sec of doc.sections) {
      for (const q of sec.questions) {
        idx++;
        pdf
          .font("Helvetica-Bold")
          .fontSize(11)
          .text(`${idx}.`, { continued: true })
          .font("Helvetica")
          .text(` ${q.answer}`, { paragraphGap: 6 });
      }
    }
  }

  pdf.end();
}

function drawStudentField(pdf: PDFKit.PDFDocument, label: string) {
  const startX = 56;
  const lineWidth = 240;
  pdf.font("Helvetica-Bold").text(`${label}: `, startX, pdf.y, { continued: true });
  pdf.font("Helvetica").text(" ".repeat(60));
  // Draw an underline beneath the blank space
  const y = pdf.y - 4;
  pdf.moveTo(startX + 90, y).lineTo(startX + 90 + lineWidth, y).stroke();
}
