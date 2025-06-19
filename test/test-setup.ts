import "reflect-metadata";
import { Container } from "inversify";
import { TYPES } from "../src/di/types";

// Test implementations
import { SimpleDatabase } from "../src/database/SimpleDatabase";
import { UserService } from "../src/services/UserService";
import { SecureAuthService } from "../src/services/SecureAuthService";
import { PostService } from "../src/services/PostService";
import { UserController } from "../src/controllers/UserController";
import { AuthController } from "../src/controllers/AuthController";
import { PostController } from "../src/controllers/PostController";

// Interfaces
import type { IDatabase } from "../src/interfaces/IDatabase";
import type { IUserService } from "../src/interfaces/IUserService";
import type { IAuthService } from "../src/interfaces/IAuthService";
import type { IPostService } from "../src/interfaces/IPostService";

export function createTestContainer(): Container {
  const testContainer = new Container();

  // Database - use singleton for shared test data
  testContainer
    .bind<IDatabase>(TYPES.Database)
    .to(SimpleDatabase)
    .inSingletonScope();

  // Services
  testContainer.bind<IUserService>(TYPES.UserService).to(UserService);
  testContainer.bind<IAuthService>(TYPES.AuthService).to(SecureAuthService);
  testContainer.bind<IPostService>(TYPES.PostService).to(PostService);

  // Controllers
  testContainer.bind<UserController>(TYPES.UserController).to(UserController);
  testContainer.bind<AuthController>(TYPES.AuthController).to(AuthController);
  testContainer.bind<PostController>(TYPES.PostController).to(PostController);

  return testContainer;
}

export function setupTestDatabase(container: Container): SimpleDatabase {
  const db = container.get<IDatabase>(TYPES.Database) as SimpleDatabase;
  db.clear(); // Clear any existing data
  return db;
}
