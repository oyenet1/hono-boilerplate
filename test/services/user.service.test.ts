import { expect, test, describe, beforeEach } from "bun:test";
import { createTestContainer, setupTestDatabase } from "../test-setup";
import { TYPES } from "../../src/di/types";
import type { IUserService } from "../../src/interfaces/IUserService";
import type { IDatabase } from "../../src/interfaces/IDatabase";

describe("UserService", () => {
  let container: any;
  let userService: IUserService;
  let database: IDatabase;

  beforeEach(() => {
    container = createTestContainer();
    userService = container.get(TYPES.UserService);
    database = setupTestDatabase(container);
  });

  describe("createUser", () => {
    test("should create a new user successfully", async () => {
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
      };

      const user = await userService.createUser(userData);

      expect(user).toBeDefined();
      expect(typeof user.id).toBe("string");
      expect(user.name).toBe(userData.name);
      expect(user.email).toBe(userData.email);
      expect(user.password).toBe(userData.password);
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    test("should throw error when email already exists", async () => {
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
      };

      await userService.createUser(userData);

      expect(async () => {
        await userService.createUser(userData);
      }).toThrow("User with this email already exists");
    });
  });

  describe("findById", () => {
    test("should find user by id", async () => {
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
      };

      const createdUser = await userService.createUser(userData);
      const foundUser = await userService.findById(createdUser.id);

      expect(foundUser).toBeDefined();
      expect(foundUser?.id).toBe(createdUser.id);
      expect(foundUser?.email).toBe(userData.email);
    });

    test("should return undefined for non-existent user", async () => {
      const user = await userService.findById("999");
      expect(user).toBeUndefined();
    });
  });

  describe("findByEmail", () => {
    test("should find user by email", async () => {
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
      };

      await userService.createUser(userData);
      const foundUser = await userService.findByEmail(userData.email);

      expect(foundUser).toBeDefined();
      expect(foundUser?.email).toBe(userData.email);
    });

    test("should return undefined for non-existent email", async () => {
      const user = await userService.findByEmail("nonexistent@example.com");
      expect(user).toBeUndefined();
    });
  });

  describe("updateUser", () => {
    test("should update user successfully", async () => {
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
      };

      const createdUser = await userService.createUser(userData);
      const updateData = { name: "Jane Doe" };

      const updatedUser = await userService.updateUser(
        createdUser.id,
        updateData
      );

      expect(updatedUser).toBeDefined();
      expect(updatedUser?.name).toBe("Jane Doe");
      expect(updatedUser?.email).toBe(userData.email);
    });
  });

  describe("deleteUser", () => {
    test("should delete user successfully", async () => {
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        password: "password123",
      };

      const createdUser = await userService.createUser(userData);
      const deleted = await userService.deleteUser(createdUser.id);

      expect(deleted).toBe(true);

      const foundUser = await userService.findById(createdUser.id);
      expect(foundUser).toBeUndefined();
    });

    test("should return false for non-existent user", async () => {
      const deleted = await userService.deleteUser("999");
      expect(deleted).toBe(false);
    });
  });

  describe("getAllUsers", () => {
    test("should return paginated users", async () => {
      // Create test users
      const users = [
        { name: "User 1", email: "user1@example.com", password: "password" },
        { name: "User 2", email: "user2@example.com", password: "password" },
        { name: "User 3", email: "user3@example.com", password: "password" },
      ];

      for (const userData of users) {
        await userService.createUser(userData);
      }

      const result = await userService.getAllUsers(1, 2);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("User 1");
      expect(result[1].name).toBe("User 2");
    });
  });
});
