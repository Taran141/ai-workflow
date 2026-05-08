import http from "http";
import { createApp } from "./app";
import { connectDatabase } from "./config/database";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { registerEventHandlers } from "./events/registerHandlers";
import { createSocketServer } from "./socket";

const bootstrap = async () => {
  await connectDatabase();
  registerEventHandlers();

  const app = createApp();
  const server = http.createServer(app);
  createSocketServer(server);

  server.listen(env.PORT, () => logger.info(`Backend listening on port ${env.PORT}`));
};

bootstrap().catch((error) => {
  logger.error("Failed to start server", error);
  process.exit(1);
});

