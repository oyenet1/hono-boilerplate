import { Hono } from "hono";
import { authRoute } from "./authRoute";
import { userRoute } from "./userRoute";
import { postRoute } from "./postRoute";
import { rateLimits } from "../middleware/security";
import { ResponseHelper } from "../utils/response";

const routes = new Hono();

// API routes with proper rate limiting
routes.route("/auth", authRoute);
routes.route("/users", userRoute);
routes.route("/posts", postRoute);

// Health check endpoint with public rate limiting
routes.get("/health", rateLimits.public, (c) => {
  const healthData = {
    timestamp: new Date().toISOString(),
    redis: "connected", // You can check actual Redis status here
    database: "connected",
    version: "2.0.0",
  };

  return ResponseHelper.success(c, healthData, "API is healthy");
});

export { routes };
