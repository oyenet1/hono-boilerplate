import { injectable } from "inversify";
import { eq, desc, and } from "drizzle-orm";
import { db } from "./connection";
import { users, posts } from "./schema";
import { IDatabase } from "../interfaces/IDatabase";

type User = typeof users.$inferSelect;
type NewUser = typeof users.$inferInsert;
type Post = typeof posts.$inferSelect;
type NewPost = typeof posts.$inferInsert;

@injectable()
export class DrizzleDatabase implements IDatabase {
  // User methods
  async createUser(
    userData: Omit<User, "id" | "createdAt" | "updatedAt">
  ): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        name: userData.name,
        email: userData.email,
        password: userData.password,
      })
      .returning();
    return user;
  }

  async findUserById(id: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user;
  }

  async findUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return user;
  }

  async updateUser(
    id: string,
    userData: Partial<Omit<User, "id" | "createdAt">>
  ): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.length > 0;
  }

  async getAllUsers(page: number = 1, limit: number = 10): Promise<User[]> {
    const offset = (page - 1) * limit;
    return await db
      .select()
      .from(users)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(users.createdAt));
  }

  // Post methods
  async createPost(
    postData: Omit<Post, "id" | "createdAt" | "updatedAt">
  ): Promise<Post> {
    const [post] = await db
      .insert(posts)
      .values({
        title: postData.title,
        content: postData.content,
        userId: postData.userId,
      })
      .returning();
    return post;
  }

  async findPostById(id: string): Promise<Post | undefined> {
    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, id))
      .limit(1);
    return post;
  }

  async updatePost(
    id: string,
    postData: Partial<Omit<Post, "id" | "createdAt" | "userId">>,
    userId: string
  ): Promise<Post | undefined> {
    const [post] = await db
      .update(posts)
      .set({
        ...postData,
        updatedAt: new Date(),
      })
      .where(and(eq(posts.id, id), eq(posts.userId, userId)))
      .returning();
    return post;
  }

  async deletePost(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(posts)
      .where(and(eq(posts.id, id), eq(posts.userId, userId)));
    return result.length > 0;
  }

  async getAllPosts(page: number = 1, limit: number = 10): Promise<Post[]> {
    const offset = (page - 1) * limit;
    return await db
      .select()
      .from(posts)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(posts.createdAt));
  }

  async getPostsByUser(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<Post[]> {
    const offset = (page - 1) * limit;
    return await db
      .select()
      .from(posts)
      .where(eq(posts.userId, userId))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(posts.createdAt));
  }

  // Test helper methods (for development/testing only)
  async clear(): Promise<void> {
    await db.delete(posts);
    await db.delete(users);
  }

  async seedTestData(): Promise<void> {
    // Use the new TestSeeder
    const { TestSeeder } = await import("./seeders");
    const testSeeder = new TestSeeder();
    await testSeeder.run();
  }
}

// Export types for use in other files
export type { User, NewUser, Post, NewPost };
