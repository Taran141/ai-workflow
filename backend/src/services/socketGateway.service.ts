import { Server } from "socket.io";
import { SocketEvents } from "../constants/events";

export const ADMIN_ROOM = "role:admin";
export const userRoom = (userId: string) => `user:${userId}`;
export const workflowRoom = (workflowId: string) => `workflow:${workflowId}`;

export class SocketGatewayService {
  private io?: Server;

  attach(io: Server) {
    this.io = io;
  }

  emitToWorkflow(workflowId: string, event: string, payload: unknown) {
    this.io?.to(workflowRoom(workflowId)).emit(event, payload);
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.io?.to(userRoom(userId)).emit(event, payload);
  }

  emitToUsers(userIds: string[], event: string, payload: unknown) {
    if (userIds.length) {
      this.io?.to(userIds.map(userRoom)).emit(event, payload);
    }
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

  emitTaskCommentAdded(workflowId: string, payload: unknown) {
    this.emitToWorkflow(workflowId, SocketEvents.TASK_COMMENT_ADDED, payload);
  }

  /** Sends an activity entry to the people who can see its workflow, plus admins (never to everyone). */
  emitActivity(payload: unknown, audienceUserIds: string[]) {
    this.io?.to([...audienceUserIds.map(userRoom), ADMIN_ROOM]).emit(SocketEvents.ACTIVITY_ADDED, payload);
  }
}

export const socketGateway = new SocketGatewayService();
