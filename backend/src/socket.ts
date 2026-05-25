import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import cookie from "cookie";
import { env } from "./env";
import { readToken } from "./auth";
import { Assignment } from "./models/Assignment";

let io: Server | null = null;

interface AuthedSocket extends Socket {
  data: { userId?: string };
}

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.FRONTEND_ORIGIN, methods: ["GET", "POST"], credentials: true },
  });

  io.use((socket: AuthedSocket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie || "";
      const parsed = cookie.parse(cookieHeader);
      const token = parsed[env.COOKIE_NAME];
      const payload = token ? readToken(token) : null;
      if (payload) socket.data.userId = payload.uid;
      // Allow connect either way; subscribe will enforce ownership.
      next();
    } catch {
      next();
    }
  });

  io.on("connection", (socket: AuthedSocket) => {
    socket.on("subscribe", async (assignmentId: string) => {
      if (typeof assignmentId !== "string" || !assignmentId) return;
      if (!socket.data.userId) return;
      const doc = await Assignment.findOne({
        _id: assignmentId,
        userId: socket.data.userId,
      }).select("_id");
      if (!doc) return;
      socket.join(`assignment:${assignmentId}`);
    });
  });

  console.log("[socket] initialized");
  return io;
}

export function emitAssignmentUpdate(
  assignmentId: string,
  payload: { status: string; progress: number; message?: string; error?: string }
) {
  if (!io) return;
  io.to(`assignment:${assignmentId}`).emit("assignment:update", {
    assignmentId,
    ...payload,
  });
}

export function emitAssignmentComplete(assignmentId: string) {
  if (!io) return;
  io.to(`assignment:${assignmentId}`).emit("assignment:complete", { assignmentId });
}

export function emitAssignmentPartial(assignmentId: string, paper: unknown) {
  if (!io) return;
  io.to(`assignment:${assignmentId}`).emit("assignment:partial", {
    assignmentId,
    paper,
  });
}
