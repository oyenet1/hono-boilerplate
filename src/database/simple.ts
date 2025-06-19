// Simple database implementation for development
// This is a temporary solution until Drizzle is properly configured

import { createId } from "@paralleldrive/cuid2";

interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Post {
  id: string;
  title: string;
  content: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

class SimpleDB {
  private users: User[] = [];
  private posts: Post[] = [];

  // Clear method for testing
  clear(): void {
    this.users = [];
    this.posts = [];
  }

  // User methods
  async createUser(
    userData: Omit<User, "id" | "createdAt" | "updatedAt">
  ): Promise<User> {
    const user: User = {
      ...userData,
      id: createId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.push(user);
    return user;
  }

  async findUserById(id: string): Promise<User | undefined> {
    return this.users.find((user) => user.id === id);
  }

  async findUserByEmail(email: string): Promise<User | undefined> {
    return this.users.find((user) => user.email === email);
  }

  async updateUser(
    id: string,
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

  async deleteUser(id: string): Promise<boolean> {
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
      id: createId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.posts.push(post);
    return post;
  }

  async findPostById(id: string): Promise<Post | undefined> {
    return this.posts.find((post) => post.id === id);
  }

  async updatePost(
    id: string,
    postData: Partial<Omit<Post, "id" | "createdAt" | "userId">>,
    userId: string
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

  async deletePost(id: string, userId: string): Promise<boolean> {
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
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<Post[]> {
    const userPosts = this.posts.filter((post) => post.userId === userId);
    const offset = (page - 1) * limit;
    return userPosts.slice(offset, offset + limit);
  }
}

export const simpleDb = new SimpleDB();
export type { User, Post };
