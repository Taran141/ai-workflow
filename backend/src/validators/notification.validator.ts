import { z } from "zod";

export const listNotificationSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    channel: z.enum(["IN_APP", "EMAIL", "SMS"]).optional(),
    type: z
      .enum(["WORKFLOW_CREATED", "AI_WORKFLOW_GENERATED", "WORKFLOW_STATUS_UPDATED", "TASK_ASSIGNED", "TASK_COMPLETED", "SYSTEM"])
      .optional(),
    status: z.enum(["PENDING", "SENT", "FAILED", "READ", "SKIPPED"]).optional(),
    isRead: z.enum(["true", "false"]).optional()
  })
});

export const notificationParamsSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  })
});
