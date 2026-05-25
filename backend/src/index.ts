import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
import { env } from "./env";
import { connectMongo } from "./db";
import { initSocket } from "./socket";
import { startWorker } from "./worker";
import assignmentsRouter from "./routes/assignments";
import authRouter from "./routes/auth";

process.on("unhandledRejection", (err) => {
  console.error("[fatal] unhandledRejection:", err);
});
process.on("uncaughtException", (err) => {
  console.error("[fatal] uncaughtException:", err);
});

async function main() {
  console.log("[startup] PORT =", env.PORT);
  console.log("[startup] MONGO_URI host =", (() => {
    try {
      return new URL(env.MONGO_URI.replace("mongodb+srv://", "https://")).host;
    } catch {
      return "unparseable";
    }
  })());
  console.log("[startup] REDIS_URL set:", env.REDIS_URL ? "yes" : "no");
  console.log("[startup] OPENAI_API_KEY set:", env.OPENAI_API_KEY ? "yes" : "no");
  console.log("[startup] FRONTEND_ORIGIN =", env.FRONTEND_ORIGIN);

  console.log("[startup] connecting to Mongo…");
  await connectMongo();

  const app = express();
  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN,
      credentials: true,
    })
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRouter);
  app.use("/api/assignments", assignmentsRouter);

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[express] error", err);
    res.status(500).json({ error: err.message });
  });

  const httpServer = http.createServer(app);
  initSocket(httpServer);
  startWorker();

  httpServer.listen(env.PORT, () => {
    console.log(`[server] listening on http://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  console.error("[fatal] startup error:", err);
  if (err instanceof Error) {
    console.error("[fatal] stack:", err.stack);
  }
  process.exit(1);
});
