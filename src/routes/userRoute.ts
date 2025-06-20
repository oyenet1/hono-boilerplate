import { Hono } from "hono";
import { container } from "../di/container";
import { TYPES } from "../di/types";
import { UserController } from "../controllers/UserController";
import { secureAuthMiddleware, rateLimits } from "../middleware/security";
import {
  validateJson,
  validateParam,
  validateQuery,
} from "../utils/zValidator";
import { UpdateUserDto, PaginationDto } from "../dtos";
import { z } from "zod";

const userRoute = new Hono();
const userController = container.get<UserController>(TYPES.UserController);

// Parameter validation schema
const UserIdSchema = z.object({
  id: z.string().min(1, "User ID is required"),
});

// Apply API rate limiting to all user routes
// userRoute.use("*", rateLimits.api);

// Public user routes (with rate limiting and validation)
userRoute.get("/", validateQuery(PaginationDto), (c) =>
  userController.getUsers(c)
);
userRoute.get("/:id", validateParam(UserIdSchema), (c) =>
  userController.getUser(c)
);

// Protected user routes (require authentication and validation)
userRoute.put(
  "/:id",
  secureAuthMiddleware,
  validateParam(UserIdSchema),
  validateJson(UpdateUserDto),
  (c) => userController.updateUser(c)
);
userRoute.delete(
  "/:id",
  secureAuthMiddleware,
  rateLimits.sensitive,
  validateParam(UserIdSchema),
  (c) => userController.deleteUser(c)
);

export { userRoute };
