import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { AuthService } from "../services/auth.service";
import { AppError } from "../utils/AppError";

const authService = new AuthService();

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next(new AppError(StatusCodes.UNAUTHORIZED, "Missing authorization token"));
  }

  try {
    const user = await authService.resolveSession(authHeader.slice("Bearer ".length));
    if (!user) {
      return next(new AppError(StatusCodes.UNAUTHORIZED, "Invalid token"));
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const authorize = (...allowedRoles: string[]) => (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return next(new AppError(StatusCodes.FORBIDDEN, "Insufficient permissions"));
  }
  next();
};
