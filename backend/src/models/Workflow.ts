import { Schema, Types, model } from "mongoose";

export interface WorkflowDocument {
  _id: string;
  title: string;
  description?: string;
  prompt?: string;
  status: "draft" | "active" | "completed";
  createdBy: Types.ObjectId | string;
  stages: Array<{ name: string; order: number }>;
  automationRules: Array<{ trigger: string; action: string }>;
  participants: Array<Types.ObjectId | string>;
  createdAt: Date;
  updatedAt: Date;
}

const workflowSchema = new Schema<WorkflowDocument>(
  {
    title: { type: String, required: true, trim: true, index: true },
    description: { type: String },
    prompt: { type: String },
    status: { type: String, enum: ["draft", "active", "completed"], default: "active", index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    stages: [
      {
        name: { type: String, required: true },
        order: { type: Number, required: true }
      }
    ],
    automationRules: [
      {
        trigger: { type: String, required: true },
        action: { type: String, required: true }
      }
    ],
    participants: [{ type: Schema.Types.ObjectId, ref: "User", index: true }]
  },
  { timestamps: true }
);

workflowSchema.index({ createdBy: 1, status: 1, createdAt: -1 });

export const WorkflowModel = model<WorkflowDocument>("Workflow", workflowSchema);
