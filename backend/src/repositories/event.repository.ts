import { EventModel } from "../models/Event";

export class EventRepository {
  create(data: Record<string, unknown>) {
    return EventModel.create(data);
  }

  update(id: string, data: Record<string, unknown>) {
    return EventModel.findByIdAndUpdate(id, data, { new: true });
  }
}

