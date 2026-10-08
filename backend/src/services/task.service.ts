import { StatusCodes } from "http-status-codes";
import { DomainEvents } from "../constants/events";
import { WorkflowDocument } from "../models/Workflow";
import { AppError } from "../utils/AppError";
import { buildPagination } from "../utils/pagination";
import { TaskCommentRepository } from "../repositories/taskComment.repository";
import { TaskRepository } from "../repositories/task.repository";
import { UserRepository } from "../repositories/user.repository";
import { WorkflowRepository } from "../repositories/workflow.repository";
import { CreateTaskInput, UpdateTaskInput } from "../validators/task.validator";
import { AccessService } from "./access.service";
import { eventBus } from "./eventBus.service";

type Actor = Express.UserPayload;

const toDeadline = (value: string | null | undefined) => (value === undefined ? undefined : value ? new Date(value) : null);

export class TaskService {
  constructor(
    private readonly taskRepository = new TaskRepository(),
    private readonly taskCommentRepository = new TaskCommentRepository(),
    private readonly workflowRepository = new WorkflowRepository(),
    private readonly userRepository = new UserRepository(),
    private readonly accessService = new AccessService()
  ) {}

  async list(query: { actor: Actor; workflowId?: string; status?: string; page?: number; limit?: number }) {
    const { skip, page, limit } = buildPagination(query.page, query.limit);
    const filter: Record<string, unknown> = {};
    if (query.workflowId) {
      await this.accessService.getViewableWorkflow(query.actor, query.workflowId);
      filter.workflowId = query.workflowId;
    } else {
      const visibleWorkflowIds = await this.accessService.getVisibleWorkflowIds(query.actor);
      if (visibleWorkflowIds) filter.workflowId = { $in: visibleWorkflowIds };
    }
    if (query.status) filter.status = query.status;
    const [items, total] = await Promise.all([
      this.taskRepository.findMany(filter, skip, limit),
      this.taskRepository.count(filter)
    ]);
    return { items, meta: { page, limit, total } };
  }

  async create(payload: CreateTaskInput, actor: Actor) {
    const workflow = await this.accessService.getViewableWorkflow(actor, payload.workflowId);
    this.assertStageExists(workflow, payload.stageName);
    if (payload.assignedTo) {
      await this.addAssigneeToWorkflow(payload.workflowId, payload.assignedTo);
    }

    const task = await this.taskRepository.create({
      title: payload.title,
      description: payload.description,
      workflowId: payload.workflowId,
      stageName: payload.stageName,
      priority: payload.priority,
      assignedTo: payload.assignedTo ?? undefined,
      deadline: toDeadline(payload.deadline) ?? undefined,
      createdBy: actor.userId
    });

    eventBus.emit(DomainEvents.TASK_CREATED, {
      taskId: task._id.toString(),
      workflowId: payload.workflowId,
      actorId: actor.userId,
      assignedTo: task.assignedTo?.toString(),
      title: task.title
    });

    return task;
  }

  async update(id: string, data: UpdateTaskInput, actor: Actor) {
    const { task: existingTask, workflow } = await this.accessService.getViewableTask(actor, id);
    if (data.stageName !== undefined) {
      this.assertStageExists(workflow, data.stageName);
    }
    if (data.assignedTo) {
      await this.addAssigneeToWorkflow(workflow._id.toString(), data.assignedTo);
    }

    const { deadline, ...rest } = data;
    const changes: Record<string, unknown> = { ...rest };
    if (deadline !== undefined) changes.deadline = toDeadline(deadline);

    const task = await this.taskRepository.update(id, changes);
    if (!task) {
      throw new AppError(StatusCodes.NOT_FOUND, "Task not found");
    }

    const basePayload = {
      taskId: task._id.toString(),
      workflowId: task.workflowId.toString(),
      actorId: actor.userId,
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

  async delete(id: string, actor: Actor) {
    const { task, workflow } = await this.accessService.getViewableTask(actor, id);
    const isTaskCreator = task.createdBy?.toString() === actor.userId;
    if (!isTaskCreator && !this.accessService.canManageWorkflow(actor, workflow)) {
      throw new AppError(StatusCodes.FORBIDDEN, "Only the task creator, the workflow owner, or an admin can delete this task");
    }

    await this.taskCommentRepository.deleteByTaskId(id);
    await this.taskRepository.delete(id);

    eventBus.emit(DomainEvents.TASK_DELETED, {
      taskId: id,
      workflowId: workflow._id.toString(),
      actorId: actor.userId,
      title: task.title
    });
    return task;
  }

  private assertStageExists(workflow: Pick<WorkflowDocument, "stages">, stageName: string) {
    if (workflow.stages.length && !workflow.stages.some((stage) => stage.name === stageName)) {
      throw new AppError(StatusCodes.BAD_REQUEST, `Unknown stage "${stageName}" for this workflow`);
    }
  }

  /** An assignee must be able to open the workflow, so assigning someone makes them a participant. */
  private async addAssigneeToWorkflow(workflowId: string, userId: string) {
    const assignee = await this.userRepository.findById(userId);
    if (!assignee) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Assignee does not exist");
    }
    await this.workflowRepository.addParticipant(workflowId, userId);
  }
}
