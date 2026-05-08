import { Schema, model } from "mongoose";

export interface EventDocument {
  _id: string;
  type: string;
  payload: Record<string, unknown>;
  status: "pending" | "processed" | "failed";
  retries: number;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<EventDocument>(
  {
    type: { type: String, required: true, index: true },
    payload: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: ["pending", "processed", "failed"], default: "pending", index: true },
    retries: { type: Number, default: 0 },
    errorMessage: { type: String }
  },
  { timestamps: true }
);

eventSchema.index({ status: 1, createdAt: -1 });

export const EventModel = model<EventDocument>("Event", eventSchema);

