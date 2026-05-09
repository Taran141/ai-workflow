import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { buildFallbackWorkflow } from "../utils/aiWorkflowFallback";

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
          "title": "string",
          "priority": "LOW | MEDIUM | HIGH",
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

export class AiService {
  private readonly apiKey = env.OPENAI_API_KEY?.trim();
  private readonly openAiClient = this.apiKey?.startsWith("sk-") ? new OpenAI({ apiKey: this.apiKey }) : undefined;
  private readonly geminiClient = this.apiKey?.startsWith("AIza") ? new GoogleGenerativeAI(this.apiKey) : undefined;

  async generateWorkflow(prompt: string) {
    if (!this.apiKey) {
      logger.warn("OPENAI_API_KEY is not configured. Using fallback workflow generator.");
      return buildFallbackWorkflow(prompt);
    }

    try {
      if (this.openAiClient) {
        return await this.generateWithOpenAi(prompt);
      }

      if (this.geminiClient) {
        return await this.generateWithGemini(prompt);
      }

      logger.warn("OPENAI_API_KEY has an unrecognized format. Using fallback workflow generator.");
      return buildFallbackWorkflow(prompt);
    } catch (error) {
      logger.warn("AI workflow generation failed. Falling back to deterministic workflow template.", {
        provider: this.openAiClient ? "openai" : this.geminiClient ? "gemini" : "unknown",
        error: error instanceof Error ? error.message : error
      });
      return buildFallbackWorkflow(prompt);
    }
  }

  private async generateWithOpenAi(prompt: string) {
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
      return buildFallbackWorkflow(prompt);
    }

    return JSON.parse(content);
  }

  private async generateWithGemini(prompt: string) {
    const modelName = env.OPENAI_MODEL.startsWith("gpt-") ? "gemini-1.5-flash" : env.OPENAI_MODEL;
    const model = this.geminiClient!.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json"
      }
    });

    const result = await model.generateContent(`${workflowSystemPrompt}\n\nUser prompt: ${prompt}`);
    const content = result.response.text();
    if (!content) {
      return buildFallbackWorkflow(prompt);
    }

    return JSON.parse(content);
  }
}
