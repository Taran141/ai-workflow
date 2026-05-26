import { ActivityRepository } from "../repositories/activity.repository";
import { TaskRepository } from "../repositories/task.repository";
import { UserRepository } from "../repositories/user.repository";
import { WorkflowRepository } from "../repositories/workflow.repository";
import { buildPagination } from "../utils/pagination";

export class ActivityService {
  constructor(
    private readonly activityRepository = new ActivityRepository(),
    private readonly userRepository = new UserRepository(),
    private readonly taskRepository = new TaskRepository(),
    private readonly workflowRepository = new WorkflowRepository()
  ) {}

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
    return { items: await this.enrichActivities(items), meta: { page, limit, total } };
  }

  async enrichItem(item: unknown) {
    const [enriched] = await this.enrichActivities([this.normalizeItem(item)]);
    return enriched;
  }

  private async enrichActivities(items: Array<Record<string, unknown>>) {
    const userIds = new Set<string>();
    const taskIds = new Set<string>();
    const workflowIds = new Set<string>();

    items.forEach((item) => {
      const actorId = this.getStringValue(item.actorId);
      if (actorId) userIds.add(actorId);

      const metadata = this.getMetadata(item.metadata);
      const assignedTo = this.getStringValue(metadata.assignedTo);
      const previousAssignedTo = this.getStringValue(metadata.previousAssignedTo);
      const taskCreatorId = this.getStringValue(metadata.taskCreatorId);
      const workflowId = this.getStringValue(metadata.workflowId);

      if (assignedTo) userIds.add(assignedTo);
      if (previousAssignedTo) userIds.add(previousAssignedTo);
      if (taskCreatorId) userIds.add(taskCreatorId);
      if (workflowId) workflowIds.add(workflowId);

      if (item.entityType === "task") {
        const taskId = this.getStringValue(item.entityId);
        if (taskId) taskIds.add(taskId);
      }

      if (item.entityType === "workflow") {
        const entityWorkflowId = this.getStringValue(item.entityId);
        if (entityWorkflowId) workflowIds.add(entityWorkflowId);
      }
    });

    const [users, tasks, workflows] = await Promise.all([
      userIds.size ? this.userRepository.findManyByIds([...userIds]) : Promise.resolve([]),
      taskIds.size ? this.taskRepository.findManyByIds([...taskIds]) : Promise.resolve([]),
      workflowIds.size ? this.workflowRepository.findManyByIds([...workflowIds]) : Promise.resolve([])
    ]);

    const userMap = new Map(users.map((user) => [user._id.toString(), user]));
    const taskMap = new Map(tasks.map((task) => [task._id.toString(), task]));
    const workflowMap = new Map(workflows.map((workflow) => [workflow._id.toString(), workflow]));

    return items.map((item) => {
      const metadata = { ...this.getMetadata(item.metadata) };
      const actorId = this.getStringValue(item.actorId);
      const entityId = this.getStringValue(item.entityId);
      const actor = actorId ? userMap.get(actorId) : undefined;
      const entityTask = item.entityType === "task" && entityId ? taskMap.get(entityId) : undefined;
      const workflowId = this.getStringValue(metadata.workflowId) ?? (item.entityType === "workflow" ? entityId : undefined);
      const entityWorkflow = workflowId ? workflowMap.get(workflowId) : undefined;
      const assignee = this.getStringValue(metadata.assignedTo)
        ? userMap.get(this.getStringValue(metadata.assignedTo)!)
        : undefined;
      const previousAssignee = this.getStringValue(metadata.previousAssignedTo)
        ? userMap.get(this.getStringValue(metadata.previousAssignedTo)!)
        : undefined;

      if (!metadata.actorName && actor) {
        metadata.actorName = actor.name;
      }
      if (!metadata.actorRole && actor) {
        metadata.actorRole = actor.role;
      }
      if (!metadata.taskTitle && entityTask) {
        metadata.taskTitle = entityTask.title;
      }
      if (!metadata.taskCreatorId && entityTask?.createdBy) {
        metadata.taskCreatorId = entityTask.createdBy.toString();
      }
      if (!metadata.workflowTitle && entityWorkflow) {
        metadata.workflowTitle = entityWorkflow.title;
      }
      if (!metadata.assignedToName && assignee) {
        metadata.assignedToName = assignee.name;
      }
      if (!metadata.assignedToRole && assignee) {
        metadata.assignedToRole = assignee.role;
      }
      if (!metadata.previousAssignedToName && previousAssignee) {
        metadata.previousAssignedToName = previousAssignee.name;
      }
      if (!metadata.previousAssignedToRole && previousAssignee) {
        metadata.previousAssignedToRole = previousAssignee.role;
      }

      return {
        ...item,
        metadata
      };
    });
  }

  private getMetadata(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? { ...(value as Record<string, unknown>) } : {};
  }

  private getStringValue(value: unknown) {
    return typeof value === "string" && value.trim() ? value : undefined;
  }

  private normalizeItem(value: unknown): Record<string, unknown> {
    if (value && typeof value === "object" && "toObject" in value && typeof value.toObject === "function") {
      return value.toObject();
    }

    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }
}
