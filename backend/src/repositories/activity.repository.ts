import { FilterQuery } from "mongoose";
import { ActivityLogDocument, ActivityLogModel } from "../models/ActivityLog";

export class ActivityRepository {
  create(data: Partial<ActivityLogDocument>) {
    return ActivityLogModel.create(data);
  }

  findMany(filter: FilterQuery<ActivityLogDocument>, skip: number, limit: number) {
    return ActivityLogModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
  }

  count(filter: FilterQuery<ActivityLogDocument>) {
    return ActivityLogModel.countDocuments(filter);
  }
}
