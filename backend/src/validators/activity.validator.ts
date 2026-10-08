import { z } from "zod";

export const listActivitySchema = z.object({
  query: z.object({
    entityType: z.enum(["workflow", "task"]).optional(),
    entityId: z.string().max(64).optional(),
    page: z.string().optional(),
    limit: z.string().optional()
  })
});
