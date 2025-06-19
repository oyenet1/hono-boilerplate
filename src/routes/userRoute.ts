import { Hono } from "hono";
import { container } from "../di/container";
import { TYPES } from "../di/types";
import { UserController } from "../controllers/UserController";
import { secureAuthMiddleware, rateLimits } from "../middleware/security";

const userRoute = new Hono();
const userController = container.get<UserController>(TYPES.UserController);

// Apply API rate limiting to all user routes
userRoute.use("*", rateLimits.api);

// Public user routes (with rate limiting)
userRoute.get("/", (c) => userController.getUsers(c));
userRoute.get("/:id", (c) => userController.getUser(c));

// Protected user routes (require authentication)
userRoute.put("/:id", secureAuthMiddleware, (c) =>
  userController.updateUser(c)
);
userRoute.delete("/:id", secureAuthMiddleware, rateLimits.sensitive, (c) =>
  userController.deleteUser(c)
);

export { userRoute };
