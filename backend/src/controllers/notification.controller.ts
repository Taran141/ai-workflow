import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { NotificationService } from "../services/notification.service";

const notificationService = new NotificationService();

export class NotificationController {
  async list(req: Request, res: Response) {
    const notifications = await notificationService.list(
      req.user!.userId,
      req.query.page ? Number(req.query.page) : undefined,
      req.query.limit ? Number(req.query.limit) : undefined
    );
    res.status(StatusCodes.OK).json(notifications);
  }

  async markAsRead(req: Request, res: Response) {
    const notification = await notificationService.markAsRead(req.params.id as string, req.user!.userId);
    res.status(StatusCodes.OK).json(notification);
  }
}
