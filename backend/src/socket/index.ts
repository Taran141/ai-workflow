import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { env } from "../config/env";
import { SocketEvents } from "../constants/events";
import { AccessService } from "../services/access.service";
import { AuthService } from "../services/auth.service";
import { NotificationService } from "../services/notification.service";
import { ADMIN_ROOM, socketGateway, userRoom, workflowRoom } from "../services/socketGateway.service";
import { isObjectId } from "../utils/mongo";

const authService = new AuthService();
const accessService = new AccessService();
const notificationService = new NotificationService();

export const createSocketServer = (server: HttpServer) => {
  const io = new Server(server, {
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const user = typeof token === "string" ? await authService.resolveSession(token) : null;
      if (!user) {
        return next(new Error("Unauthorized"));
      }
      socket.data.user = user;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const user = socket.data.user as Express.UserPayload;
    socket.join(userRoom(user.userId));
    if (user.role === "admin") {
      socket.join(ADMIN_ROOM);
    }

    // Register listeners before any await so early client messages are not dropped.
    socket.on(SocketEvents.WORKFLOW_JOIN, async (workflowId: unknown) => {
      if (!isObjectId(workflowId)) {
        return;
      }
      try {
        await accessService.getViewableWorkflow(user, workflowId);
        socket.join(workflowRoom(workflowId));
      } catch {
        // Not allowed to see this workflow: silently refuse to join its room.
      }
    });
    socket.on(SocketEvents.WORKFLOW_LEAVE, (workflowId: unknown) => {
      if (isObjectId(workflowId)) {
        socket.leave(workflowRoom(workflowId));
      }
    });

    try {
      const { unreadCount } = await notificationService.getUnreadCount(user.userId);
      socket.emit(SocketEvents.NOTIFICATION_UNREAD_COUNT, { unreadCount });
    } catch {
      socket.emit(SocketEvents.NOTIFICATION_UNREAD_COUNT, { unreadCount: 0 });
    }
  });

  socketGateway.attach(io);
  return io;
};
