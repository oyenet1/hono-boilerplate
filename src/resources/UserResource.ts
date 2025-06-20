import { BaseResource } from "./BaseResource";
import { User } from "../interfaces/IDatabase";

export interface UserResourceData {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  postsCount?: number;
}

export class UserResource extends BaseResource<User, UserResourceData> {
  transform(user: User): UserResourceData {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  // Transform with additional data (like posts count)
  transformWithMeta(
    user: User,
    meta?: { postsCount?: number }
  ): UserResourceData {
    const transformed = this.transform(user);

    if (meta?.postsCount !== undefined) {
      transformed.postsCount = meta.postsCount;
    }

    return transformed;
  }

  // Generate cache key for user collections
  generateUsersCacheKey(
    page: number = 1,
    limit: number = 10,
    search?: string,
    sortBy?: Array<{ column: string; order: "asc" | "desc" }>
  ): string {
    return this.generateCacheKey({
      prefix: "users",
      params: { page, limit, search, sortBy },
    });
  }

  // Generate cache key for a specific user
  generateUserCacheKey(userId: string): string {
    return `user:${userId}`;
  }
}
