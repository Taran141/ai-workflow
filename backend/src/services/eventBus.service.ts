import { EventRepository } from "../repositories/event.repository";
import { logger } from "../config/logger";

export interface EventContext {
  /** Stable id of the persisted event; handlers use it to make side effects idempotent across retries. */
  eventId: string;
}

type Handler = (payload: Record<string, unknown>, context: EventContext) => Promise<void>;

/**
 * In-process event bus with a persisted event log.
 * Each emitted event is stored once and its handler is retried (same event record) on failure.
 * Events left "pending" by a crash are picked up again by `recoverPending()` on startup.
 */
export class EventBusService {
  private readonly handlers = new Map<string, Handler>();
  private readonly repository = new EventRepository();
  private readonly maxRetries = 3;

  on(eventName: string, handler: Handler) {
    if (this.handlers.has(eventName)) {
      throw new Error(`A handler is already registered for ${eventName}`);
    }
    this.handlers.set(eventName, handler);
  }

  emit(eventName: string, payload: Record<string, unknown>) {
    void this.publish(eventName, payload).catch((error) => logger.error(`Failed to publish event ${eventName}`, error));
  }

  async recoverPending(createdBefore = new Date()) {
    const pending = await this.repository.findPending({ maxRetries: this.maxRetries, createdBefore, limit: 500 });
    if (pending.length) {
      logger.info(`Replaying ${pending.length} pending event(s)`);
    }
    for (const event of pending) {
      await this.process(event._id.toString(), event.type, event.payload, event.retries);
    }
  }

  private async publish(eventName: string, payload: Record<string, unknown>) {
    const record = await this.repository.create({ type: eventName, payload, status: "pending", retries: 0 });
    await this.process(record._id.toString(), eventName, payload, 0);
  }

  private async process(eventId: string, eventName: string, payload: Record<string, unknown>, previousAttempts: number) {
    const handler = this.handlers.get(eventName);
    if (!handler) {
      await this.repository.update(eventId, { status: "failed", errorMessage: `No handler registered for ${eventName}` });
      return;
    }

    try {
      await handler(payload, { eventId });
      await this.repository.update(eventId, { status: "processed" });
    } catch (error) {
      const attempts = previousAttempts + 1;
      const exhausted = attempts >= this.maxRetries;
      await this.repository.update(eventId, {
        status: exhausted ? "failed" : "pending",
        retries: attempts,
        errorMessage: error instanceof Error ? error.message : "Unknown event handler error"
      });
      logger.error(`Event handler failed for ${eventName} (attempt ${attempts}/${this.maxRetries})`, error);

      if (!exhausted) {
        setTimeout(() => {
          void this.process(eventId, eventName, payload, attempts).catch((retryError) =>
            logger.error(`Retry failed for event ${eventName}`, retryError)
          );
        }, attempts * 1000);
      }
    }
  }
}

export const eventBus = new EventBusService();
