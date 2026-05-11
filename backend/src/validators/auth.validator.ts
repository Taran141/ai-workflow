import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z
      .string()
      .trim()
      .regex(/^[0-9+\-\s()]{10,20}$/, "Enter a valid phone number")
      .optional(),
    password: z
      .string()
      .min(8)
      .regex(/[A-Z]/, "Must include uppercase letter")
      .regex(/[a-z]/, "Must include lowercase letter")
      .regex(/[0-9]/, "Must include a number"),
    role: z.enum(["admin", "user"]).default("user")
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8)
  })
});
