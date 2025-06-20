import { injectable } from "inversify";
import { eq, desc, asc, and, count, ilike, sql } from "drizzle-orm";
import { db } from "./connection";
import { users, posts } from "./schema";
import {
  IDatabase,
  QueryOptions,
  PaginatedResult,
  SortField,
} from "../interfaces/IDatabase";

type User = typeof users.$inferSelect;
type NewUser = typeof users.$inferInsert;
type Post = typeof posts.$inferSelect;
type NewPost = typeof posts.$inferInsert;

@injectable()
export class DrizzleDatabase implements IDatabase {
  // Helper method to build sort clauses
  private buildSortClause(
    sortBy?: SortField[],
    defaultColumn = "createdAt",
    defaultOrder: "asc" | "desc" = "desc"
  ) {
    if (!sortBy || sortBy.length === 0) {
      // Return default sort
      if (defaultColumn === "createdAt") {
        return defaultOrder === "desc"
          ? desc(users.createdAt)
          : asc(users.createdAt);
      }
      return defaultOrder === "desc" ? desc(users.name) : asc(users.name);
    }

    // Build sort array from sortBy fields
    return sortBy.map((sort) => {
      const column = sort.column;
      const order = sort.order;

      // Map column names to actual database columns
      switch (column) {
        case "name":
          return order === "desc" ? desc(users.name) : asc(users.name);
        case "email":
          return order === "desc" ? desc(users.email) : asc(users.email);
        case "createdAt":
          return order === "desc"
            ? desc(users.createdAt)
            : asc(users.createdAt);
        case "updatedAt":
          return order === "desc"
            ? desc(users.updatedAt)
            : asc(users.updatedAt);
        default:
          return order === "desc"
            ? desc(users.createdAt)
            : asc(users.createdAt);
      }
    });
  }

  // Helper method to build post sort clauses
  private buildPostSortClause(
    sortBy?: SortField[],
    defaultColumn = "createdAt",
    defaultOrder: "asc" | "desc" = "desc"
  ) {
    if (!sortBy || sortBy.length === 0) {
      // Return default sort
      if (defaultColumn === "createdAt") {
        return defaultOrder === "desc"
          ? desc(posts.createdAt)
          : asc(posts.createdAt);
      }
      return defaultOrder === "desc" ? desc(posts.title) : asc(posts.title);
    }

    // Build sort array from sortBy fields
    return sortBy.map((sort) => {
      const column = sort.column;
      const order = sort.order;

      // Map column names to actual database columns
      switch (column) {
        case "title":
          return order === "desc" ? desc(posts.title) : asc(posts.title);
        case "content":
          return order === "desc" ? desc(posts.content) : asc(posts.content);
        case "createdAt":
          return order === "desc"
            ? desc(posts.createdAt)
            : asc(posts.createdAt);
        case "updatedAt":
          return order === "desc"
            ? desc(posts.updatedAt)
            : asc(posts.updatedAt);
        default:
          return order === "desc"
            ? desc(posts.createdAt)
            : asc(posts.createdAt);
      }
    });
  }
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
    return (result.rowCount ?? 0) > 0;
  }

  async getAllUsers(
    options: QueryOptions = {}
  ): Promise<PaginatedResult<User>> {
    const { page = 1, limit = 10, search, sortBy } = options;
    const offset = (page - 1) * limit;

    // Build where clause for search
    const whereClause = search
      ? sql`${users.name} ILIKE ${`%${search}%`} OR ${
          users.email
        } ILIKE ${`%${search}%`}`
      : undefined;

    // Get total count for pagination
    const totalQuery = search
      ? db.select({ count: count() }).from(users).where(whereClause!)
      : db.select({ count: count() }).from(users);

    const [{ count: total }] = await totalQuery;

    // Get paginated results with sorting
    const sortClauses = this.buildSortClause(sortBy);

    const query = db.select().from(users).limit(limit).offset(offset);

    if (whereClause) {
      query.where(whereClause);
    }

    if (Array.isArray(sortClauses)) {
      query.orderBy(...sortClauses);
    } else {
      query.orderBy(sortClauses);
    }

    const data = await query;

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async getUsersCount(search?: string): Promise<number> {
    const whereClause = search
      ? sql`${users.name} ILIKE ${`%${search}%`} OR ${
          users.email
        } ILIKE ${`%${search}%`}`
      : undefined;

    const query = whereClause
      ? db.select({ count: count() }).from(users).where(whereClause)
      : db.select({ count: count() }).from(users);

    const [{ count: total }] = await query;
    return total;
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
    return (result.rowCount ?? 0) > 0;
  }

  async getAllPosts(
    options: QueryOptions = {}
  ): Promise<PaginatedResult<Post>> {
    const { page = 1, limit = 10, search, sortBy } = options;
    const offset = (page - 1) * limit;

    // Build where clause for search
    const whereClause = search
      ? sql`${posts.title} ILIKE ${`%${search}%`} OR ${
          posts.content
        } ILIKE ${`%${search}%`}`
      : undefined;

    // Get total count for pagination
    const totalQuery = search
      ? db.select({ count: count() }).from(posts).where(whereClause!)
      : db.select({ count: count() }).from(posts);

    const [{ count: total }] = await totalQuery;

    // Get paginated results with sorting
    const sortClauses = this.buildPostSortClause(sortBy);

    const query = db.select().from(posts).limit(limit).offset(offset);

    if (whereClause) {
      query.where(whereClause);
    }

    if (Array.isArray(sortClauses)) {
      query.orderBy(...sortClauses);
    } else {
      query.orderBy(sortClauses);
    }

    const data = await query;

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
    const { page = 1, limit = 10, search, sortBy } = options;
    const offset = (page - 1) * limit;

    // Build where clause combining user filter and search
    let whereClause = eq(posts.userId, userId);

    if (search) {
      whereClause = and(
        eq(posts.userId, userId),
        sql`${posts.title} ILIKE ${`%${search}%`} OR ${
          posts.content
        } ILIKE ${`%${search}%`}`
      )!;
    }

    // Get total count for pagination
    const [{ count: total }] = await db
      .select({ count: count() })
      .from(posts)
      .where(whereClause);

    // Get paginated results with sorting
    const sortClauses = this.buildPostSortClause(sortBy);

    const query = db
      .select()
      .from(posts)
      .where(whereClause)
      .limit(limit)
      .offset(offset);

    if (Array.isArray(sortClauses)) {
      query.orderBy(...sortClauses);
    } else {
      query.orderBy(sortClauses);
    }

    const data = await query;

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async getPostsCount(search?: string, userId?: string): Promise<number> {
    let whereClause = userId ? eq(posts.userId, userId) : undefined;

    if (search && userId) {
      whereClause = and(
        eq(posts.userId, userId),
        sql`${posts.title} ILIKE ${`%${search}%`} OR ${
          posts.content
        } ILIKE ${`%${search}%`}`
      )!;
    } else if (search) {
      whereClause = sql`${posts.title} ILIKE ${`%${search}%`} OR ${
        posts.content
      } ILIKE ${`%${search}%`}`;
    }

    const query = whereClause
      ? db.select({ count: count() }).from(posts).where(whereClause)
      : db.select({ count: count() }).from(posts);

    const [{ count: total }] = await query;
    return total;
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
