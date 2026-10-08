import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().email();

// Role is deliberately not accepted here: the server decides it (see AuthService.register).
export const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100),
    email: emailSchema,
    phone: z
      .string()
      .trim()
      .regex(/^[0-9+\-\s()]{10,20}$/, "Enter a valid phone number")
      .optional(),
    password: z
      .string()
      .min(8)
      .max(128)
      .regex(/[A-Z]/, "Must include uppercase letter")
      .regex(/[a-z]/, "Must include lowercase letter")
      .regex(/[0-9]/, "Must include a number")
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(8).max(128)
  })
});
