import type { Server } from "node:http";
import { createApp } from "./app";
import { env } from "./config/env";
import { closeDB, connectDB } from "./db/mongo";

async function startServer(): Promise<void> {
  await connectDB();

  const app = createApp();
  const server: Server = app.listen(env.PORT, () => {
    console.log(
      `StudioSpace API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`,
    );
    console.log(`Health check: http://localhost:${env.PORT}/api/health`);
  });

  const shutdown = (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await closeDB();
      console.log("Server closed. Database connection released.");
      process.exit(0);
    });

    setTimeout(() => {
      console.error("Forced shutdown after timeout.");
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

startServer().catch((error) => {
  console.error("Failed to start StudioSpace API:", error);
  process.exit(1);
});
