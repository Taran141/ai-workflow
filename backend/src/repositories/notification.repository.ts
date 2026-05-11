import { FilterQuery, UpdateQuery } from "mongoose";
import { NotificationDocument, NotificationModel } from "../models/Notification";

export class NotificationRepository {
  create(data: Partial<NotificationDocument>) {
    return NotificationModel.create(data);
  }

  findByUserId(filter: FilterQuery<NotificationDocument>, skip: number, limit: number) {
    return NotificationModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
  }

  countByUserId(filter: FilterQuery<NotificationDocument>) {
    return NotificationModel.countDocuments(filter);
  }

  countUnread(userId: string) {
    return NotificationModel.countDocuments({ userId, channel: "IN_APP", isRead: false });
  }

  findById(id: string, userId: string) {
    return NotificationModel.findOne({ _id: id, userId });
  }

  markAsRead(id: string, userId: string) {
    return NotificationModel.findOneAndUpdate(
      { _id: id, userId, channel: "IN_APP" },
      { isRead: true, status: "READ", readAt: new Date() },
      { new: true }
    );
  }

  update(id: string, data: UpdateQuery<NotificationDocument>) {
    return NotificationModel.findByIdAndUpdate(id, data, { new: true });
  }

  delete(id: string, userId: string) {
    return NotificationModel.findOneAndDelete({ _id: id, userId });
  }
}
