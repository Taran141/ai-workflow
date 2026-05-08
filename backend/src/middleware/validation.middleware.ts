import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { StatusCodes } from "http-status-codes";

export const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params
  });
  if (!result.success) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "Validation failed",
      errors: result.error.flatten()
    });
  }
  next();
};

