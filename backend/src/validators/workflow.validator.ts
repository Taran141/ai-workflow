import { z } from "zod";

export const createWorkflowSchema = z.object({
  body: z.object({
    title: z.string().min(3),
    description: z.string().optional(),
    participants: z.array(z.string()).optional(),
    stages: z.array(z.object({ name: z.string(), order: z.number() })).optional()
  })
});

export const generateWorkflowSchema = z.object({
  body: z.object({
    prompt: z.string().min(5)
  })
});

export const workflowListSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    status: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).optional()
  })
});

