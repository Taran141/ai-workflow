import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { UserService } from "../services/user.service";

const userService = new UserService();

export class UserController {
  async list(req: Request, res: Response) {
    const users = await userService.list(req.user!);
    res.status(StatusCodes.OK).json({ items: users });
  }

  async updateRole(req: Request, res: Response) {
    const user = await userService.updateRole(req.params.id as string, req.body.role, req.user!);
    res.status(StatusCodes.OK).json(user);
  }
}
