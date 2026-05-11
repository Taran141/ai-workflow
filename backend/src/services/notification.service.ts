import { StatusCodes } from "http-status-codes";
import { NotificationDocument } from "../models/Notification";
import { NotificationRepository } from "../repositories/notification.repository";
import { AppError } from "../utils/AppError";
import { buildPagination } from "../utils/pagination";
import { socketGateway } from "./socketGateway.service";
import { unreadCountCache } from "./unreadCountCache.service";

type NotificationChannel = NotificationDocument["channel"];
type NotificationType = NotificationDocument["type"];

interface ListNotificationsQuery {
  page?: number;
  limit?: number;
  channel?: NotificationChannel;
  type?: NotificationType;
  status?: NotificationDocument["status"];
  isRead?: boolean;
}

interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  channel: NotificationChannel;
  status?: NotificationDocument["status"];
  isRead?: boolean;
  metadata?: Record<string, unknown>;
}

export class NotificationService {
  constructor(private readonly notificationRepository = new NotificationRepository()) {}

  async create(payload: CreateNotificationInput) {
    const notification = await this.notificationRepository.create({
      ...payload,
      status: payload.status ?? (payload.channel === "IN_APP" ? "SENT" : "PENDING"),
      isRead: payload.isRead ?? false
    });

    if (notification.channel === "IN_APP" && !notification.isRead) {
      const unreadCount = await this.incrementUnreadCount(payload.userId);
      socketGateway.emitNotificationCreated(payload.userId, { notification, unreadCount });
      socketGateway.emitUnreadCount(payload.userId, unreadCount);
    }

    return notification;
  }

  async list(userId: string, query: ListNotificationsQuery) {
    const { skip, page: safePage, limit: safeLimit } = buildPagination(query.page, query.limit);
    const filter: Record<string, unknown> = { userId };
    if (query.channel) filter.channel = query.channel;
    if (query.type) filter.type = query.type;
    if (query.status) filter.status = query.status;
    if (typeof query.isRead === "boolean") filter.isRead = query.isRead;

    const [items, total] = await Promise.all([
      this.notificationRepository.findByUserId(filter, skip, safeLimit),
      this.notificationRepository.countByUserId(filter)
    ]);

    return { items, meta: { page: safePage, limit: safeLimit, total } };
  }

  async getUnreadCount(userId: string) {
    const cached = unreadCountCache.get(userId);
    if (typeof cached === "number") {
      return { unreadCount: cached };
    }

    const unreadCount = await this.notificationRepository.countUnread(userId);
    unreadCountCache.set(userId, unreadCount);
    return { unreadCount };
  }

  async markAsRead(notificationId: string, userId: string) {
    const current = await this.notificationRepository.findById(notificationId, userId);
    if (!current) {
      throw new AppError(StatusCodes.NOT_FOUND, "Notification not found");
    }

    const notification = current.isRead ? current : await this.notificationRepository.markAsRead(notificationId, userId);
    if (!notification) {
      throw new AppError(StatusCodes.NOT_FOUND, "Notification not found");
    }

    const unreadCount = current.isRead
      ? (await this.getUnreadCount(userId)).unreadCount
      : await this.decrementUnreadCount(userId);

    socketGateway.emitNotificationRead(userId, { notification, unreadCount });
    socketGateway.emitUnreadCount(userId, unreadCount);
    return notification;
  }

  async delete(notificationId: string, userId: string) {
    const existing = await this.notificationRepository.findById(notificationId, userId);
    if (!existing) {
      throw new AppError(StatusCodes.NOT_FOUND, "Notification not found");
    }

    const deleted = await this.notificationRepository.delete(notificationId, userId);
    if (!deleted) {
      throw new AppError(StatusCodes.NOT_FOUND, "Notification not found");
    }

    if (existing.channel === "IN_APP" && !existing.isRead) {
      const unreadCount = await this.decrementUnreadCount(userId);
      socketGateway.emitUnreadCount(userId, unreadCount);
    }

    return deleted;
  }

  async markAsSent(notificationId: string, providerMessageId?: string) {
    return this.notificationRepository.update(notificationId, {
      status: "SENT",
      providerMessageId,
      lastAttemptAt: new Date(),
      $inc: { attempts: 1 }
    });
  }

  async markAsFailed(notificationId: string, failureReason: string) {
    return this.notificationRepository.update(notificationId, {
      status: "FAILED",
      failureReason,
      lastAttemptAt: new Date(),
      $inc: { attempts: 1 }
    });
  }

  async markAsSkipped(notificationId: string, failureReason: string) {
    return this.notificationRepository.update(notificationId, {
      status: "SKIPPED",
      failureReason,
      lastAttemptAt: new Date()
    });
  }

  private async incrementUnreadCount(userId: string) {
    const cached = unreadCountCache.get(userId);
    if (typeof cached === "number") {
      return unreadCountCache.increment(userId);
    }

    const unreadCount = await this.notificationRepository.countUnread(userId);
    unreadCountCache.set(userId, unreadCount);
    return unreadCount;
  }

  private async decrementUnreadCount(userId: string) {
    const cached = unreadCountCache.get(userId);
    if (typeof cached === "number") {
      return unreadCountCache.decrement(userId);
    }

    const unreadCount = await this.notificationRepository.countUnread(userId);
    unreadCountCache.set(userId, unreadCount);
    return unreadCount;
  }
}
