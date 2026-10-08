import { NotificationDocument } from "../models/Notification";
import { escapeHtml } from "./text";

interface TemplateInput {
  title: string;
  message: string;
  type: NotificationDocument["type"];
  actorName?: string;
}

export const buildEmailTemplate = ({ title, message, type, actorName }: TemplateInput) => {
  const intro = actorName ? `${actorName} triggered a workflow update.` : "There is a new workflow update.";
  const subject = `[${type}] ${title}`;
  const text = `${title}\n\n${message}\n\n${intro}`;
  // Titles, messages and names contain user input, so escape them before putting them in HTML.
  const html = `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
      <h2 style="margin-bottom: 8px;">${escapeHtml(title)}</h2>
      <p style="margin-top: 0;">${escapeHtml(message)}</p>
      <p style="color: #4b5563;">${escapeHtml(intro)}</p>
    </div>
  `;

  return { subject, text, html };
};

export const buildSmsTemplate = ({ title, message }: Pick<TemplateInput, "title" | "message">) => `${title}: ${message}`;
