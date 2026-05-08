import { Schema, Types, model } from "mongoose";

export interface NotificationDocument {
  _id: string;
  userId: Types.ObjectId | string;
  title: string;
  message: string;
  type: "workflow" | "task" | "system";
  read: boolean;
  meta?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<NotificationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ["workflow", "task", "system"], default: "system", index: true },
    read: { type: Boolean, default: false, index: true },
    meta: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export const NotificationModel = model<NotificationDocument>("Notification", notificationSchema);
