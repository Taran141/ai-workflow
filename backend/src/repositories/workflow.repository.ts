import { FilterQuery, UpdateQuery } from "mongoose";
import { WorkflowDocument, WorkflowModel } from "../models/Workflow";

export class WorkflowRepository {
  create(data: Partial<WorkflowDocument>) {
    return WorkflowModel.create(data);
  }

  findById(id: string) {
    return WorkflowModel.findById(id);
  }

  findManyByIds(ids: string[]) {
    return WorkflowModel.find({ _id: { $in: ids } });
  }

  async findIdsVisibleTo(userId: string) {
    const ids = await WorkflowModel.distinct("_id", { $or: [{ createdBy: userId }, { participants: userId }] });
    return ids.map((id) => id.toString());
  }

  findMany(filter: FilterQuery<WorkflowDocument>, skip: number, limit: number, sort: Record<string, 1 | -1>) {
    return WorkflowModel.find(filter).sort(sort).skip(skip).limit(limit);
  }

  count(filter: FilterQuery<WorkflowDocument>) {
    return WorkflowModel.countDocuments(filter);
  }

  update(id: string, data: UpdateQuery<WorkflowDocument>) {
    return WorkflowModel.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  addParticipant(id: string, userId: string) {
    return WorkflowModel.updateOne({ _id: id }, { $addToSet: { participants: userId } });
  }

  delete(id: string) {
    return WorkflowModel.findByIdAndDelete(id);
  }
}
