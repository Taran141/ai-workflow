import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { socketGateway } from "../services/socketGateway.service";
import { TaskCommentService } from "../services/taskComment.service";
import { TaskService } from "../services/task.service";

const taskService = new TaskService();
const taskCommentService = new TaskCommentService();

export class TaskController {
  async list(req: Request, res: Response) {
    const tasks = await taskService.list({
      actor: req.user!,
      workflowId: req.query.workflowId as string | undefined,
      status: req.query.status as string | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined
    });
    res.status(StatusCodes.OK).json(tasks);
  }

  async create(req: Request, res: Response) {
    const task = await taskService.create(req.body, req.user!);
    res.status(StatusCodes.CREATED).json(task);
  }

  async update(req: Request, res: Response) {
    const task = await taskService.update(req.params.id as string, req.body, req.user!);
    res.status(StatusCodes.OK).json(task);
  }

  async listComments(req: Request, res: Response) {
    const comments = await taskCommentService.list(req.params.id as string, req.user!);
    res.status(StatusCodes.OK).json({ items: comments });
  }

  async createComment(req: Request, res: Response) {
    const result = await taskCommentService.create({
      taskId: req.params.id as string,
      actor: req.user!,
      message: req.body.message
    });
    socketGateway.emitTaskCommentAdded(result.workflowId, result.comment);
    res.status(StatusCodes.CREATED).json(result.comment);
  }

  async delete(req: Request, res: Response) {
    await taskService.delete(req.params.id as string, req.user!);
    res.status(StatusCodes.NO_CONTENT).send();
  }
}
