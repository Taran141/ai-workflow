import { EventModel } from "../models/Event";

export class EventRepository {
  create(data: Record<string, unknown>) {
    return EventModel.create(data);
  }

  update(id: string, data: Record<string, unknown>) {
    return EventModel.findByIdAndUpdate(id, data, { new: true });
  }

  findPending({ maxRetries, createdBefore, limit }: { maxRetries: number; createdBefore: Date; limit: number }) {
    return EventModel.find({ status: "pending", retries: { $lt: maxRetries }, createdAt: { $lt: createdBefore } })
      .sort({ createdAt: 1 })
      .limit(limit);
  }
}
