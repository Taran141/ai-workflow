import { Server } from "socket.io";
import { SocketEvents } from "../constants/events";

export class SocketGatewayService {
  private io?: Server;

  attach(io: Server) {
    this.io = io;
  }

  emitToWorkflow(workflowId: string, event: string, payload: unknown) {
    this.io?.to(`workflow:${workflowId}`).emit(event, payload);
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.io?.to(`user:${userId}`).emit(event, payload);
  }

  emitNotificationCreated(userId: string, payload: unknown) {
    this.emitToUser(userId, SocketEvents.NOTIFICATION_CREATED, payload);
  }

  emitNotificationRead(userId: string, payload: unknown) {
    this.emitToUser(userId, SocketEvents.NOTIFICATION_READ, payload);
  }

  emitUnreadCount(userId: string, unreadCount: number) {
    this.emitToUser(userId, SocketEvents.NOTIFICATION_UNREAD_COUNT, { unreadCount });
  }

  broadcastActivity(payload: unknown) {
    this.io?.emit(SocketEvents.ACTIVITY_ADDED, payload);
  }
}

export const socketGateway = new SocketGatewayService();
