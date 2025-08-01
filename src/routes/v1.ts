import { Hono } from "hono";
import { authRoute } from "./authRoute";
import { userRoute } from "./userRoute";
import { postRoute } from "./postRoute";
import { monitoringRoute } from "./monitoringRoute";
import { ApiResponse } from "../utils/response";
import { HealthChecker } from "../utils/healthChecker";
import { formatUptime } from "../utils/formatters";
import { container } from "../di/container";
import { UniversalCacheService } from "../services/UniversalCacheService";
import { secureAuthMiddleware } from "../middleware/security";

const v1 = new Hono().basePath("/v1");

// API v1 with proper rate limiting
v1.route("/auth", authRoute);
v1.route("/users", userRoute);
v1.route("/posts", postRoute);
v1.route("/monitoring", monitoringRoute);

// Health check endpoint - NO rate limiting for infrastructure monitoring
v1.get("/health", async (c) => {
  try {
    const healthStatus = await HealthChecker.getHealthStatus();

    // Return appropriate HTTP status based on health
    const httpStatus =
      healthStatus.status === "healthy"
        ? 200
        : healthStatus.status === "degraded"
        ? 200
        : 503;

    const message =
      healthStatus.status === "healthy"
        ? "All services are healthy"
        : healthStatus.status === "degraded"
        ? "Service is functional but some features may be limited"
        : "Service is experiencing issues";

    return ApiResponse.success(c, healthStatus, message, httpStatus);
  } catch (error) {
    console.error("Health check failed:", error);

    // Return basic health info if health checker fails
    const fallbackHealth = {
      status: "error",
      timestamp: new Date().toISOString(),
      services: {
        database: { status: "unknown", error: "Health check failed" },
        redis: { status: "unknown", error: "Health check failed" },
      },
      version: "1.0.0",
      uptime: formatUptime(process.uptime()),
      error: error instanceof Error ? error.message : "Unknown error",
    };

    return ApiResponse.error(c, "Health check failed", 503);
  }
});

// Simple health check for load balancers (no rate limiting for critical infrastructure)
v1.get("/ping", async (c) => {
  const isHealthy = await HealthChecker.isHealthy();

  if (isHealthy) {
    return ApiResponse.success(c, null, "Service is healthy");
  } else {
    return ApiResponse.error(c, "SERVICE_UNAVAILABLE", 503);
  }
});

// Cache management endpoints (protected)
v1.delete("/cache", async (c) => {
  try {
    const cacheService = container.get(UniversalCacheService);
    await cacheService.invalidateAllCaches();

    return ApiResponse.success(c, null, "All caches invalidated successfully");
  } catch (error) {
    console.error("Error invalidating all caches:", error);
    return ApiResponse.error(c, "Failed to invalidate caches", 500);
  }
});

v1.delete("/cache/users", secureAuthMiddleware, async (c) => {
  try {
    const cacheService = container.get(UniversalCacheService);
    await cacheService.invalidateAllUserCaches();

    return ApiResponse.success(c, null, "User caches invalidated successfully");
  } catch (error) {
    console.error("Error invalidating user caches:", error);
    return ApiResponse.error(c, "Failed to invalidate user caches", 500);
  }
});

v1.delete("/cache/posts", secureAuthMiddleware, async (c) => {
  try {
    const cacheService = container.get(UniversalCacheService);
    await cacheService.invalidatePostCache();

    return ApiResponse.success(c, null, "Post caches invalidated successfully");
  } catch (error) {
    console.error("Error invalidating post caches:", error);
    return ApiResponse.error(c, "Failed to invalidate post caches", 500);
  }
});

v1.delete("/cache/users/:id", secureAuthMiddleware, async (c) => {
  try {
    const userId = c.req.param("id");
    const cacheService = container.get(UniversalCacheService);
    await cacheService.invalidateAllUserCaches(userId);

    return ApiResponse.success(
      c,
      null,
      `User cache for ID ${userId} invalidated successfully`
    );
  } catch (error) {
    console.error("Error invalidating user cache:", error);
    return ApiResponse.error(c, "Failed to invalidate user cache", 500);
  }
});

export { v1 };
