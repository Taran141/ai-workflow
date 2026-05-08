import cors from "cors";
import express from "express";
import helmet from "helmet";
import routes from "./routes";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error.middleware";
import { apiRateLimiter } from "./middleware/rateLimiter.middleware";
import { requestLogger } from "./middleware/requestLogger.middleware";

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
  app.use(express.json());
  app.use(requestLogger);
  app.use(apiRateLimiter);
  app.use("/api", routes);
  app.use(errorHandler);

  return app;
};

