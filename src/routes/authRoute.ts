import { Hono } from "hono";
import { container } from "../di/container";
import { TYPES } from "../di/types";
import { AuthController } from "../controllers/AuthController";
import { rateLimits } from "../middleware/security";
import { validateJson } from "../utils/zValidator";
import { CreateUserDto, LoginDto } from "../dtos";
import { secureAuthMiddleware } from "../middleware/security";

const authRoute = new Hono();
const authController = container.get<AuthController>(TYPES.AuthController);

// Apply strict rate limiting to all auth routes
authRoute.use("*", rateLimits.auth);

// Authentication routes with validation
authRoute.post("/register", validateJson(CreateUserDto), (c) =>
  authController.register(c)
);
authRoute.post("/login", validateJson(LoginDto), (c) =>
  authController.login(c)
);
authRoute.post("/logout", (c) => authController.logout(c));
authRoute.post("/refresh", (c) => authController.refreshSession(c));
authRoute.get("/profile", secureAuthMiddleware, (c) =>
  authController.profile(c)
);

export { authRoute };
