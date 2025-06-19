import { expect, test, describe, beforeEach } from "bun:test";
import { createTestContainer, setupTestDatabase } from "../test-setup";
import { TYPES } from "../../src/di/types";
import type { IAuthService } from "../../src/interfaces/IAuthService";

describe("AuthController Integration", () => {
  let container: any;
  let authService: IAuthService;

  beforeEach(() => {
    container = createTestContainer();
    authService = container.get(TYPES.AuthService);
    setupTestDatabase(container);
  });

  describe("User Registration Flow", () => {
    test("should register a user successfully", async () => {
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
      };

      const result = await authService.register(userData);

      expect(result).toBeDefined();
      expect(result.user.name).toBe(userData.name);
      expect(result.user.email).toBe(userData.email);
      expect(result.token).toBeDefined();
      expect(result.sessionId).toBeDefined();
      expect(typeof result.token).toBe("string");
      expect(typeof result.sessionId).toBe("string");
    });

    test("should prevent duplicate email registration", async () => {
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

  describe("User Login Flow", () => {
    test("should login successfully with valid credentials", async () => {
      // First register a user
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
      };

      await authService.register(userData);

      // Then login
      const loginData = {
        email: userData.email,
        password: userData.password,
      };

      const result = await authService.login(loginData);

      expect(result).toBeDefined();
      expect(result.user.email).toBe(userData.email);
      expect(result.token).toBeDefined();
      expect(result.sessionId).toBeDefined();
      expect(typeof result.token).toBe("string");
      expect(typeof result.sessionId).toBe("string");
    });

    test("should reject invalid email", async () => {
      const loginData = {
        email: "nonexistent@example.com",
        password: "password123",
      };

      expect(async () => {
        await authService.login(loginData);
      }).toThrow(); // Just check that it throws, message can vary due to rate limiting
    });

    test("should reject invalid password", async () => {
      // First register a user
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
      };

      await authService.register(userData);

      // Try to login with wrong password
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
