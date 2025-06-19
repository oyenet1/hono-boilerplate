import "reflect-metadata";
import { Hono } from "hono";
import { config } from "./config/app";
import { corsMiddleware, loggerMiddleware, errorHandler } from "./middleware";
import { routes } from "./routes";

const app = new Hono();

// Global middleware
app.use("*", corsMiddleware);
app.use("*", loggerMiddleware);

// Routes
app.route("/api", routes);

// Root route
app.get("/", (c) => {
  return c.json({
    success: true,
    message: "Welcome to Hono MVC Boilerplate",
    version: "1.0.0",
    documentation: "/api/health",
  });
});

// Error handling
app.onError(errorHandler);

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      message: "Route not found",
    },
    404
  );
});

console.log(`Server is running on port ${config.port}`);

export default {
  port: config.port,
  fetch: app.fetch,
};
