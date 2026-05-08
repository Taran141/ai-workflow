import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ActivityService } from "../services/activity.service";

const activityService = new ActivityService();

export class ActivityController {
  async list(req: Request, res: Response) {
    const activities = await activityService.list({
      entityType: req.query.entityType as string | undefined,
      entityId: req.query.entityId as string | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined
    });
    res.status(StatusCodes.OK).json(activities);
  }
}

