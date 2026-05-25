import { Worker } from "bullmq";
import { redisConnection } from "./redis";
import { ASSIGNMENT_QUEUE } from "./queue";
import { connectMongo } from "./db";
import { Assignment } from "./models/Assignment";
import { generateQuestionPaper } from "./ai";
import { CreateAssignmentInput } from "./schemas";
import {
  emitAssignmentComplete,
  emitAssignmentPartial,
  emitAssignmentUpdate,
} from "./socket";

type JobData = { assignmentId: string; input: CreateAssignmentInput };

export function startWorker() {
  const worker = new Worker<JobData>(
    ASSIGNMENT_QUEUE,
    async (job) => {
      const { assignmentId, input } = job.data;

      const update = async (
        status: "processing" | "completed" | "failed",
        progress: number,
        extra: Partial<{ message: string; error: string }> = {}
      ) => {
        // Don't let a stale job downgrade a completed assignment.
        const filter =
          status === "completed"
            ? { _id: assignmentId }
            : { _id: assignmentId, status: { $ne: "completed" } };
        await Assignment.updateOne(filter, {
          status,
          progress,
          ...(extra.error ? { error: extra.error } : {}),
        });
        emitAssignmentUpdate(assignmentId, { status, progress, ...extra });
      };

      try {
        await update("processing", 5, { message: "Starting generation" });

        const paper = await generateQuestionPaper(input, (ev) => {
          if (ev.type === "progress") {
            // Fire-and-forget DB update; socket emit is synchronous.
            void update("processing", ev.pct, { message: ev.message });
          } else if (ev.type === "partial") {
            emitAssignmentPartial(assignmentId, ev.paper);
          }
        });

        // Decide how to land the regenerated paper:
        // - If the assignment already has variants, replace only the ACTIVE one
        //   (so Sets B/C stay untouched when the user hits Regenerate).
        // - Otherwise (first generation), seed Set A.
        const existing = await Assignment.findById(assignmentId).select(
          "variants activeVariantIndex"
        );
        const hasVariants = (existing?.variants?.length || 0) > 0;
        const activeIdx = existing?.activeVariantIndex ?? 0;

        if (hasVariants) {
          const safeIdx = Math.max(
            0,
            Math.min(activeIdx, (existing?.variants?.length || 1) - 1)
          );
          const label = existing?.variants?.[safeIdx]?.label || `Set ${String.fromCharCode(65 + safeIdx)}`;
          await Assignment.updateOne(
            { _id: assignmentId },
            {
              status: "completed",
              progress: 100,
              sections: paper.sections,
              [`variants.${safeIdx}`]: { label, sections: paper.sections },
              greeting: paper.greeting,
              timeAllowedMinutes: paper.timeAllowedMinutes || 0,
            }
          );
        } else {
          await Assignment.updateOne(
            { _id: assignmentId },
            {
              status: "completed",
              progress: 100,
              sections: paper.sections,
              variants: [{ label: "Set A", sections: paper.sections }],
              activeVariantIndex: 0,
              greeting: paper.greeting,
              timeAllowedMinutes: paper.timeAllowedMinutes || 0,
            }
          );
        }
        emitAssignmentUpdate(assignmentId, {
          status: "completed",
          progress: 100,
          message: "Done",
        });
        emitAssignmentComplete(assignmentId);
        return { ok: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[worker] generation failed", msg);
        await update("failed", 100, { error: msg });
        throw err;
      }
    },
    { connection: redisConnection, concurrency: 2 }
  );

  worker.on("failed", (job, err) => {
    console.error("[worker] job failed", job?.id, err.message);
  });
  worker.on("completed", (job) => {
    console.log("[worker] job completed", job.id);
  });

  return worker;
}

// Allow running worker standalone (`npm run dev:worker`)
if (require.main === module) {
  (async () => {
    await connectMongo();
    startWorker();
    console.log("[worker] standalone worker started");
  })();
}
