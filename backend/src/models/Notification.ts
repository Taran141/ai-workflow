import { Schema, Types, model } from "mongoose";

export const notificationChannels = ["IN_APP", "EMAIL", "SMS"] as const;
export const notificationStatuses = ["PENDING", "SENT", "FAILED", "READ", "SKIPPED"] as const;
export const notificationTypes = [
  "WORKFLOW_CREATED",
  "AI_WORKFLOW_GENERATED",
  "WORKFLOW_STATUS_UPDATED",
  "TASK_ASSIGNED",
  "TASK_COMPLETED",
  "SYSTEM"
] as const;

export interface NotificationDocument {
  _id: string;
  userId: Types.ObjectId | string;
  title: string;
  message: string;
  type: (typeof notificationTypes)[number];
  channel: (typeof notificationChannels)[number];
  isRead: boolean;
  status: (typeof notificationStatuses)[number];
  metadata?: Record<string, unknown>;
  providerMessageId?: string;
  failureReason?: string;
  attempts: number;
  lastAttemptAt?: Date;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<NotificationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: notificationTypes, default: "SYSTEM", index: true },
    channel: { type: String, enum: notificationChannels, required: true, index: true },
    isRead: { type: Boolean, default: false, index: true },
    status: { type: String, enum: notificationStatuses, default: "PENDING", index: true },
    metadata: { type: Schema.Types.Mixed },
    providerMessageId: { type: String },
    failureReason: { type: String },
    attempts: { type: Number, default: 0 },
    lastAttemptAt: { type: Date },
    readAt: { type: Date }
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, channel: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, status: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });

export const NotificationModel = model<NotificationDocument>("Notification", notificationSchema);
