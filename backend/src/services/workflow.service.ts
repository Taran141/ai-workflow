import { StatusCodes } from "http-status-codes";
import { DomainEvents } from "../constants/events";
import { WorkflowDocument } from "../models/Workflow";
import { AppError } from "../utils/AppError";
import { summarizeWorkflowDescription, summarizeWorkflowTitle } from "../utils/aiWorkflowFallback";
import { buildPagination } from "../utils/pagination";
import { escapeRegex, unique } from "../utils/text";
import { TaskCommentRepository } from "../repositories/taskComment.repository";
import { TaskRepository } from "../repositories/task.repository";
import { UserRepository } from "../repositories/user.repository";
import { WorkflowRepository } from "../repositories/workflow.repository";
import { WorkflowSortField, workflowSortFields } from "../validators/workflow.validator";
import { AccessService } from "./access.service";
import { AiService, GeneratedWorkflow } from "./ai.service";
import { eventBus } from "./eventBus.service";
import { NotificationService } from "./notification.service";

type Actor = Express.UserPayload;
type GeneratedTask = GeneratedWorkflow["stages"][number]["tasks"][number];

interface WorkflowChanges {
  title?: string;
  description?: string;
  status?: WorkflowDocument["status"];
  stages?: WorkflowDocument["stages"];
  automationRules?: WorkflowDocument["automationRules"];
  participants?: string[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

export class WorkflowService {
  constructor(
    private readonly workflowRepository = new WorkflowRepository(),
    private readonly taskRepository = new TaskRepository(),
    private readonly taskCommentRepository = new TaskCommentRepository(),
    private readonly userRepository = new UserRepository(),
    private readonly notificationService = new NotificationService(),
    private readonly accessService = new AccessService(),
    private readonly aiService = new AiService()
  ) {}

  async createManual(payload: {
    title: string;
    description?: string;
    createdBy: string;
    participants?: string[];
    stages?: Array<{ name: string; order: number }>;
  }) {
    const participants = await this.resolveParticipants(payload.participants ?? [], payload.createdBy);
    const workflow = await this.workflowRepository.create({
      title: payload.title,
      description: payload.description,
      createdBy: payload.createdBy,
      stages: payload.stages?.length ? payload.stages : [{ name: "Backlog", order: 1 }],
      participants
    });
    eventBus.emit(DomainEvents.WORKFLOW_CREATED, {
      workflowId: workflow._id.toString(),
      actorId: payload.createdBy,
      title: workflow.title,
      participants
    });
    return workflow;
  }

  async generateFromPrompt(prompt: string, actorId: string) {
    const generated = await this.aiService.generateWorkflow(prompt);
    const workflow = await this.workflowRepository.create({
      title: summarizeWorkflowTitle(prompt, generated.title),
      description: summarizeWorkflowDescription(prompt, generated.description),
      prompt,
      createdBy: actorId,
      stages: generated.stages.map(({ name, order }) => ({ name, order })),
      automationRules: generated.automationRules,
      participants: [actorId]
    });
    const workflowId = workflow._id.toString();

    const now = Date.now();
    const tasksToCreate = generated.stages.flatMap((stage) =>
      stage.tasks.map((task) => ({
        title: this.toTaskHeading(task.title),
        description: this.toTaskDescription(task),
        workflowId,
        createdBy: actorId,
        stageName: stage.name,
        priority: task.priority,
        deadline: new Date(now + task.daysFromNow * DAY_MS)
      }))
    );

    try {
      if (tasksToCreate.length) {
        await this.taskRepository.createMany(tasksToCreate);
      }
    } catch (error) {
      // MongoDB transactions need a replica set, so roll back by hand rather than leave a half-built workflow.
      await Promise.allSettled([this.taskRepository.deleteByWorkflowId(workflowId), this.workflowRepository.delete(workflowId)]);
      throw error;
    }

    eventBus.emit(DomainEvents.AI_WORKFLOW_GENERATED, {
      workflowId,
      actorId,
      prompt,
      title: workflow.title,
      participants: [actorId]
    });
    return workflow;
  }

  async list(query: {
    actor: Actor;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    page?: number;
    limit?: number;
  }) {
    const { skip, page, limit } = buildPagination(query.page, query.limit);
    const filter: Record<string, unknown> = { ...this.accessService.visibleWorkflowFilter(query.actor) };
    if (query.status) filter.status = query.status;
    if (query.search) filter.title = { $regex: escapeRegex(query.search), $options: "i" };
    const sortBy = workflowSortFields.includes(query.sortBy as WorkflowSortField) ? (query.sortBy as WorkflowSortField) : "createdAt";
    const sort = { [sortBy]: query.sortOrder === "asc" ? 1 : -1 } as Record<string, 1 | -1>;
    const [items, total] = await Promise.all([
      this.workflowRepository.findMany(filter, skip, limit, sort),
      this.workflowRepository.count(filter)
    ]);
    return { items, meta: { page, limit, total } };
  }

  async getById(id: string, actor: Actor) {
    const workflow = await this.accessService.getViewableWorkflow(actor, id);
    const tasks = await this.taskRepository.findByWorkflowId(id);
    return { workflow, tasks };
  }

  async update(id: string, data: WorkflowChanges, actor: Actor) {
    const existing = await this.accessService.getManageableWorkflow(actor, id);
    const changes: WorkflowChanges = { ...data };
    if (data.participants) {
      changes.participants = await this.resolveParticipants(data.participants, existing.createdBy.toString());
    }

    const workflow = await this.workflowRepository.update(id, changes);
    if (!workflow) {
      throw new AppError(StatusCodes.NOT_FOUND, "Workflow not found");
    }

    if (data.status && data.status !== existing.status) {
      eventBus.emit(DomainEvents.WORKFLOW_STATUS_UPDATED, {
        workflowId: id,
        actorId: actor.userId,
        title: workflow.title,
        status: workflow.status,
        previousStatus: existing.status,
        participants: workflow.participants.map((participant) => participant.toString())
      });
    }

    return workflow;
  }

  async delete(id: string, actor: Actor) {
    const workflow = await this.accessService.getManageableWorkflow(actor, id);

    // Remove dependents first: if anything fails the workflow still exists and the delete can simply be retried.
    await Promise.all([
      this.taskRepository.deleteByWorkflowId(id),
      this.taskCommentRepository.deleteByWorkflowId(id),
      this.notificationService.deleteForWorkflow(id)
    ]);
    await this.workflowRepository.delete(id);

    eventBus.emit(DomainEvents.WORKFLOW_DELETED, {
      workflowId: id,
      actorId: actor.userId,
      title: workflow.title,
      audience: unique([workflow.createdBy?.toString(), ...workflow.participants.map((participant) => participant.toString())])
    });
    return workflow;
  }

  /** Validates participant ids and makes sure the owner is always one of them. */
  private async resolveParticipants(participantIds: string[], ownerId: string) {
    const ids = unique([ownerId, ...participantIds]);
    const users = await this.userRepository.findManyByIds(ids);
    if (users.length !== ids.length) {
      throw new AppError(StatusCodes.BAD_REQUEST, "One or more participants do not exist");
    }
    return ids;
  }

  private toTaskHeading(value: string) {
    const cleaned = value.replace(/\s+/g, " ").trim();
    const withoutTrailingPunctuation = cleaned.replace(/[.?!,:;]+$/, "");
    const words = withoutTrailingPunctuation.split(" ").filter(Boolean);
    if (!words.length) {
      return "Untitled task";
    }
    return words.slice(0, 6).join(" ");
  }

  private toTaskDescription(task: Pick<GeneratedTask, "title" | "description">) {
    const description = task.description?.trim();
    if (description) {
      return description;
    }

    const cleanedTitle = task.title.replace(/\s+/g, " ").trim();
    return cleanedTitle.endsWith(".") ? cleanedTitle : `${cleanedTitle}.`;
  }
}
