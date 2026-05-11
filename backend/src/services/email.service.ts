import nodemailer from "nodemailer";
import { env } from "../config/env";
import { logger } from "../config/logger";

interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export class EmailService {
  private transporter = env.EMAIL_USER && env.EMAIL_PASS
    ? nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: env.EMAIL_USER,
          pass: env.EMAIL_PASS
        }
      })
    : null;

  isEnabled() {
    return Boolean(this.transporter);
  }

  async send(payload: EmailPayload) {
    if (!this.transporter || !env.EMAIL_USER) {
      logger.warn("Email service is not configured. Skipping email notification.");
      return { skipped: true as const };
    }

    const result = await this.transporter.sendMail({
      from: env.EMAIL_USER,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html
    });

    return {
      skipped: false as const,
      messageId: result.messageId
    };
  }
}
