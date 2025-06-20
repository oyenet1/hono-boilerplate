import { expect, test, describe, beforeEach } from "bun:test";
import { createTestContainer, setupTestDatabase } from "../test-setup";
import { TYPES } from "../../src/di/types";
import type { IPostService } from "../../src/interfaces/IPostService";
import type { IUserService } from "../../src/interfaces/IUserService";

describe("PostService", () => {
  let container: any;
  let postService: IPostService;
  let userService: IUserService;
  let userId: string;

  beforeEach(async () => {
    container = createTestContainer();
    postService = container.get(TYPES.PostService);
    userService = container.get(TYPES.UserService);
    setupTestDatabase(container);

    // Create a test user for posts
    const user = await userService.createUser({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
    });
    userId = user.id;
  });

  describe("createPost", () => {
    test("should create a new post successfully", async () => {
      const postData = {
        title: "Test Post",
        content: "This is a test post content",
      };

      const post = await postService.createPost(postData, userId);

      expect(post).toBeDefined();
      expect(post.id).toMatch(/^[a-z0-9]+$/);
      expect(post.title).toBe(postData.title);
      expect(post.content).toBe(postData.content);
      expect(post.userId).toBe(userId);
      expect(post.createdAt).toBeInstanceOf(Date);
    });
  });

  describe("findById", () => {
    test("should find post by id", async () => {
      const postData = {
        title: "Test Post",
        content: "This is a test post content",
      };

      const createdPost = await postService.createPost(postData, userId);
      const foundPost = await postService.findById(createdPost.id);

      expect(foundPost).toBeDefined();
      expect(foundPost?.id).toBe(createdPost.id);
      expect(foundPost?.title).toBe(postData.title);
    });

    test("should return undefined for non-existent post", async () => {
      const post = await postService.findById("nonexistent");
      expect(post).toBeUndefined();
    });
  });

  describe("updatePost", () => {
    test("should update post successfully", async () => {
      const postData = {
        title: "Test Post",
        content: "This is a test post content",
      };

      const createdPost = await postService.createPost(postData, userId);
      const updateData = { title: "Updated Post" };

      const updatedPost = await postService.updatePost(
        createdPost.id,
        updateData,
        userId
      );

      expect(updatedPost).toBeDefined();
      expect(updatedPost?.title).toBe("Updated Post");
      expect(updatedPost?.content).toBe(postData.content);
    });

    test("should return undefined when updating non-existent post", async () => {
      const updateData = { title: "Updated Post" };
      const result = await postService.updatePost(
        "nonexistent",
        updateData,
        userId
      );
      expect(result).toBeUndefined();
    });
  });

  describe("deletePost", () => {
    test("should delete post successfully", async () => {
      const postData = {
        title: "Test Post",
        content: "This is a test post content",
      };

      const createdPost = await postService.createPost(postData, userId);
      const deleted = await postService.deletePost(createdPost.id, userId);

      expect(deleted).toBe(true);

      const foundPost = await postService.findById(createdPost.id);
      expect(foundPost).toBeUndefined();
    });

    test("should return false for non-existent post", async () => {
      const deleted = await postService.deletePost("nonexistent", userId);
      expect(deleted).toBe(false);
    });
  });

  describe("getAllPosts", () => {
    test("should return paginated posts", async () => {
      // Create test posts
      const posts = [
        { title: "Post 1", content: "Content 1" },
        { title: "Post 2", content: "Content 2" },
        { title: "Post 3", content: "Content 3" },
      ];

      for (const postData of posts) {
        await postService.createPost(postData, userId);
      }

      const result = await postService.getAllPosts(1, 2);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe("Post 1");
      expect(result[1].title).toBe("Post 2");
    });
  });

  describe("getPostsByUser", () => {
    test("should return posts by specific user", async () => {
      // Create another user
      const anotherUser = await userService.createUser({
        name: "Another User",
        email: "another@example.com",
        password: "password123",
      });

      // Create posts for both users
      await postService.createPost(
        { title: "User 1 Post", content: "Content" },
        userId
      );
      await postService.createPost(
        { title: "User 2 Post", content: "Content" },
        anotherUser.id
      );

      const userPosts = await postService.getPostsByUser(userId);

      expect(userPosts).toHaveLength(1);
      expect(userPosts[0].title).toBe("User 1 Post");
      expect(userPosts[0].userId).toBe(userId);
    });
  });
});
