import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { WorkflowService } from "../services/workflow.service";

const workflowService = new WorkflowService();

export class WorkflowController {
  async create(req: Request, res: Response) {
    const workflow = await workflowService.createManual({ ...req.body, createdBy: req.user!.userId });
    res.status(StatusCodes.CREATED).json(workflow);
  }

  async generate(req: Request, res: Response) {
    const workflow = await workflowService.generateFromPrompt(req.body.prompt, req.user!.userId);
    res.status(StatusCodes.CREATED).json(workflow);
  }

  async list(req: Request, res: Response) {
    const workflows = await workflowService.list({
      actorId: req.user!.userId,
      role: req.user!.role,
      search: req.query.search as string | undefined,
      status: req.query.status as string | undefined,
      sortBy: req.query.sortBy as string | undefined,
      sortOrder: req.query.sortOrder as "asc" | "desc" | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined
    });
    res.status(StatusCodes.OK).json(workflows);
  }

  async getById(req: Request, res: Response) {
    const workflow = await workflowService.getById(req.params.id as string);
    res.status(StatusCodes.OK).json(workflow);
  }

  async update(req: Request, res: Response) {
    const workflow = await workflowService.update(req.params.id as string, req.body, req.user!.userId);
    res.status(StatusCodes.OK).json(workflow);
  }

  async delete(req: Request, res: Response) {
    await workflowService.delete(req.params.id as string);
    res.status(StatusCodes.NO_CONTENT).send();
  }
}
