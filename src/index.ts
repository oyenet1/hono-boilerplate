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

const app = new Hono();

// Global security middleware
app.use("*", securityHeadersMiddleware);
app.use("*", corsMiddleware);
app.use("*", loggerMiddleware);

// Routes
app.route("/api", routes);

// Root route
app.get("/", (c) => {
  return c.json({
    success: true,
    message: "Hono MVC Boilerplate API - Secure Edition",
    version: "2.0.0",
    features: [
      "JWT Authentication",
      "Redis Sessions",
      "Rate Limiting",
      "Security Headers",
    ],
    documentation: "/api/health",
    timestamp: new Date().toISOString(),
  });
});

// Error handling
app.onError(errorHandler);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: "Route not found",
      timestamp: new Date().toISOString(),
    },
    404
  );
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
