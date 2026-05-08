import { NotificationModel } from "../models/Notification";

export class NotificationRepository {
  create(data: Record<string, unknown>) {
    return NotificationModel.create(data);
  }

  findByUserId(userId: string, skip: number, limit: number) {
    return NotificationModel.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit);
  }

  countByUserId(userId: string) {
    return NotificationModel.countDocuments({ userId });
  }

  markAsRead(id: string, userId: string) {
    return NotificationModel.findOneAndUpdate({ _id: id, userId }, { read: true }, { new: true });
  }
}

