import { z } from "zod";
import { objectIdSchema } from "./common.validator";

export const workflowStatuses = ["draft", "active", "completed"] as const;
export const workflowSortFields = ["createdAt", "updatedAt", "title", "status"] as const;
export type WorkflowSortField = (typeof workflowSortFields)[number];

const stagesSchema = z
  .array(
    z.object({
      name: z.string().trim().min(1).max(100),
      order: z.number().int().min(0)
    })
  )
  .max(50);

const automationRulesSchema = z
  .array(
    z.object({
      trigger: z.string().trim().min(1).max(200),
      action: z.string().trim().min(1).max(200)
    })
  )
  .max(50);

const participantsSchema = z.array(objectIdSchema).max(200);

export const createWorkflowSchema = z.object({
  body: z.object({
    title: z.string().trim().min(3).max(200),
    description: z.string().max(2000).optional(),
    participants: participantsSchema.optional(),
    stages: stagesSchema.optional()
  })
});

export const updateWorkflowSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),
  body: z.object({
    title: z.string().trim().min(3).max(200).optional(),
    description: z.string().max(2000).optional(),
    status: z.enum(workflowStatuses).optional(),
    stages: stagesSchema.min(1).optional(),
    automationRules: automationRulesSchema.optional(),
    participants: participantsSchema.optional()
  })
});

export const generateWorkflowSchema = z.object({
  body: z.object({
    prompt: z.string().trim().min(5).max(4000)
  })
});

export const workflowListSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().max(100).optional(),
    status: z.enum(workflowStatuses).optional(),
    sortBy: z.enum(workflowSortFields).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional()
  })
});
