import { EventEmitter } from "events";
import { EventRepository } from "../repositories/event.repository";
import { logger } from "../config/logger";

type Handler = (payload: Record<string, unknown>) => Promise<void>;

export class EventBusService {
  private readonly emitter = new EventEmitter();
  private readonly repository = new EventRepository();
  private readonly maxRetries = 3;

  on(eventName: string, handler: Handler) {
    this.emitter.on(eventName, async (payload: Record<string, unknown>) => {
      const record = await this.repository.create({ type: eventName, payload, status: "pending", retries: 0 });

      try {
        await handler(payload);
        await this.repository.update(record._id, { status: "processed" });
      } catch (error) {
        const retries = Number(record.retries) + 1;
        await this.repository.update(record._id, {
          status: retries >= this.maxRetries ? "failed" : "pending",
          retries,
          errorMessage: error instanceof Error ? error.message : "Unknown event handler error"
        });
        logger.error(`Event handler failed for ${eventName}`, error);

        if (retries < this.maxRetries) {
          setTimeout(() => this.emit(eventName, payload), retries * 1000);
        }
      }
    });
  }

  emit(eventName: string, payload: Record<string, unknown>) {
    this.emitter.emit(eventName, payload);
  }
}

export const eventBus = new EventBusService();

