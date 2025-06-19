import { expect, test, describe, beforeEach } from "bun:test";
import { hash } from "bcryptjs";
import { createTestContainer, setupTestDatabase } from "../test-setup";
import { TYPES } from "../../src/di/types";
import type { IAuthService } from "../../src/interfaces/IAuthService";
import type { IUserService } from "../../src/interfaces/IUserService";

describe("AuthService", () => {
  let container: any;
  let authService: IAuthService;
  let userService: IUserService;

  beforeEach(() => {
    container = createTestContainer();
    authService = container.get(TYPES.AuthService);
    userService = container.get(TYPES.UserService);
    setupTestDatabase(container);
  });

  describe("register", () => {
    test("should register a new user successfully", async () => {
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
      };

      const result = await authService.register(userData);

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.sessionId).toBeDefined();
      expect(result.user.name).toBe(userData.name);
      expect(result.user.email).toBe(userData.email);
      expect(result.user.id).toBe(1);
      expect(typeof result.sessionId).toBe("string");
    });

    test("should throw error when email already exists", async () => {
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
      };

      await authService.register(userData);

      expect(async () => {
        await authService.register(userData);
      }).toThrow("User with this email already exists");
    });
  });

  describe("login", () => {
    test("should login successfully with correct credentials", async () => {
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
      };

      await authService.register(userData);

      const loginData = {
        email: userData.email,
        password: userData.password,
      };

      const result = await authService.login(loginData);

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.sessionId).toBeDefined();
      expect(result.user.email).toBe(userData.email);
      expect(typeof result.sessionId).toBe("string");
    });

    test("should throw error with invalid email", async () => {
      const loginData = {
        email: "nonexistent@example.com",
        password: "password123",
      };

      expect(async () => {
        await authService.login(loginData);
      }).toThrow(); // Just check that it throws, message can vary due to rate limiting
    });

    test("should throw error with invalid password", async () => {
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
      };

      await authService.register(userData);

      const loginData = {
        email: userData.email,
        password: "wrongpassword",
      };

      expect(async () => {
        await authService.login(loginData);
      }).toThrow("Invalid credentials");
    });
  });
});
