import { z } from "zod";
import { roles } from "../constants/roles";
import { objectIdSchema } from "./common.validator";

export const updateUserRoleSchema = z.object({
  params: z.object({
    id: objectIdSchema
  }),
  body: z.object({
    role: z.enum(roles)
  })
});
