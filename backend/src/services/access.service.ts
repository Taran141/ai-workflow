import { FilterQuery } from "mongoose";
import { StatusCodes } from "http-status-codes";
import { WorkflowDocument } from "../models/Workflow";
import { TaskRepository } from "../repositories/task.repository";
import { WorkflowRepository } from "../repositories/workflow.repository";
import { AppError } from "../utils/AppError";

type Actor = Express.UserPayload;
type WorkflowAccessFields = Pick<WorkflowDocument, "createdBy" | "participants">;

/**
 * Central place for "who may see / change what".
 * - Admins can see and manage everything.
 * - A workflow's creator can manage it; its participants can see it and work on its tasks.
 * Resources the actor cannot see are reported as "not found" so their existence is not leaked.
 */
export class AccessService {
  constructor(
    private readonly workflowRepository = new WorkflowRepository(),
    private readonly taskRepository = new TaskRepository()
  ) {}

  isAdmin(actor: Actor) {
    return actor.role === "admin";
  }

  canManageWorkflow(actor: Actor, workflow: WorkflowAccessFields) {
    return this.isAdmin(actor) || workflow.createdBy?.toString() === actor.userId;
  }

  canViewWorkflow(actor: Actor, workflow: WorkflowAccessFields) {
    return (
      this.canManageWorkflow(actor, workflow) ||
      workflow.participants.some((participant) => participant.toString() === actor.userId)
    );
  }

  visibleWorkflowFilter(actor: Actor): FilterQuery<WorkflowDocument> {
    return this.isAdmin(actor) ? {} : { $or: [{ createdBy: actor.userId }, { participants: actor.userId }] };
  }

  /** Workflow ids the actor may see, or `null` when the actor is unrestricted. */
  async getVisibleWorkflowIds(actor: Actor): Promise<string[] | null> {
    return this.isAdmin(actor) ? null : this.workflowRepository.findIdsVisibleTo(actor.userId);
  }

  async getViewableWorkflow(actor: Actor, workflowId: string) {
    const workflow = await this.workflowRepository.findById(workflowId);
    if (!workflow || !this.canViewWorkflow(actor, workflow)) {
      throw new AppError(StatusCodes.NOT_FOUND, "Workflow not found");
    }
    return workflow;
  }

  async getManageableWorkflow(actor: Actor, workflowId: string) {
    const workflow = await this.getViewableWorkflow(actor, workflowId);
    if (!this.canManageWorkflow(actor, workflow)) {
      throw new AppError(StatusCodes.FORBIDDEN, "Only the workflow owner or an admin can do this");
    }
    return workflow;
  }

  async getViewableTask(actor: Actor, taskId: string) {
    const task = await this.taskRepository.findById(taskId);
    const workflow = task ? await this.workflowRepository.findById(task.workflowId.toString()) : null;
    if (!task || !workflow || !this.canViewWorkflow(actor, workflow)) {
      throw new AppError(StatusCodes.NOT_FOUND, "Task not found");
    }
    return { task, workflow };
  }
}
