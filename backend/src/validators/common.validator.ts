import { z } from "zod";
import { objectIdPattern } from "../utils/mongo";

export const objectIdSchema = z.string().regex(objectIdPattern, "Invalid id");

export const idParamsSchema = z.object({
  params: z.object({
    id: objectIdSchema
  })
});

export const paginatedQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional()
  })
});
