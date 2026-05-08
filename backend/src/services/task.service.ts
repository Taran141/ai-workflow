import { StatusCodes } from "http-status-codes";
import { DomainEvents } from "../constants/events";
import { AppError } from "../utils/AppError";
import { buildPagination } from "../utils/pagination";
import { TaskRepository } from "../repositories/task.repository";
import { eventBus } from "./eventBus.service";

export class TaskService {
  constructor(private readonly taskRepository = new TaskRepository()) {}

  async list(query: { workflowId?: string; status?: string; page?: number; limit?: number }) {
    const { skip, page, limit } = buildPagination(query.page, query.limit);
    const filter: Record<string, unknown> = {};
    if (query.workflowId) filter.workflowId = query.workflowId;
    if (query.status) filter.status = query.status;
    const [items, total] = await Promise.all([
      this.taskRepository.findMany(filter, skip, limit),
      this.taskRepository.count(filter)
    ]);
    return { items, meta: { page, limit, total } };
  }

  async create(payload: Record<string, unknown>) {
    const task = await this.taskRepository.create(payload);
    eventBus.emit(DomainEvents.TASK_UPDATED, {
      taskId: task._id,
      workflowId: task.workflowId.toString(),
      actorId: payload.assignedTo as string | undefined
    });
    return task;
  }

  async update(id: string, data: Record<string, unknown>, actorId: string) {
    const task = await this.taskRepository.update(id, data);
    if (!task) {
      throw new AppError(StatusCodes.NOT_FOUND, "Task not found");
    }

    const eventName = task.status === "done" ? DomainEvents.TASK_COMPLETED : DomainEvents.TASK_UPDATED;
    eventBus.emit(eventName, { taskId: task._id, workflowId: task.workflowId.toString(), actorId });
    return task;
  }

  async delete(id: string) {
    const task = await this.taskRepository.delete(id);
    if (!task) {
      throw new AppError(StatusCodes.NOT_FOUND, "Task not found");
    }
    return task;
  }
}
