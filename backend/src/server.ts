import http from "http";
import { createApp } from "./app";
import { connectDatabase } from "./config/database";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { registerEventHandlers } from "./events/registerHandlers";
import { eventBus } from "./services/eventBus.service";
import { createSocketServer } from "./socket";

const bootstrap = async () => {
  await connectDatabase();
  registerEventHandlers();

  const app = createApp();
  const server = http.createServer(app);
  createSocketServer(server);

  const startedAt = new Date();
  server.listen(env.PORT, () => {
    logger.info(`Backend listening on port ${env.PORT}`);
    // Finish events that were interrupted by a previous crash or restart.
    eventBus.recoverPending(startedAt).catch((error) => logger.error("Failed to replay pending events", error));
  });
};

bootstrap().catch((error) => {
  logger.error("Failed to start server", error);
  process.exit(1);
});

