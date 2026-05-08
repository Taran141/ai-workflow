import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { logger } from "../config/logger";
import { AppError } from "../utils/AppError";

export const errorHandler = (error: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(error.message, error);
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ message: error.message, details: error.details });
  }
  return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Internal server error" });
};

