import "reflect-metadata";
import { Hono } from "hono";
import { config } from "./config/app";
import {
  corsMiddleware,
  securityHeadersMiddleware,
  loggerMiddleware,
  errorHandler,
} from "./middleware/security";
import { routes } from "./routes";
import { redisManager } from "./config/redis";
import { ResponseHelper } from "./utils/response";

const app = new Hono();

// Global security middleware
app.use("*", securityHeadersMiddleware);
app.use("*", corsMiddleware);
app.use("*", loggerMiddleware);

// Routes
app.route("/api", routes);

// Root route
app.get("/", (c) => {
  const appData = {
    version: "2.0.0",
    features: [
      "JWT Authentication",
      "Redis Sessions",
      "Rate Limiting",
      "Security Headers",
      "Drizzle ORM",
      "CUID2 IDs",
      "Dependency Injection",
    ],
    documentation: "/api/health",
    timestamp: new Date().toISOString(),
  };

  return ResponseHelper.success(
    c,
    appData,
    "Hono MVC Boilerplate API - Secure Edition"
  );
});

// Error handling
app.onError(errorHandler);

// 404 handler
app.notFound((c) => {
  return ResponseHelper.notFound(c, "Route not found");
});

// Graceful shutdown handling
const gracefulShutdown = async () => {
  console.log("Shutting down gracefully...");
  try {
    await redisManager.disconnect();
    console.log("Redis disconnected");
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

console.log(`🚀 Server starting on port ${config.port}`);
console.log(`🔒 Security features enabled`);
console.log(`📊 Redis connection configured`);

export default {
  port: config.port,
  fetch: app.fetch,
};
