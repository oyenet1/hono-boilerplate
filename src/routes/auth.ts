import { Hono } from "hono";
import { container } from "../di/container";
import { TYPES } from "../di/types";
import { AuthController } from "../controllers/AuthController";

const auth = new Hono();
const authController = container.get<AuthController>(TYPES.AuthController);

auth.post("/register", (c) => authController.register(c));
auth.post("/login", (c) => authController.login(c));

export { auth };
