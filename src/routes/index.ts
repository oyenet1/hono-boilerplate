import { Hono } from "hono";
import { authRoute } from "./authRoute";
import { userRoute } from "./userRoute";
import { postRoute } from "./postRoute";
import { rateLimits } from "../middleware/security";
import { ResponseHelper } from "../utils/response";
import { HealthChecker } from "../utils/healthChecker";

const routes = new Hono();

// API routes with proper rate limiting
routes.route("/auth", authRoute);
routes.route("/users", userRoute);
routes.route("/posts", postRoute);

// Health check endpoint - NO rate limiting for infrastructure monitoring
routes.get("/health", async (c) => {
  try {
    const healthStatus = await HealthChecker.getHealthStatus();

    // Return appropriate HTTP status based on health
    const httpStatus =
      healthStatus.status === "healthy"
        ? 200
        : healthStatus.status === "degraded"
        ? 200 // Still functional
        : 503; // Unhealthy - service unavailable

    const message =
      healthStatus.status === "healthy"
        ? "All services are healthy"
        : healthStatus.status === "degraded"
        ? "Service is functional but some features may be limited"
        : "Service is experiencing issues";

    return ResponseHelper.success(c, healthStatus, message, httpStatus);
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
      version: "2.0.0",
      uptime: process.uptime(),
      error: error instanceof Error ? error.message : "Unknown error",
    };

    return ResponseHelper.error(c, "Health check failed", 503);
  }
});

// Simple health check for load balancers (no rate limiting for critical infrastructure)
routes.get("/ping", async (c) => {
  const isHealthy = await HealthChecker.isHealthy();

  if (isHealthy) {
    return c.json("OK", 200);
  } else {
    return c.json("SERVICE_UNAVAILABLE", 503);
  }
});

export { routes };
