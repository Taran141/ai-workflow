import { Schema, Types, model } from "mongoose";

export interface TaskDocument {
  _id: string;
  title: string;
  description?: string;
  workflowId: Types.ObjectId | string;
  createdBy?: Types.ObjectId | string;
  stageName: string;
  assignedTo?: Types.ObjectId | string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  deadline?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<TaskDocument>(
  {
    title: { type: String, required: true, trim: true, index: true },
    description: { type: String },
    workflowId: { type: Schema.Types.ObjectId, ref: "Workflow", required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", index: true },
    stageName: { type: String, required: true, index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", index: true },
    status: { type: String, enum: ["todo", "in_progress", "done"], default: "todo", index: true },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium", index: true },
    deadline: { type: Date, index: true }
  },
  { timestamps: true }
);

taskSchema.index({ workflowId: 1, status: 1, priority: 1 });

export const TaskModel = model<TaskDocument>("Task", taskSchema);
