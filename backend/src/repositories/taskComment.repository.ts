import { FilterQuery } from "mongoose";
import { TaskCommentDocument, TaskCommentModel } from "../models/TaskComment";

export class TaskCommentRepository {
  create(data: Partial<TaskCommentDocument>) {
    return TaskCommentModel.create(data);
  }

  findMany(filter: FilterQuery<TaskCommentDocument>) {
    return TaskCommentModel.find(filter).sort({ createdAt: 1 }).lean();
  }

  deleteByTaskId(taskId: string) {
    return TaskCommentModel.deleteMany({ taskId });
  }

  deleteByWorkflowId(workflowId: string) {
    return TaskCommentModel.deleteMany({ workflowId });
  }
}
