import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { buildFallbackWorkflow } from "../utils/aiWorkflowFallback";

const AI_REQUEST_TIMEOUT_MS = 30_000;
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

const workflowSystemPrompt = `
You are an enterprise workflow automation engine.

Generate ONLY valid JSON.

Rules:
- No markdown
- No explanations
- No extra text
- Return strict JSON only
- Generate realistic enterprise workflows

The response format must be:

{
  "title": "string",
  "description": "string",
  "stages": [
    {
      "name": "string",
      "order": number,
      "tasks": [
        {
          "title": "short heading, 2 to 6 words",
          "description": "one or two sentence explanation of the task",
          "priority": "low | medium | high",
          "daysFromNow": number
        }
      ]
    }
  ],
  "automationRules": [
    {
      "trigger": "string",
      "action": "string"
    }
  ]
}
`;

// Model output is untrusted: normalise what we can (e.g. "HIGH" -> "high") and reject what we can't.
const generatedTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().catch(undefined),
  priority: z
    .preprocess((value) => (typeof value === "string" ? value.trim().toLowerCase() : value), z.enum(["low", "medium", "high"]))
    .catch("medium"),
  daysFromNow: z.coerce
    .number()
    .catch(3)
    .transform((days) => (Number.isFinite(days) ? Math.min(365, Math.max(0, Math.round(days))) : 3))
});

const generatedWorkflowSchema = z
  .object({
    title: z.string().trim().max(500).optional().catch(undefined),
    description: z.string().trim().max(5000).optional().catch(undefined),
    stages: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(100),
          order: z.coerce.number().catch(0),
          tasks: z.array(generatedTaskSchema).max(25).default([])
        })
      )
      .min(1)
      .max(15),
    automationRules: z
      .array(z.object({ trigger: z.string().trim().min(1).max(200), action: z.string().trim().min(1).max(200) }))
      .max(20)
      .catch([])
      .default([])
  })
  .transform((workflow) => ({
    ...workflow,
    stages: [...workflow.stages].sort((a, b) => a.order - b.order).map((stage, index) => ({ ...stage, order: index + 1 }))
  }));

export type GeneratedWorkflow = z.infer<typeof generatedWorkflowSchema>;

const parseModelJson = (content: string) => JSON.parse(content.trim().replace(/^```(?:json)?\s*|\s*```$/g, ""));

export class AiService {
  private readonly openAiKey = env.OPENAI_API_KEY?.trim().startsWith("sk-") ? env.OPENAI_API_KEY.trim() : undefined;
  // GEMINI_API_KEY is preferred; a Gemini key placed in OPENAI_API_KEY is still honoured for older .env files.
  private readonly geminiKey =
    env.GEMINI_API_KEY?.trim() || (env.OPENAI_API_KEY?.trim().startsWith("AIza") ? env.OPENAI_API_KEY.trim() : undefined);
  private readonly geminiModel =
    env.GEMINI_MODEL ?? (env.OPENAI_MODEL.startsWith("gpt-") ? DEFAULT_GEMINI_MODEL : env.OPENAI_MODEL);
  private readonly openAiClient = this.openAiKey
    ? new OpenAI({ apiKey: this.openAiKey, timeout: AI_REQUEST_TIMEOUT_MS, maxRetries: 1 })
    : undefined;
  private readonly geminiClient = this.geminiKey ? new GoogleGenerativeAI(this.geminiKey) : undefined;

  async generateWorkflow(prompt: string): Promise<GeneratedWorkflow> {
    const provider = this.openAiClient ? "openai" : this.geminiClient ? "gemini" : undefined;
    if (!provider) {
      logger.warn("No AI provider is configured (OPENAI_API_KEY / GEMINI_API_KEY). Using fallback workflow generator.");
      return this.fallback(prompt);
    }

    try {
      const raw = provider === "openai" ? await this.generateWithOpenAi(prompt) : await this.generateWithGemini(prompt);
      const parsed = generatedWorkflowSchema.safeParse(raw);
      if (!parsed.success) {
        logger.warn("AI workflow response did not match the expected shape. Using fallback workflow generator.", {
          provider,
          issues: parsed.error.issues.slice(0, 5)
        });
        return this.fallback(prompt);
      }
      return parsed.data;
    } catch (error) {
      logger.warn("AI workflow generation failed. Falling back to deterministic workflow template.", {
        provider,
        model: provider === "openai" ? env.OPENAI_MODEL : this.geminiModel,
        error: error instanceof Error ? error.message : error
      });
      return this.fallback(prompt);
    }
  }

  private fallback(prompt: string) {
    return generatedWorkflowSchema.parse(buildFallbackWorkflow(prompt));
  }

  private async generateWithOpenAi(prompt: string): Promise<unknown> {
    const response = await this.openAiClient!.chat.completions.create({
      model: env.OPENAI_MODEL,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: workflowSystemPrompt },
        { role: "user", content: prompt }
      ]
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI returned an empty response");
    }
    return parseModelJson(content);
  }

  private async generateWithGemini(prompt: string): Promise<unknown> {
    const model = this.geminiClient!.getGenerativeModel(
      {
        model: this.geminiModel,
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json"
        }
      },
      { timeout: AI_REQUEST_TIMEOUT_MS }
    );

    const result = await model.generateContent(`${workflowSystemPrompt}\n\nUser prompt: ${prompt}`);
    const content = result.response.text();
    if (!content) {
      throw new Error("Gemini returned an empty response");
    }
    return parseModelJson(content);
  }
}
