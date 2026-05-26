import { StatusCodes } from "http-status-codes";
import { DomainEvents } from "../constants/events";
import { AppError } from "../utils/AppError";
import { buildPagination } from "../utils/pagination";
import { TaskRepository } from "../repositories/task.repository";
import { WorkflowRepository } from "../repositories/workflow.repository";
import { AiService } from "./ai.service";
import { eventBus } from "./eventBus.service";

export class WorkflowService {
  constructor(
    private readonly workflowRepository = new WorkflowRepository(),
    private readonly taskRepository = new TaskRepository(),
    private readonly aiService = new AiService()
  ) {}

  async createManual(payload: {
    title: string;
    description?: string;
    createdBy: string;
    participants?: string[];
    stages?: Array<{ name: string; order: number }>;
  }) {
    const workflow = await this.workflowRepository.create({
      ...payload,
      stages: payload.stages ?? [{ name: "Backlog", order: 1 }],
      participants: payload.participants ?? [payload.createdBy]
    });
    eventBus.emit(DomainEvents.WORKFLOW_CREATED, {
      workflowId: workflow._id,
      actorId: payload.createdBy,
      title: workflow.title,
      participants: workflow.participants.map((participant) => participant.toString())
    });
    return workflow;
  }

  async generateFromPrompt(prompt: string, actorId: string) {
    type GeneratedTask = {
      title: string;
      description?: string;
      priority: "low" | "medium" | "high";
      daysFromNow: number;
    };
    type TaskCreateInput = {
      title: string;
      description?: string;
      workflowId: string;
      stageName: string;
      priority: "low" | "medium" | "high";
      deadline: Date;
    };

    const generated = await this.aiService.generateWorkflow(prompt);
    const workflow = await this.workflowRepository.create({
      title: generated.title,
      description: generated.description,
      prompt,
      createdBy: actorId,
      stages: generated.stages.map((stage: { name: string; order: number }) => ({
        name: stage.name,
        order: stage.order
      })),
      automationRules: generated.automationRules,
      participants: [actorId]
    });

    const tasksToCreate: TaskCreateInput[] = generated.stages.flatMap(
      (stage: { name: string; tasks: GeneratedTask[] }) =>
        stage.tasks.map((task: GeneratedTask) => ({
          title: this.toTaskHeading(task.title),
          description: this.toTaskDescription(task),
          workflowId: workflow._id.toString(),
          stageName: stage.name,
          priority: task.priority,
          deadline: new Date(Date.now() + task.daysFromNow * 24 * 60 * 60 * 1000)
        }))
    );

    await Promise.all(tasksToCreate.map((task: TaskCreateInput) => this.taskRepository.create(task)));
    eventBus.emit(DomainEvents.AI_WORKFLOW_GENERATED, {
      workflowId: workflow._id,
      actorId,
      prompt,
      title: workflow.title,
      participants: workflow.participants.map((participant) => participant.toString())
    });
    return workflow;
  }

  async list(query: {
    actorId: string;
    role: string;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    page?: number;
    limit?: number;
  }) {
    const { skip, page, limit } = buildPagination(query.page, query.limit);
    const filter: Record<string, unknown> = query.role === "admin" ? {} : { participants: query.actorId };
    if (query.status) filter.status = query.status;
    if (query.search) filter.title = { $regex: query.search, $options: "i" };
    const sort = { [query.sortBy ?? "createdAt"]: query.sortOrder === "asc" ? 1 : -1 } as Record<string, 1 | -1>;
    const [items, total] = await Promise.all([
      this.workflowRepository.findMany(filter, skip, limit, sort),
      this.workflowRepository.count(filter)
    ]);
    return { items, meta: { page, limit, total } };
  }

  async getById(id: string) {
    const workflow = await this.workflowRepository.findById(id);
    if (!workflow) {
      throw new AppError(StatusCodes.NOT_FOUND, "Workflow not found");
    }
    const tasks = await this.taskRepository.findByWorkflowId(id);
    return { workflow, tasks };
  }

  async update(id: string, data: Record<string, unknown>, actorId: string) {
    const existing = await this.workflowRepository.findById(id);
    if (!existing) {
      throw new AppError(StatusCodes.NOT_FOUND, "Workflow not found");
    }

    const workflow = await this.workflowRepository.update(id, data);
    if (!workflow) {
      throw new AppError(StatusCodes.NOT_FOUND, "Workflow not found");
    }

    if (typeof data.status === "string" && data.status !== existing.status) {
      eventBus.emit(DomainEvents.WORKFLOW_STATUS_UPDATED, {
        workflowId: workflow._id,
        actorId,
        title: workflow.title,
        status: workflow.status,
        previousStatus: existing.status,
        participants: workflow.participants.map((participant) => participant.toString())
      });
    }

    return workflow;
  }

  delete(id: string) {
    return this.workflowRepository.delete(id);
  }

  private toTaskHeading(value: string) {
    const cleaned = value.replace(/\s+/g, " ").trim();
    const withoutTrailingPunctuation = cleaned.replace(/[.?!,:;]+$/, "");
    const words = withoutTrailingPunctuation.split(" ").filter(Boolean);
    if (words.length <= 6) {
      return withoutTrailingPunctuation;
    }

    return `${words.slice(0, 6).join(" ")}`;
  }

  private toTaskDescription(task: { title: string; description?: string }) {
    const description = task.description?.trim();
    if (description) {
      return description;
    }

    const cleanedTitle = task.title.replace(/\s+/g, " ").trim();
    return cleanedTitle.endsWith(".") ? cleanedTitle : `${cleanedTitle}.`;
  }
}
