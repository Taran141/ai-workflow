import twilio from "twilio";
import { env } from "../config/env";
import { logger } from "../config/logger";

export class SmsService {
  private client = env.TWILIO_SID && env.TWILIO_AUTH_TOKEN
    ? twilio(env.TWILIO_SID, env.TWILIO_AUTH_TOKEN)
    : null;

  isEnabled() {
    return Boolean(this.client && env.TWILIO_PHONE);
  }

  async send(to: string, body: string) {
    if (!this.client || !env.TWILIO_PHONE) {
      logger.warn("SMS service is not configured. Skipping SMS notification.");
      return { skipped: true as const };
    }

    const result = await this.client.messages.create({
      from: env.TWILIO_PHONE,
      to,
      body
    });

    return {
      skipped: false as const,
      messageId: result.sid
    };
  }
}
