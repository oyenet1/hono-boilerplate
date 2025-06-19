import { Hono } from "hono";
import { container } from "../di/container";
import { TYPES } from "../di/types";
import { UserController } from "../controllers/UserController";
import { authMiddleware } from "../middleware";

const users = new Hono();
const userController = container.get<UserController>(TYPES.UserController);

users.get("/", (c) => userController.getUsers(c));
users.get("/:id", (c) => userController.getUser(c));
users.put("/:id", authMiddleware, (c) => userController.updateUser(c));
users.delete("/:id", authMiddleware, (c) => userController.deleteUser(c));

export { users };
