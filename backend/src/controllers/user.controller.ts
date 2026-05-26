import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { UserService } from "../services/user.service";

const userService = new UserService();

export class UserController {
  async list(_req: Request, res: Response) {
    const users = await userService.list();
    res.status(StatusCodes.OK).json({ items: users });
  }
}
