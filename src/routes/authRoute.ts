import { Hono } from "hono";
import { container } from "../di/container";
import { TYPES } from "../di/types";
import { AuthController } from "../controllers/AuthController";
import { rateLimits } from "../middleware/security";

const authRoute = new Hono();
const authController = container.get<AuthController>(TYPES.AuthController);

// Apply strict rate limiting to all auth routes
authRoute.use("*", rateLimits.auth);

// Authentication routes
authRoute.post("/register", (c) => authController.register(c));
authRoute.post("/login", (c) => authController.login(c));
authRoute.post("/logout", (c) => authController.logout(c));
authRoute.post("/refresh", (c) => authController.refreshSession(c));

export { authRoute };
