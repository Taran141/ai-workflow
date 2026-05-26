import { FilterQuery } from "mongoose";
import { TaskDocument, TaskModel } from "../models/Task";

export class TaskRepository {
  create(data: Partial<TaskDocument>) {
    return TaskModel.create(data);
  }

  findById(id: string) {
    return TaskModel.findById(id);
  }

  findManyByIds(ids: string[]) {
    return TaskModel.find({ _id: { $in: ids } });
  }

  findByWorkflowId(workflowId: string) {
    return TaskModel.find({ workflowId }).sort({ createdAt: 1 });
  }

  findMany(filter: FilterQuery<TaskDocument>, skip: number, limit: number) {
    return TaskModel.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 });
  }

  count(filter: FilterQuery<TaskDocument>) {
    return TaskModel.countDocuments(filter);
  }

  update(id: string, data: Partial<TaskDocument>) {
    return TaskModel.findByIdAndUpdate(id, data, { new: true });
  }

  delete(id: string) {
    return TaskModel.findByIdAndDelete(id);
  }
}
