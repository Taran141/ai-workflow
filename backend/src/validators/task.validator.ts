import { z } from "zod";
import { idParamsSchema, objectIdSchema } from "./common.validator";

const taskStatuses = ["todo", "in_progress", "done"] as const;
const taskPriorities = ["low", "medium", "high"] as const;

// An empty string or null means "clear this field" (e.g. unassign a task).
const nullableObjectIdSchema = z.union([objectIdSchema, z.literal(""), z.null()]).transform((value) => value || null);
const dateStringSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date");
const nullableDateSchema = z.union([dateStringSchema, z.literal(""), z.null()]).transform((value) => value || null);

export const listTaskSchema = z.object({
  query: z.object({
    workflowId: objectIdSchema.optional(),
    status: z.enum(taskStatuses).optional(),
    page: z.string().optional(),
    limit: z.string().optional()
  })
});

export const createTaskSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(200),
    description: z.string().max(5000).optional(),
    workflowId: objectIdSchema,
    stageName: z.string().trim().min(1).max(100),
    assignedTo: nullableObjectIdSchema.optional(),
    priority: z.enum(taskPriorities).default("medium"),
    deadline: nullableDateSchema.optional()
  })
});

export const taskCommentParamsSchema = idParamsSchema;

export const createTaskCommentSchema = z.object({
  body: z.object({
    message: z.string().trim().min(1).max(2000)
  }),
  params: z.object({
    id: objectIdSchema
  })
});

export const updateTaskSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(200).optional(),
    description: z.string().max(5000).optional(),
    assignedTo: nullableObjectIdSchema.optional(),
    stageName: z.string().trim().min(1).max(100).optional(),
    status: z.enum(taskStatuses).optional(),
    priority: z.enum(taskPriorities).optional(),
    deadline: nullableDateSchema.optional()
  }),
  params: z.object({
    id: objectIdSchema
  })
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>["body"];
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>["body"];
