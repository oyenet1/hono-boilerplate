import { injectable } from "inversify";
import { IDatabase } from "../interfaces/IDatabase";
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

  async getAllUsers(page: number = 1, limit: number = 10): Promise<User[]> {
    return await simpleDb.getAllUsers(page, limit);
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

  async getAllPosts(page: number = 1, limit: number = 10): Promise<Post[]> {
    return await simpleDb.getAllPosts(page, limit);
  }

  async getPostsByUser(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<Post[]> {
    return await simpleDb.getPostsByUser(userId, page, limit);
  }

  // Test helper methods
  clear(): void {
    simpleDb.clear();
  }
}
