import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { NotificationService } from "../services/notification.service";

const notificationService = new NotificationService();

export class NotificationController {
  async list(req: Request, res: Response) {
    const notifications = await notificationService.list(
      req.user!.userId,
      {
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        channel: req.query.channel as "IN_APP" | "EMAIL" | "SMS" | undefined,
        type: req.query.type as
          | "WORKFLOW_CREATED"
          | "AI_WORKFLOW_GENERATED"
          | "WORKFLOW_STATUS_UPDATED"
          | "TASK_ASSIGNED"
          | "TASK_COMPLETED"
          | "SYSTEM"
          | undefined,
        status: req.query.status as "PENDING" | "SENT" | "FAILED" | "READ" | "SKIPPED" | undefined,
        isRead: typeof req.query.isRead === "string" ? req.query.isRead === "true" : undefined
      }
    );
    res.status(StatusCodes.OK).json(notifications);
  }

  async markAsRead(req: Request, res: Response) {
    const notification = await notificationService.markAsRead(req.params.id as string, req.user!.userId);
    res.status(StatusCodes.OK).json(notification);
  }

  async unreadCount(req: Request, res: Response) {
    const unreadCount = await notificationService.getUnreadCount(req.user!.userId);
    res.status(StatusCodes.OK).json(unreadCount);
  }

  async delete(req: Request, res: Response) {
    await notificationService.delete(req.params.id as string, req.user!.userId);
    res.status(StatusCodes.NO_CONTENT).send();
  }
}
