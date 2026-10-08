import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import { logger } from "../config/logger";
import { AppError } from "../utils/AppError";
import { isDuplicateKeyError } from "../utils/mongo";

const getClientErrorStatus = (error: Error) => {
  // body-parser and other http-errors expose a 4xx `status` that is safe to return to the client.
  const { status, expose } = error as Error & { status?: unknown; expose?: unknown };
  return typeof status === "number" && status >= 400 && status < 500 && expose === true ? status : undefined;
};

export const errorHandler = (error: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logger.error(error.message, error);
    }
    return res.status(error.statusCode).json({ message: error.message, details: error.details });
  }

  if (error instanceof mongoose.Error.CastError) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: `Invalid ${error.path}` });
  }

  if (error instanceof mongoose.Error.ValidationError) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "Validation failed",
      details: Object.values(error.errors).map((item) => ({ path: item.path, message: item.message }))
    });
  }

  if (isDuplicateKeyError(error)) {
    return res.status(StatusCodes.CONFLICT).json({ message: "Resource already exists" });
  }

  const clientErrorStatus = getClientErrorStatus(error);
  if (clientErrorStatus) {
    return res.status(clientErrorStatus).json({ message: error.message });
  }

  logger.error(error.message, error);
  return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Internal server error" });
};
