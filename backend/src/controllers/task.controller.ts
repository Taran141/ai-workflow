import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { TaskService } from "../services/task.service";

const taskService = new TaskService();

export class TaskController {
  async list(req: Request, res: Response) {
    const tasks = await taskService.list({
      workflowId: req.query.workflowId as string | undefined,
      status: req.query.status as string | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined
    });
    res.status(StatusCodes.OK).json(tasks);
  }

  async create(req: Request, res: Response) {
    const task = await taskService.create({ ...req.body, createdBy: req.user!.userId });
    res.status(StatusCodes.CREATED).json(task);
  }

  async update(req: Request, res: Response) {
    const task = await taskService.update(req.params.id as string, req.body, req.user!.userId);
    res.status(StatusCodes.OK).json(task);
  }

  async delete(req: Request, res: Response) {
    await taskService.delete(req.params.id as string);
    res.status(StatusCodes.NO_CONTENT).send();
  }
}
