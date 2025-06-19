import { container } from "../di/container";
import { TYPES } from "../di/types";
import { redisManager } from "../config/redis";
import type { IDatabase } from "../interfaces/IDatabase";

export interface HealthStatus {
  status: "healthy" | "unhealthy" | "degraded";
  timestamp: string;
  services: {
    database: {
      status: "up" | "down" | "error";
      responseTime?: number;
      error?: string;
    };
    redis: {
      status: "up" | "down" | "error";
      responseTime?: number;
      error?: string;
    };
  };
  version: string;
  uptime: number;
}

export class HealthChecker {
  /**
   * Check database connection health
   */
  static async checkDatabase(): Promise<{
    status: "up" | "down" | "error";
    responseTime?: number;
    error?: string;
  }> {
    const startTime = Date.now();
    console.log("🔍 Health Check: Testing database connection...");

    try {
      const database = container.get<IDatabase>(TYPES.Database);

      // Try a simple query to test connection
      // For Drizzle: Try to fetch one user or do a basic query
      // For SimpleDatabase: Try a simple operation
      await database.getAllUsers(1, 1); // Get 1 user, limit 1

      const responseTime = Date.now() - startTime;
      console.log(`✅ Database: Connection successful (${responseTime}ms)`);

      return {
        status: "up",
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown database error";

      console.error(
        `❌ Database: Connection failed (${responseTime}ms) - ${errorMessage}`
      );

      return {
        status: "error",
        responseTime,
        error: errorMessage,
      };
    }
  }

  /**
   * Check Redis connection health
   */
  static async checkRedis(): Promise<{
    status: "up" | "down" | "error";
    responseTime?: number;
    error?: string;
  }> {
    const startTime = Date.now();
    console.log("🔍 Health Check: Testing Redis connection...");

    try {
      if (!redisManager.isRedisConnected()) {
        const responseTime = Date.now() - startTime;
        console.warn(`⚠️  Redis: Not connected (${responseTime}ms)`);

        return {
          status: "down",
          responseTime,
          error: "Redis not connected",
        };
      }

      // Test Redis with a simple ping
      const client = redisManager.getClient();
      await client.ping();

      const responseTime = Date.now() - startTime;
      console.log(`✅ Redis: Connection successful (${responseTime}ms)`);

      return {
        status: "up",
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown Redis error";

      console.error(
        `❌ Redis: Connection failed (${responseTime}ms) - ${errorMessage}`
      );

      return {
        status: "error",
        responseTime,
        error: errorMessage,
      };
    }
  }

  /**
   * Comprehensive health check
   */
  static async getHealthStatus(): Promise<HealthStatus> {
    const startTime = Date.now();
    console.log("🏥 Starting comprehensive health check...");

    // Check all services in parallel
    const [databaseHealth, redisHealth] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    // Determine overall status
    let overallStatus: "healthy" | "unhealthy" | "degraded" = "healthy";

    const hasError =
      databaseHealth.status === "error" || redisHealth.status === "error";
    const hasDown =
      databaseHealth.status === "down" || redisHealth.status === "down";

    if (hasError || hasDown) {
      // If database is down/error, consider unhealthy (critical)
      if (databaseHealth.status !== "up") {
        overallStatus = "unhealthy";
        console.error("💀 Overall Status: UNHEALTHY - Database is down/error");
      }
      // If only Redis is down, consider degraded (non-critical)
      else if (redisHealth.status !== "up") {
        overallStatus = "degraded";
        console.warn(
          "⚠️  Overall Status: DEGRADED - Redis is down but database is up"
        );
      }
    } else {
      console.log("💚 Overall Status: HEALTHY - All services operational");
    }

    const totalTime = Date.now() - startTime;
    console.log(`⏱️  Health check completed in ${totalTime}ms`);
    console.log("📊 Service Status Summary:");
    console.log(
      `   Database: ${databaseHealth.status.toUpperCase()} (${
        databaseHealth.responseTime
      }ms)`
    );
    console.log(
      `   Redis: ${redisHealth.status.toUpperCase()} (${
        redisHealth.responseTime
      }ms)`
    );
    console.log(`   Uptime: ${Math.floor(process.uptime())}s`);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        database: databaseHealth,
        redis: redisHealth,
      },
      version: "2.0.0",
      uptime: process.uptime(),
    };
  }

  /**
   * Quick health check (for load balancers)
   * Returns true if critical services are up
   */
  static async isHealthy(): Promise<boolean> {
    try {
      console.log("🚀 Quick health check for load balancers...");
      const health = await this.getHealthStatus();

      // Service is healthy if database is up
      // Redis down is acceptable (degraded but functional)
      const isHealthy = health.services.database.status === "up";

      if (isHealthy) {
        console.log("✅ Quick check: Service is healthy");
      } else {
        console.error("❌ Quick check: Service is unhealthy");
      }

      return isHealthy;
    } catch (error) {
      console.error("💥 Health check failed:", error);
      return false;
    }
  }
}
