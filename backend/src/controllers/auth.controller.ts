import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { AuthService } from "../services/auth.service";

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response) {
    const result = await authService.register(req.body);
    res.status(StatusCodes.CREATED).json(result);
  }

  async login(req: Request, res: Response) {
    const result = await authService.login(req.body);
    res.status(StatusCodes.OK).json(result);
  }
}

