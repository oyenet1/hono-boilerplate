import { injectable } from "inversify";
import { IDatabase } from "../interfaces/IDatabase";
import { User, Post } from "./simple";

@injectable()
export class SimpleDatabase implements IDatabase {
  private users: User[] = [];
  private posts: Post[] = [];
  private userIdCounter = 1;
  private postIdCounter = 1;

  // User methods
  async createUser(
    userData: Omit<User, "id" | "createdAt" | "updatedAt">
  ): Promise<User> {
    const user: User = {
      ...userData,
      id: this.userIdCounter++,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.push(user);
    return user;
  }

  async findUserById(id: number): Promise<User | undefined> {
    return this.users.find((user) => user.id === id);
  }

  async findUserByEmail(email: string): Promise<User | undefined> {
    return this.users.find((user) => user.email === email);
  }

  async updateUser(
    id: number,
    userData: Partial<Omit<User, "id" | "createdAt">>
  ): Promise<User | undefined> {
    const userIndex = this.users.findIndex((user) => user.id === id);
    if (userIndex === -1) return undefined;

    this.users[userIndex] = {
      ...this.users[userIndex],
      ...userData,
      updatedAt: new Date(),
    };
    return this.users[userIndex];
  }

  async deleteUser(id: number): Promise<boolean> {
    const userIndex = this.users.findIndex((user) => user.id === id);
    if (userIndex === -1) return false;
    this.users.splice(userIndex, 1);
    return true;
  }

  async getAllUsers(page: number = 1, limit: number = 10): Promise<User[]> {
    const offset = (page - 1) * limit;
    return this.users.slice(offset, offset + limit);
  }

  // Post methods
  async createPost(
    postData: Omit<Post, "id" | "createdAt" | "updatedAt">
  ): Promise<Post> {
    const post: Post = {
      ...postData,
      id: this.postIdCounter++,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.posts.push(post);
    return post;
  }

  async findPostById(id: number): Promise<Post | undefined> {
    return this.posts.find((post) => post.id === id);
  }

  async updatePost(
    id: number,
    postData: Partial<Omit<Post, "id" | "createdAt" | "userId">>,
    userId: number
  ): Promise<Post | undefined> {
    const postIndex = this.posts.findIndex(
      (post) => post.id === id && post.userId === userId
    );
    if (postIndex === -1) return undefined;

    this.posts[postIndex] = {
      ...this.posts[postIndex],
      ...postData,
      updatedAt: new Date(),
    };
    return this.posts[postIndex];
  }

  async deletePost(id: number, userId: number): Promise<boolean> {
    const postIndex = this.posts.findIndex(
      (post) => post.id === id && post.userId === userId
    );
    if (postIndex === -1) return false;
    this.posts.splice(postIndex, 1);
    return true;
  }

  async getAllPosts(page: number = 1, limit: number = 10): Promise<Post[]> {
    const offset = (page - 1) * limit;
    return this.posts.slice(offset, offset + limit);
  }

  async getPostsByUser(
    userId: number,
    page: number = 1,
    limit: number = 10
  ): Promise<Post[]> {
    const userPosts = this.posts.filter((post) => post.userId === userId);
    const offset = (page - 1) * limit;
    return userPosts.slice(offset, offset + limit);
  }

  // Test helper methods
  clear(): void {
    this.users = [];
    this.posts = [];
    this.userIdCounter = 1;
    this.postIdCounter = 1;
  }

  seedTestData(): void {
    this.clear();
    // Add minimal test data
    this.users.push({
      id: 1,
      name: "Test User",
      email: "test@example.com",
      password: "hashedpassword",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    this.userIdCounter = 2;
  }
}
