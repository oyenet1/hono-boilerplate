import { expect, test, describe, beforeEach } from "bun:test";
import { createTestContainer, setupTestDatabase } from "../test-setup";
import { TYPES } from "../../src/di/types";
import type { IDatabase } from "../../src/interfaces/IDatabase";
import { SimpleDatabase } from "../../src/database/SimpleDatabase";

describe("Database Integration", () => {
  let container: any;
  let database: SimpleDatabase;

  beforeEach(() => {
    container = createTestContainer();
    database = setupTestDatabase(container);
  });

  describe("User and Post Relationship", () => {
    test("should create user and posts with proper relationships", async () => {
      // Create a user
      const userData = {
        name: "John Doe",
        email: "john@example.com",
        password: "hashedpassword",
      };

      const user = await database.createUser(userData);
      expect(user.id).toMatch(/^[a-z0-9]+$/);

      // Create posts for the user
      const postData1 = {
        title: "First Post",
        content: "Content of first post",
        userId: user.id,
      };

      const postData2 = {
        title: "Second Post",
        content: "Content of second post",
        userId: user.id,
      };

      const post1 = await database.createPost(postData1);
      const post2 = await database.createPost(postData2);

      expect(post1.id).toMatch(/^[a-z0-9]+$/);
      expect(post2.id).toMatch(/^[a-z0-9]+$/);
      expect(post1.userId).toBe(user.id);
      expect(post2.userId).toBe(user.id);

      // Verify posts belong to user
      const userPosts = await database.getPostsByUser(user.id);
      expect(userPosts).toHaveLength(2);
      expect(userPosts[0].title).toBe("First Post");
      expect(userPosts[1].title).toBe("Second Post");
    });

    test("should handle multiple users with their own posts", async () => {
      // Create first user
      const user1 = await database.createUser({
        name: "User One",
        email: "user1@example.com",
        password: "password",
      });

      // Create second user
      const user2 = await database.createUser({
        name: "User Two",
        email: "user2@example.com",
        password: "password",
      });

      // Create posts for each user
      await database.createPost({
        title: "User 1 Post",
        content: "Content",
        userId: user1.id,
      });

      await database.createPost({
        title: "User 2 Post",
        content: "Content",
        userId: user2.id,
      });

      // Verify each user has their own posts
      const user1Posts = await database.getPostsByUser(user1.id);
      const user2Posts = await database.getPostsByUser(user2.id);

      expect(user1Posts).toHaveLength(1);
      expect(user2Posts).toHaveLength(1);
      expect(user1Posts[0].title).toBe("User 1 Post");
      expect(user2Posts[0].title).toBe("User 2 Post");

      // Verify all posts
      const allPosts = await database.getAllPosts();
      expect(allPosts).toHaveLength(2);
    });
  });

  describe("Data Consistency", () => {
    test("should maintain data consistency after operations", async () => {
      // Create user and post
      const user = await database.createUser({
        name: "Test User",
        email: "test@example.com",
        password: "password",
      });

      const post = await database.createPost({
        title: "Test Post",
        content: "Content",
        userId: user.id,
      });

      // Update post
      const updatedPost = await database.updatePost(
        post.id,
        {
          title: "Updated Title",
        },
        user.id
      );

      expect(updatedPost?.title).toBe("Updated Title");
      expect(updatedPost?.content).toBe("Content");

      // Verify the post still exists and is updated
      const foundPost = await database.findPostById(post.id);
      expect(foundPost?.title).toBe("Updated Title");

      // Delete post
      const deleted = await database.deletePost(post.id, user.id);
      expect(deleted).toBe(true);

      // Verify post is deleted
      const deletedPost = await database.findPostById(post.id);
      expect(deletedPost).toBeUndefined();

      // User should still exist
      const foundUser = await database.findUserById(user.id);
      expect(foundUser).toBeDefined();
    });
  });

  describe("Test Helper Methods", () => {
    test("should clear database correctly", () => {
      // Add some data
      database.createUser({
        name: "Test User",
        email: "test@example.com",
        password: "password",
      });

      // Clear and verify
      database.clear();

      expect(database.getAllUsers()).resolves.toHaveLength(0);
      expect(database.getAllPosts()).resolves.toHaveLength(0);
    });

    test("should seed test data correctly", async () => {
      await database.seedTestData();

      const user = await database.findUserByEmail("test@example.com");
      expect(user).toBeDefined();
      expect(user?.name).toBe("Test User");
    });
  });
});
