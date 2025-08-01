import { injectable } from "inversify";
import { redisManager } from "../config/redis";
import { parseAsync, stringifyAsync } from "../utils/asyncJson";

export interface CacheOptions {
  ttl?: number;
}

@injectable()
export class CacheService {
  private defaultTTL = 3600; // 1 hour default

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await redisManager.get(key);
      if (!cached) return null;

      return await parseAsync(cached);
    } catch (error) {
      console.error(`Error retrieving cache for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      const ttl = options?.ttl || this.defaultTTL;
      const serialized = await stringifyAsync(value);
      await redisManager.setWithExpiry(key, serialized, ttl);
    } catch (error) {
      console.error(`Error setting cache for key ${key}:`, error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await redisManager.del(key);
    } catch (error) {
      console.error(`Error deleting cache for key ${key}:`, error);
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    try {
      // Use the client directly for pattern operations
      const client = redisManager.getClient();

      // Get all keys that match the pattern (Redis automatically applies prefix)
      const keys = await client.keys(pattern);
      console.log(
        `🔍 Found ${keys.length} keys matching pattern "${pattern}":`,
        keys
      );

      if (keys.length > 0) {
        // Delete keys without prefix since Redis client handles it
        const keysWithoutPrefix = keys.map((key) => key.replace(/^hono:/, ""));
        await client.del(...keysWithoutPrefix);
        console.log(
          `🗑️ Deleted ${keysWithoutPrefix.length} keys:`,
          keysWithoutPrefix
        );
      }
    } catch (error) {
      console.error(`Error deleting cache pattern ${pattern}:`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      const client = redisManager.getClient();
      await client.flushdb();
    } catch (error) {
      console.error("Error clearing cache:", error);
    }
  }

  // Utility method for cache-aside pattern with error handling
  async remember<T>(
    key: string,
    callback: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      console.log(`🎯 Cache HIT for key: ${key}`);
      // Restore Date objects in cached data
      this.restoreDateFields(cached);
      return cached;
    }

    console.log(`❌ Cache MISS for key: ${key}`);

    try {
      // If not in cache, execute callback and cache result
      const result = await callback();

      // Only cache successful results (don't cache errors or null/undefined)
      if (result !== null && result !== undefined) {
        await this.set(key, result, options);
        console.log(`💾 Cached result for key: ${key}`);
      } else {
        console.log(`⚠️ Skipping cache for null/undefined result: ${key}`);
      }

      return result;
    } catch (error) {
      console.log(`🚫 Not caching error for key: ${key}`, error);
      throw error; // Re-throw the error without caching it
    }
  } // Invalidate ALL caches (for create, update, delete operations)
  async invalidateAllCaches(): Promise<void> {
    try {
      console.log("🧹 Invalidating ALL caches...");
      const client = redisManager.getClient();

      // Get all cache keys (excluding session keys and other non-cache data)
      const allKeys = await client.keys("*");
      const cacheKeys = allKeys.filter(
        (key) =>
          !key.includes("session:") &&
          !key.includes("rate_limit:") &&
          !key.includes("auth:")
      );

      if (cacheKeys.length > 0) {
        const keysWithoutPrefix = cacheKeys.map((key) =>
          key.replace(/^hono:/, "")
        );
        await client.del(...keysWithoutPrefix);
        console.log(`🗑️ Deleted ${keysWithoutPrefix.length} cache keys`);
      }
    } catch (error) {
      console.error("Error invalidating all caches:", error);
    }
  }

  // Service-specific cache invalidation methods
  async invalidateUserCache(userId?: string): Promise<void> {
    try {
      console.log(
        `🧹 Invalidating user caches${
          userId ? ` for user ID: ${userId}` : " (all users)"
        }`
      );

      if (userId) {
        // Invalidate specific user caches
        const patterns = [
          `user:${userId}:*`, // Specific user cache
          `user:email:*`, // Email lookup cache (might contain this user)
          `users:*`, // All user collections (they might contain this user)
        ];

        for (const pattern of patterns) {
          await this.deletePattern(pattern);
        }
      } else {
        // Invalidate all user-related caches
        await this.deletePattern("user:*");
        await this.deletePattern("users:*");
      }

      console.log(`✅ User cache invalidation completed`);
    } catch (error) {
      console.error("Error invalidating user cache:", error);
    }
  }

  async invalidatePostCache(postId?: string, userId?: string): Promise<void> {
    try {
      console.log(
        `🧹 Invalidating post caches${postId ? ` for post ID: ${postId}` : ""}${
          userId ? ` for user ID: ${userId}` : ""
        }`
      );

      if (postId) {
        // Invalidate specific post caches
        const patterns = [
          `post:${postId}:*`, // Specific post cache
          `posts:*`, // All post collections (they might contain this post)
        ];

        for (const pattern of patterns) {
          await this.deletePattern(pattern);
        }
      } else if (userId) {
        // Invalidate posts for specific user
        const patterns = [
          `posts:user:${userId}:*`, // User-specific post collections
          `posts:*`, // All post collections (safer approach)
        ];

        for (const pattern of patterns) {
          await this.deletePattern(pattern);
        }
      } else {
        // Invalidate all post-related caches
        await this.deletePattern("post:*");
        await this.deletePattern("posts:*");
      }

      console.log(`✅ Post cache invalidation completed`);
    } catch (error) {
      console.error("Error invalidating post cache:", error);
    }
  }

  // Service-specific cache key generators
  generateUserCacheKey(userId: string): string {
    return `user:${userId}`;
  }

  generateUserEmailCacheKey(email: string): string {
    return `user:email:${email}`;
  }

  generateUsersCacheKey(
    page: number,
    limit: number,
    search?: string,
    sortBy?: any
  ): string {
    const params = [];
    params.push(`page:${page}`);
    params.push(`limit:${limit}`);

    if (search) {
      params.push(`search:${encodeURIComponent(search)}`);
    }

    if (sortBy && Array.isArray(sortBy)) {
      const sortString = sortBy.map((s) => `${s.column}:${s.order}`).join(",");
      params.push(`sort:${encodeURIComponent(sortString)}`);
    }

    return `users:collection:${params.join("|")}`;
  }

  generatePostCacheKey(postId: string): string {
    return `post:${postId}`;
  }

  generatePostsCacheKey(
    page: number,
    limit: number,
    search?: string,
    userId?: string,
    sortBy?: any
  ): string {
    const params = [];
    params.push(`page:${page}`);
    params.push(`limit:${limit}`);

    if (search) {
      params.push(`search:${encodeURIComponent(search)}`);
    }

    if (userId) {
      params.push(`user:${userId}`);
    }

    if (sortBy && Array.isArray(sortBy)) {
      const sortString = sortBy.map((s) => `${s.column}:${s.order}`).join(",");
      params.push(`sort:${encodeURIComponent(sortString)}`);
    }

    return `posts:collection:${params.join("|")}`;
  }

  // Helper method to restore Date objects from cached data
  private restoreDateFields(obj: any): void {
    if (!obj || typeof obj !== "object") return;

    // Handle arrays (like collections)
    if (Array.isArray(obj)) {
      obj.forEach((item) => this.restoreDateFields(item));
      return;
    }

    // Handle collections with data array
    if (obj.data && Array.isArray(obj.data)) {
      obj.data.forEach((item: any) => this.restoreDateFields(item));
    }

    // Restore date fields for User and Post objects
    const dateFields = ["createdAt", "updatedAt"];
    dateFields.forEach((field) => {
      if (obj[field] && typeof obj[field] === "string") {
        try {
          // Check if it's a valid ISO date string
          const date = new Date(obj[field]);
          if (!isNaN(date.getTime()) && obj[field].includes("T")) {
            obj[field] = date;
          }
        } catch (error) {
          // Keep original value if conversion fails
          console.warn(`Failed to restore date field ${field}:`, error);
        }
      }
    });
  }
}
