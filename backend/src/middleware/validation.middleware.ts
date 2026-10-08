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

  // Hand the parsed output to the controllers so unknown fields are stripped and defaults/transforms apply.
  const data = result.data as { body?: unknown; query?: Request["query"] };
  if (data.body !== undefined) req.body = data.body;
  if (data.query !== undefined) req.query = data.query;
  next();
};
