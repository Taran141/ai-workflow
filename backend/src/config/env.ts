import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(12),
  JWT_EXPIRES_IN: z.string().default("1d"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  FRONTEND_URL: z.string().default("http://localhost:4200"),
  REDIS_URL: z.string().optional(),
  EMAIL_USER: z.string().email().optional(),
  EMAIL_PASS: z.string().optional(),
  TWILIO_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE: z.string().optional()
});

export const env = envSchema.parse(process.env);
