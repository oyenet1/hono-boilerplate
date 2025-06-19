import "reflect-metadata";
import { Container } from "inversify";
import { TYPES } from "./types";

// Interfaces
import type { IDatabase } from "../interfaces/IDatabase";
import type { IUserService } from "../interfaces/IUserService";
import type { IAuthService } from "../interfaces/IAuthService";
import type { IPostService } from "../interfaces/IPostService";

// Implementations
import { DrizzleDatabase } from "../database/DrizzleDatabase";
import { UserService } from "../services/UserService";
import { SecureAuthService } from "../services/SecureAuthService";
import { PostService } from "../services/PostService";
import { UserController } from "../controllers/UserController";
import { AuthController } from "../controllers/AuthController";
import { PostController } from "../controllers/PostController";

const container = new Container();

// Database
container
  .bind<IDatabase>(TYPES.Database)
  .to(DrizzleDatabase)
  .inSingletonScope();

// Services
container.bind<IUserService>(TYPES.UserService).to(UserService);
container.bind<IAuthService>(TYPES.AuthService).to(SecureAuthService);
container.bind<IPostService>(TYPES.PostService).to(PostService);

// Controllers
container.bind<UserController>(TYPES.UserController).to(UserController);
container.bind<AuthController>(TYPES.AuthController).to(AuthController);
container.bind<PostController>(TYPES.PostController).to(PostController);

export { container };
