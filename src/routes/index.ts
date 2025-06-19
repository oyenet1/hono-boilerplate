import { Hono } from "hono";
import { auth } from "./auth";
import { users } from "./users";
import { posts } from "./posts";

const routes = new Hono();

// API routes
routes.route("/auth", auth);
routes.route("/users", users);
routes.route("/posts", posts);

// Health check
routes.get("/health", (c) => {
  return c.json({
    success: true,
    message: "API is healthy",
    timestamp: new Date().toISOString(),
  });
});

export { routes };
