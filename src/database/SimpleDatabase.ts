import { injectable } from "inversify";
import {
  IDatabase,
  QueryOptions,
  PaginatedResult,
} from "../interfaces/IDatabase";
import { simpleDb } from "./simple";
import type { User, Post } from "./simple";

@injectable()
export class SimpleDatabase implements IDatabase {
  // User methods
  async createUser(
    userData: Omit<User, "id" | "createdAt" | "updatedAt">
  ): Promise<User> {
    return await simpleDb.createUser(userData);
  }

  async findUserById(id: string): Promise<User | undefined> {
    return await simpleDb.findUserById(id);
  }

  async findUserByEmail(email: string): Promise<User | undefined> {
    return await simpleDb.findUserByEmail(email);
  }

  async updateUser(
    id: string,
    userData: Partial<Omit<User, "id" | "createdAt">>
  ): Promise<User | undefined> {
    return await simpleDb.updateUser(id, userData);
  }

  async deleteUser(id: string): Promise<boolean> {
    return await simpleDb.deleteUser(id);
  }

  async getAllUsers(
    options: QueryOptions = {}
  ): Promise<PaginatedResult<User>> {
    const { page = 1, limit = 10, search } = options;

    // Get all users first
    let allUsers = await simpleDb.getAllUsers(1, 9999); // Get all users

    // Apply search filter if provided
    if (search) {
      const searchTerm = search.toLowerCase();
      allUsers = allUsers.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm) ||
          user.email.toLowerCase().includes(searchTerm)
      );
    }

    const total = allUsers.length;
    const offset = (page - 1) * limit;
    const data = allUsers.slice(offset, offset + limit);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async getUsersCount(search?: string): Promise<number> {
    let allUsers = await simpleDb.getAllUsers(1, 9999);

    if (search) {
      const searchTerm = search.toLowerCase();
      allUsers = allUsers.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm) ||
          user.email.toLowerCase().includes(searchTerm)
      );
    }

    return allUsers.length;
  }

  // Post methods
  async createPost(
    postData: Omit<Post, "id" | "createdAt" | "updatedAt">
  ): Promise<Post> {
    return await simpleDb.createPost(postData);
  }

  async findPostById(id: string): Promise<Post | undefined> {
    return await simpleDb.findPostById(id);
  }

  async updatePost(
    id: string,
    postData: Partial<Omit<Post, "id" | "createdAt" | "userId">>,
    userId: string
  ): Promise<Post | undefined> {
    return await simpleDb.updatePost(id, postData, userId);
  }

  async deletePost(id: string, userId: string): Promise<boolean> {
    return await simpleDb.deletePost(id, userId);
  }

  async getAllPosts(
    options: QueryOptions = {}
  ): Promise<PaginatedResult<Post>> {
    const { page = 1, limit = 10, search } = options;

    // Get all posts first
    let allPosts = await simpleDb.getAllPosts(1, 9999); // Get all posts

    // Apply search filter if provided
    if (search) {
      const searchTerm = search.toLowerCase();
      allPosts = allPosts.filter(
        (post) =>
          post.title.toLowerCase().includes(searchTerm) ||
          post.content.toLowerCase().includes(searchTerm)
      );
    }

    const total = allPosts.length;
    const offset = (page - 1) * limit;
    const data = allPosts.slice(offset, offset + limit);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async getPostsByUser(
    userId: string,
    options: QueryOptions = {}
  ): Promise<PaginatedResult<Post>> {
    const { page = 1, limit = 10, search } = options;

    // Get all posts by user first
    let userPosts = await simpleDb.getPostsByUser(userId, 1, 9999); // Get all user posts

    // Apply search filter if provided
    if (search) {
      const searchTerm = search.toLowerCase();
      userPosts = userPosts.filter(
        (post) =>
          post.title.toLowerCase().includes(searchTerm) ||
          post.content.toLowerCase().includes(searchTerm)
      );
    }

    const total = userPosts.length;
    const offset = (page - 1) * limit;
    const data = userPosts.slice(offset, offset + limit);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async getPostsCount(search?: string, userId?: string): Promise<number> {
    let allPosts = userId
      ? await simpleDb.getPostsByUser(userId, 1, 9999)
      : await simpleDb.getAllPosts(1, 9999);

    if (search) {
      const searchTerm = search.toLowerCase();
      allPosts = allPosts.filter(
        (post) =>
          post.title.toLowerCase().includes(searchTerm) ||
          post.content.toLowerCase().includes(searchTerm)
      );
    }

    return allPosts.length;
  }

  // Test helper methods
  async clear(): Promise<void> {
    simpleDb.clear();
  }

  async seedTestData(): Promise<void> {
    // For SimpleDatabase, we'll create basic test data directly
    await this.clear();

    // Create test users
    const testUser = await simpleDb.createUser({
      name: "Test User",
      email: "test@example.com",
    });

    // Create test posts
    await simpleDb.createPost({
      title: "Test Post 1",
      content: "This is test content for development",
      userId: testUser.id,
    });

    await simpleDb.createPost({
      title: "Test Post 2",
      content: "Sample post content for testing",
      userId: testUser.id,
    });
  }
}
