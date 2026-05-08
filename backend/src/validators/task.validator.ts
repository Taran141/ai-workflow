import { z } from "zod";

export const listTaskSchema = z.object({
  query: z.object({
    workflowId: z.string().optional(),
    status: z.enum(["todo", "in_progress", "done"]).optional(),
    page: z.string().optional(),
    limit: z.string().optional()
  })
});

export const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(2),
    description: z.string().optional(),
    workflowId: z.string(),
    stageName: z.string(),
    assignedTo: z.string().optional(),
    priority: z.enum(["low", "medium", "high"]).default("medium"),
    deadline: z.string().optional()
  })
});

export const updateTaskSchema = z.object({
  body: z.object({
    title: z.string().min(2).optional(),
    description: z.string().optional(),
    assignedTo: z.string().optional(),
    stageName: z.string().optional(),
    status: z.enum(["todo", "in_progress", "done"]).optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    deadline: z.string().optional()
  }),
  params: z.object({
    id: z.string()
  })
});
