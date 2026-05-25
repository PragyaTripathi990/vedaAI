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

async function main() {
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
  console.error("Fatal startup error", err);
  process.exit(1);
});
