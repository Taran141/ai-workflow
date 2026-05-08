import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { TokenService } from "../services/token.service";
import { AppError } from "../utils/AppError";

const tokenService = new TokenService();

export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next(new AppError(StatusCodes.UNAUTHORIZED, "Missing authorization token"));
  }

  try {
    req.user = tokenService.verify(authHeader.replace("Bearer ", ""));
    next();
  } catch {
    next(new AppError(StatusCodes.UNAUTHORIZED, "Invalid token"));
  }
};

export const authorize = (...allowedRoles: string[]) => (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return next(new AppError(StatusCodes.FORBIDDEN, "Insufficient permissions"));
  }
  next();
};

