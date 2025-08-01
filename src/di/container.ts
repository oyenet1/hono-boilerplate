import "reflect-metadata";
import { Container } from "inversify";

// Import services and controllers
import { DrizzleDatabase } from "../database/DrizzleDatabase";
import { CacheService } from "../services/CacheService";
import { UserService } from "../services/UserService";
import { SecureAuthService } from "../services/SecureAuthService";
import { PostService } from "../services/PostService";
import { UserController } from "../controllers/UserController";
import { AuthController } from "../controllers/AuthController";
import { PostController } from "../controllers/PostController";

const container = new Container();

// Database
container.bind(DrizzleDatabase).toSelf().inSingletonScope();

// Services
container.bind(CacheService).toSelf().inSingletonScope();
container.bind(UserService).toSelf();
container.bind(SecureAuthService).toSelf();
container.bind(PostService).toSelf();

// Controllers
container.bind(UserController).toSelf();
container.bind(AuthController).toSelf();
container.bind(PostController).toSelf();

export { container };
