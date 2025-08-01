import "reflect-metadata";
import { Hono } from "hono";
import { config } from "./config/app";
import {
  corsMiddleware,
  securityHeadersMiddleware,
  loggerMiddleware,
} from "./middleware/security";
import { errorHandler } from "./utils/errorHandlers";
import { v1 } from "./routes/v1";
import { redisManager } from "./config/redis";
import { ApiResponse } from "./utils/response";

const app = new Hono();

// Global security middleware
app.use("*", securityHeadersMiddleware);
app.use("*", corsMiddleware);
app.use("*", loggerMiddleware);
app.use("*", errorHandler);

// Routes
app.route("/api", v1);

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

  return ApiResponse.success(
    c,
    appData,
    "Hono MVC Boilerplate API - Secure Edition"
  );
});

// Error handling - remove the onError since we're using middleware
// app.onError(errorHandler);

// 404 handler
app.notFound((c) => {
  return ApiResponse.notFound(c, "Route not found");
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

// Startup logging with connection status checks
const startupCheck = async () => {
  console.log(`🚀 Server starting on port ${config.port}`);
  console.log(`🔒 Security features enabled`);

  // Check and display Redis connection status
  try {
    const redisStatus = redisManager.isRedisConnected()
      ? "connected"
      : "disconnected";
    console.log(`📊 Redis connection: ${redisStatus}`);
  } catch (error) {
    console.log(
      `📊 Redis connection: error - ${
        error instanceof Error ? error.message : "unknown"
      }`
    );
  }

  // Check and display Database connection status
  try {
    const { HealthChecker } = await import("./utils/healthChecker");
    const dbStatus = await HealthChecker.checkDatabase();
    console.log(`🗄️  Database connection: ${dbStatus.status}`);
    if (dbStatus.status !== "up" && dbStatus.error) {
      console.log(`   ⚠️  Database issue: ${dbStatus.error}`);
    }
  } catch (error) {
    console.log(
      `🗄️  Database connection: error - ${
        error instanceof Error ? error.message : "unknown"
      }`
    );
  }

  console.log(`✅ Server ready at http://${config.host}:${config.port}`);
};

// Run startup checks
startupCheck().catch((error) => {
  console.error("Startup check failed:", error);
});

export default {
  port: config.port,
  hostname: config.host,
  fetch: app.fetch,
};
