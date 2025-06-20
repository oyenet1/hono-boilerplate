import { Hono } from "hono";
import { container } from "../di/container";
import { TYPES } from "../di/types";
import { AuthController } from "../controllers/AuthController";
import { rateLimits } from "../middleware/security";
import { validateJson, zValidator } from "../utils/zValidator";
import {
  CreateUserDto,
  LoginDto,
  RevokeSessionDto,
  RefreshSessionDto,
} from "../dtos";
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
authRoute.post("/refresh", validateJson(RefreshSessionDto), (c) =>
  authController.refreshSession(c)
);
authRoute.get("/profile", secureAuthMiddleware, (c) =>
  authController.profile(c)
);

// Session management routes (requires authentication)
authRoute.get("/sessions", secureAuthMiddleware, (c) =>
  authController.getSessions(c)
);
authRoute.get("/sessions/current", secureAuthMiddleware, (c) =>
  authController.getCurrentSession(c)
);
authRoute.delete(
  "/sessions/revoke",
  secureAuthMiddleware,
  validateJson(RevokeSessionDto),
  (c) => authController.revokeSession(c)
);
authRoute.delete("/sessions/revoke-others", secureAuthMiddleware, (c) =>
  authController.revokeAllOtherSessions(c)
);

export { authRoute };
