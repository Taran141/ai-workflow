import OpenAI from "openai";
import { env } from "../config/env";
import { buildFallbackWorkflow } from "../utils/aiWorkflowFallback";

export class AiService {
  private readonly client = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : undefined;

  async generateWorkflow(prompt: string) {
    if (!this.client) {
      return buildFallbackWorkflow(prompt);
    }

    const response = await this.client.chat.completions.create({
      model: env.OPENAI_MODEL,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `
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
        `
        },
        { role: "user", content: prompt }
      ]
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return buildFallbackWorkflow(prompt);
    }

    return JSON.parse(content);
  }
}

