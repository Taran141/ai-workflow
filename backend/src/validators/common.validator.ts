import { z } from "zod";

export const paginatedQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional()
  })
});

