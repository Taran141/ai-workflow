import { Schema, Types, model } from "mongoose";

export interface TaskCommentDocument {
  _id: string;
  taskId: Types.ObjectId | string;
  workflowId: Types.ObjectId | string;
  authorId: Types.ObjectId | string;
  message: string;
  createdAt: Date;
  updatedAt: Date;
}

const taskCommentSchema = new Schema<TaskCommentDocument>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true, index: true },
    workflowId: { type: Schema.Types.ObjectId, ref: "Workflow", required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    message: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

taskCommentSchema.index({ taskId: 1, createdAt: 1 });

export const TaskCommentModel = model<TaskCommentDocument>("TaskComment", taskCommentSchema);
