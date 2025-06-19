// Dependency injection symbols for Inversify
export const TYPES = {
  // Services
  UserService: Symbol.for("UserService"),
  AuthService: Symbol.for("AuthService"),
  PostService: Symbol.for("PostService"),

  // Controllers
  UserController: Symbol.for("UserController"),
  AuthController: Symbol.for("AuthController"),
  PostController: Symbol.for("PostController"),

  // Database
  Database: Symbol.for("Database"),
} as const;
