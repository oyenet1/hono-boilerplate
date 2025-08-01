import { Hono } from "hono";
import { getAppQueueStats } from "../jobs/app-queue";
import { container } from "../di/container";
import { UniversalCacheService } from "../services/UniversalCacheService";

const monitoringRoute = new Hono();

/**
 * Queue Monitoring Routes
 * These endpoints provide insights into the user cache queue performance
 */

// Get overall queue statistics
monitoringRoute.get("/queue/stats", async (c) => {
  try {
    const stats = await getAppQueueStats();
    return c.json({
      success: true,
      data: stats,
      message: "Queue statistics retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting queue stats:", error);
    return c.json(
      {
        success: false,
        error: "Failed to retrieve queue statistics",
      },
      500
    );
  }
});

// Get cache statistics
monitoringRoute.get("/cache/stats", async (c) => {
  try {
    const cacheService = container.get(UniversalCacheService);
    const stats = await cacheService.getCacheStats();
    return c.json({
      success: true,
      data: stats,
      message: "Cache statistics retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting cache stats:", error);
    return c.json(
      {
        success: false,
        error: "Failed to retrieve cache statistics",
      },
      500
    );
  }
});

// Check specific user cache status
monitoringRoute.get("/cache/user/:email", async (c) => {
  try {
    const email = c.req.param("email");
    const cacheService = container.get(UniversalCacheService);

    const [isCached, cachedItem] = await Promise.all([
      cacheService.isCached(email, "user"),
      cacheService.getByKey(email, "user"),
    ]);

    return c.json({
      success: true,
      data: {
        email,
        isCached,
        cachedData: cachedItem,
        cacheStatus: isCached ? "HIT" : "MISS",
      },
    });
  } catch (error) {
    console.error(
      `Error checking cache for user ${c.req.param("email")}:`,
      error
    );
    return c.json(
      {
        success: false,
        error: "Failed to check user cache status",
      },
      500
    );
  }
});

// Health check for queue system
monitoringRoute.get("/health", async (c) => {
  try {
    const queueStats = await getAppQueueStats();
    const cacheService = container.get(UniversalCacheService);
    const cacheStats = await cacheService.getCacheStats();

    // Check if queue stats exist and assess health
    const isHealthy = queueStats?.appOperations
      ? queueStats.appOperations.waiting < 100 &&
        queueStats.appOperations.failed < 10
      : false;

    return c.json(
      {
        success: true,
        data: {
          status: isHealthy ? "healthy" : "degraded",
          queue: queueStats,
          cache: cacheStats,
          timestamp: new Date().toISOString(),
        },
      },
      isHealthy ? 200 : 503
    );
  } catch (error) {
    console.error("Error checking queue health:", error);
    return c.json(
      {
        success: false,
        error: "Failed to check queue health",
        status: "unhealthy",
      },
      500
    );
  }
});

// BullMQ Dashboard Configuration Info
monitoringRoute.get("/dashboard/config", async (c) => {
  return c.json({
    success: true,
    data: {
      dashboard: {
        description: "Use BullMQ Dashboard to monitor your queues",
        setup: {
          installation: "npm install -g bull-board",
          usage: "Create a separate monitoring server with Bull Dashboard",
          port: "3001 (recommended)",
          redis: {
            host: process.env.REDIS_HOST || "localhost",
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD || undefined,
          },
        },
        queues: [
          {
            name: "app-operations",
            description:
              "Handles all app operations including cache, users, posts, etc.",
            jobs: [
              "cacheOperation",
              "invalidate",
              "warmup",
              "validate",
              "general",
            ],
          },
        ],
        endpoints: {
          stats: "/api/v1/monitoring/queue/stats",
          health: "/api/v1/monitoring/health",
          cache: "/api/v1/monitoring/cache/stats",
          userCheck: "/api/v1/monitoring/cache/user/:email",
        },
      },
    },
  });
});

export { monitoringRoute };
