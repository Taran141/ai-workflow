import { NotificationRepository } from "../repositories/notification.repository";
import { buildPagination } from "../utils/pagination";
import { socketGateway } from "./socketGateway.service";
import { SocketEvents } from "../constants/events";

export class NotificationService {
  constructor(private readonly notificationRepository = new NotificationRepository()) {}

  async create(payload: { userId: string; title: string; message: string; type: "workflow" | "task" | "system"; meta?: Record<string, unknown> }) {
    const notification = await this.notificationRepository.create(payload);
    socketGateway.emitToUser(payload.userId, SocketEvents.NOTIFICATION_CREATED, notification);
    return notification;
  }

  async list(userId: string, page?: number, limit?: number) {
    const { skip, page: safePage, limit: safeLimit } = buildPagination(page, limit);
    const [items, total] = await Promise.all([
      this.notificationRepository.findByUserId(userId, skip, safeLimit),
      this.notificationRepository.countByUserId(userId)
    ]);
    return { items, meta: { page: safePage, limit: safeLimit, total } };
  }

  markAsRead(notificationId: string, userId: string) {
    return this.notificationRepository.markAsRead(notificationId, userId);
  }
}

