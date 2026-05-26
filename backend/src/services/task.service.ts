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
    const eventPayload = {
      taskId: task._id,
      workflowId: task.workflowId.toString(),
      actorId: task.createdBy?.toString() ?? (payload.createdBy as string | undefined),
      assignedTo: task.assignedTo?.toString(),
      title: task.title
    };

    eventBus.emit(DomainEvents.TASK_CREATED, eventPayload);

    return task;
  }

  async update(id: string, data: Record<string, unknown>, actorId: string) {
    const existingTask = await this.taskRepository.findById(id);
    if (!existingTask) {
      throw new AppError(StatusCodes.NOT_FOUND, "Task not found");
    }

    const task = await this.taskRepository.update(id, data);
    if (!task) {
      throw new AppError(StatusCodes.NOT_FOUND, "Task not found");
    }

    const basePayload = {
      taskId: task._id,
      workflowId: task.workflowId.toString(),
      actorId,
      assignedTo: task.assignedTo?.toString(),
      previousAssignedTo: existingTask.assignedTo?.toString(),
      title: task.title
    };

    if (task.assignedTo?.toString() && task.assignedTo?.toString() !== existingTask.assignedTo?.toString()) {
      eventBus.emit(DomainEvents.TASK_ASSIGNED, basePayload);
    }

    if (task.status === "done" && existingTask.status !== "done") {
      eventBus.emit(DomainEvents.TASK_COMPLETED, basePayload);
    } else {
      eventBus.emit(DomainEvents.TASK_UPDATED, basePayload);
    }

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
