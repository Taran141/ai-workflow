import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { env } from "../config/env";
import { SocketEvents } from "../constants/events";
import { TokenService } from "../services/token.service";
import { socketGateway } from "../services/socketGateway.service";

const tokenService = new TokenService();

export const createSocketServer = (server: HttpServer) => {
  const io = new Server(server, {
    cors: {
      origin: env.FRONTEND_URL,
      credentials: true
    }
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const user = tokenService.verify(token);
      socket.data.user = user;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as Express.UserPayload;
    socket.join(`user:${user.userId}`);

    socket.on(SocketEvents.WORKFLOW_JOIN, (workflowId: string) => socket.join(`workflow:${workflowId}`));
    socket.on(SocketEvents.WORKFLOW_LEAVE, (workflowId: string) => socket.leave(`workflow:${workflowId}`));
  });

  socketGateway.attach(io);
  return io;
};

