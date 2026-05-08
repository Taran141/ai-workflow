import { ActivityRepository } from "../repositories/activity.repository";
import { buildPagination } from "../utils/pagination";

export class ActivityService {
  constructor(private readonly activityRepository = new ActivityRepository()) {}

  create(payload: Record<string, unknown>) {
    return this.activityRepository.create(payload);
  }

  async list(query: { entityType?: string; entityId?: string; page?: number; limit?: number }) {
    const { skip, page, limit } = buildPagination(query.page, query.limit);
    const filter: Record<string, unknown> = {};
    if (query.entityType) filter.entityType = query.entityType;
    if (query.entityId) filter.entityId = query.entityId;
    const [items, total] = await Promise.all([
      this.activityRepository.findMany(filter, skip, limit),
      this.activityRepository.count(filter)
    ]);
    return { items, meta: { page, limit, total } };
  }
}

