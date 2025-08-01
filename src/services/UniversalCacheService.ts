import { injectable } from "inversify";
import { redisManager } from "../config/redis";
import { parseAsync, stringifyAsync } from "../utils/asyncJson";
import {
  queueCacheOperation,
  queueInvalidation,
  queueWarmup,
  queueValidation,
} from "../jobs/app-queue";
import type { User } from "../interfaces/IDatabase";

export interface CacheOptions {
  ttl?: number;
}

export interface CachedItem {
  id: string;
  data: any;
  type: string;
  createdAt: string;
  updatedAt: string;
}

export interface CachedUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Universal Cache Service
 * Combines functionality from CacheService, UserCacheService, and AppCacheService
 * into a single, unified caching solution that works for all entity types
 */
@injectable()
export class UniversalCacheService {
  private defaultTTL = 3600; // 1 hour default

  // ========================================
  // CORE CACHE OPERATIONS (from CacheService)
  // ========================================

  /**
   * Get value from cache
   */
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

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      const ttl = options?.ttl || this.defaultTTL;
      const serialized = await stringifyAsync(value);
      await redisManager.setWithExpiry(key, serialized, ttl);
    } catch (error) {
      console.error(`Error setting cache for key ${key}:`, error);
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      await redisManager.del(key);
    } catch (error) {
      console.error(`Error deleting cache for key ${key}:`, error);
    }
  }

  /**
   * Delete keys matching pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      const client = redisManager.getClient();
      const keys = await client.keys(pattern);

      console.log(
        `🔍 Found ${keys.length} keys matching pattern "${pattern}":`,
        keys.slice(0, 10)
      );

      if (keys.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < keys.length; i += batchSize) {
          const batch = keys.slice(i, i + batchSize);
          const keysWithoutPrefix = batch.map((key) =>
            key.replace(/^hono:/, "")
          );

          if (keysWithoutPrefix.length > 0) {
            await client.del(...keysWithoutPrefix);
            console.log(`🗑️ Deleted batch of ${keysWithoutPrefix.length} keys`);
          }
        }
      }
    } catch (error) {
      console.error(`Error deleting pattern ${pattern}:`, error);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      const client = redisManager.getClient();
      await client.flushdb();
    } catch (error) {
      console.error("Error clearing cache:", error);
    }
  }

  /**
   * Cache-aside pattern with error handling (from CacheService)
   */
  async remember<T>(
    key: string,
    callback: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      console.log(`🎯 Cache HIT for key: ${key}`);
      this.restoreDateFields(cached);
      return cached;
    }

    console.log(`❌ Cache MISS for key: ${key}`);

    try {
      const result = await callback();

      if (result !== null && result !== undefined) {
        await this.set(key, result, options);
        console.log(`💾 Cached result for key: ${key}`);
      } else {
        console.log(`⚠️ Skipping cache for null/undefined result: ${key}`);
      }

      return result;
    } catch (error) {
      console.log(`🚫 Not caching error for key: ${key}`, error);
      throw error;
    }
  }

  // ========================================
  // UNIVERSAL ENTITY OPERATIONS (from AppCacheService)
  // ========================================

  /**
   * Check if item exists in cache
   */
  async itemExists(key: string, type: string = "general"): Promise<boolean> {
    try {
      const cacheKey = `cache:${type}:${key}`;
      const cached = await redisManager.getCache(cacheKey);
      return cached !== null;
    } catch (error) {
      console.error(`Error checking if ${type} exists ${key}:`, error);
      return false;
    }
  }

  /**
   * Get item from cache by key
   */
  async getByKey(
    key: string,
    type: string = "general"
  ): Promise<CachedItem | null> {
    try {
      const cacheKey = `cache:${type}:${key}`;
      const cached = await redisManager.getCache(cacheKey);

      if (cached) {
        console.log(`👤 ${type} retrieved from cache: ${key}`);
        return cached as CachedItem;
      }

      console.log(`👤 ${type} not in cache: ${key}`);
      return null;
    } catch (error) {
      console.error(`Error getting ${type} by key ${key}:`, error);
      return null;
    }
  }

  /**
   * Get item by ID from cache
   */
  async getById(
    id: string,
    type: string = "general"
  ): Promise<CachedItem | null> {
    try {
      const cacheKey = `cache:${type}:id:${id}`;
      const cached = await redisManager.getCache(cacheKey);

      if (cached) {
        console.log(`👤 ${type} retrieved from cache by ID: ${id}`);
        return cached as CachedItem;
      }

      console.log(`👤 ${type} not in cache by ID: ${id}`);
      return null;
    } catch (error) {
      console.error(`Error getting ${type} by ID ${id}:`, error);
      return null;
    }
  }

  /**
   * Cache item after creation/update
   */
  async cacheItem(
    data: any,
    type: string,
    action: "CREATE" | "UPDATE" = "CREATE"
  ): Promise<void> {
    try {
      const itemData = {
        id: data.id,
        data: data,
        type: type,
        createdAt: data.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toISOString() || new Date().toISOString(),
      };

      await queueCacheOperation({
        itemId: data.id,
        itemKey: data.email || data.slug || data.name || data.id,
        itemData,
        itemType: type,
        action,
      });

      console.log(
        `📝 Queued ${type} caching: ${action} for ${
          data.email || data.name || data.id
        }`
      );
    } catch (error) {
      console.error(`Error queueing ${type} cache for ${data.id}:`, error);
      throw error;
    }
  }

  /**
   * Remove item from cache after deletion
   */
  async removeFromCache(data: any, type: string): Promise<void> {
    try {
      const itemData = {
        id: data.id,
        data: data,
        type: type,
        createdAt: data.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toISOString() || new Date().toISOString(),
      };

      await queueCacheOperation({
        itemId: data.id,
        itemKey: data.email || data.slug || data.name || data.id,
        itemData,
        itemType: type,
        action: "DELETE",
      });

      console.log(`🗑️ Queued ${type} cache removal for ${data.id}`);
    } catch (error) {
      console.error(
        `Error queueing ${type} cache removal for ${data.id}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Invalidate cache for specific item
   */
  async invalidateCache(id: string, type: string, key?: string): Promise<void> {
    try {
      const invalidationData: any = { itemId: id, itemType: type };
      if (key) {
        invalidationData.itemKey = key;
      }

      await queueInvalidation(invalidationData);
      console.log(`🗑️ Queued cache invalidation for ${type}: ${id}`);
    } catch (error) {
      console.error(
        `Error queueing cache invalidation for ${type} ${id}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Bulk invalidate cache using pattern
   */
  async invalidatePattern(pattern: string, type?: string): Promise<void> {
    try {
      const patternToUse = type ? `cache:${type}:${pattern}` : pattern;
      await queueInvalidation({ pattern: patternToUse });
      console.log(
        `🗑️ Queued bulk cache invalidation for pattern: ${patternToUse}`
      );
    } catch (error) {
      console.error(
        `Error queueing bulk cache invalidation for pattern:`,
        error
      );
      throw error;
    }
  }

  // ========================================
  // USER-SPECIFIC OPERATIONS (from UserCacheService)
  // ========================================

  /**
   * Check if email exists in cache or database
   */
  async emailExists(email: string): Promise<boolean> {
    try {
      const cached = await this.getByKey(email, "user");
      if (cached) {
        console.log(`📧 Email found in cache: ${email}`);
        await this.queueValidation(email, "user");
        return true;
      }

      console.log(`📧 Email not in cache, will be validated: ${email}`);
      await this.queueValidation(email, "user");
      return false;
    } catch (error) {
      console.error(`Error checking email existence for ${email}:`, error);
      return false;
    }
  }

  /**
   * Get user by email from cache
   */
  async getUserByEmail(email: string): Promise<CachedUser | null> {
    try {
      const cached = await this.getByKey(email, "user");
      if (cached && cached.data) {
        console.log(`👤 User retrieved from cache by email: ${email}`);
        return cached.data as CachedUser;
      }

      console.log(`👤 User not in cache by email: ${email}`);
      return null;
    } catch (error) {
      console.error(`Error getting user by email ${email}:`, error);
      return null;
    }
  }

  /**
   * Get user by ID from cache
   */
  async getUserById(userId: string): Promise<CachedUser | null> {
    try {
      const cached = await this.getById(userId, "user");
      if (cached && cached.data) {
        console.log(`👤 User retrieved from cache by ID: ${userId}`);
        return cached.data as CachedUser;
      }

      console.log(`👤 User not in cache by ID: ${userId}`);
      return null;
    } catch (error) {
      console.error(`Error getting user by ID ${userId}:`, error);
      return null;
    }
  }

  /**
   * Cache user after creation/update
   */
  async cacheUser(
    user: User,
    action: "CREATE" | "UPDATE" = "CREATE"
  ): Promise<void> {
    await this.cacheItem(user, "user", action);
  }

  /**
   * Remove user from cache after deletion
   */
  async removeUserFromCache(user: User): Promise<void> {
    await this.removeFromCache(user, "user");
  }

  /**
   * Invalidate cache for specific user
   */
  async invalidateUserCache(userId: string, email?: string): Promise<void> {
    await this.invalidateCache(userId, "user", email);
  }

  // ========================================
  // SERVICE-SPECIFIC CACHE INVALIDATION
  // ========================================

  /**
   * Invalidate ALL caches
   */
  async invalidateAllCaches(): Promise<void> {
    try {
      console.log("🧹 Invalidating ALL caches...");
      const client = redisManager.getClient();

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

  /**
   * Invalidate user-related caches
   */
  async invalidateAllUserCaches(userId?: string): Promise<void> {
    try {
      console.log(
        `🧹 Invalidating user caches${
          userId ? ` for user ID: ${userId}` : " (all users)"
        }`
      );

      if (userId) {
        const patterns = [`*user:${userId}*`, `*user:email:*`, `*users:*`];

        for (const pattern of patterns) {
          await this.deletePattern(pattern);
        }
      } else {
        const patterns = [`*user:*`, `*users:*`];
        for (const pattern of patterns) {
          await this.deletePattern(pattern);
        }
      }

      console.log(`✅ User cache invalidation completed`);
    } catch (error) {
      console.error("Error invalidating user cache:", error);
    }
  }

  /**
   * Invalidate post-related caches
   */
  async invalidatePostCache(postId?: string, userId?: string): Promise<void> {
    try {
      console.log(
        `🧹 Invalidating post caches${postId ? ` for post ID: ${postId}` : ""}${
          userId ? ` for user ID: ${userId}` : ""
        }`
      );

      if (postId) {
        const patterns = [`post:${postId}:*`, `posts:*`];
        for (const pattern of patterns) {
          await this.deletePattern(pattern);
        }
      } else if (userId) {
        const patterns = [`posts:user:${userId}:*`, `posts:*`];
        for (const pattern of patterns) {
          await this.deletePattern(pattern);
        }
      } else {
        await this.deletePattern("post:*");
        await this.deletePattern("posts:*");
      }

      console.log(`✅ Post cache invalidation completed`);
    } catch (error) {
      console.error("Error invalidating post cache:", error);
    }
  }

  // ========================================
  // CACHE KEY GENERATORS (from CacheService)
  // ========================================

  /**
   * Generate user cache key
   */
  generateUserCacheKey(userId: string): string {
    return `user:${userId}`;
  }

  /**
   * Generate user email cache key
   */
  generateUserEmailCacheKey(email: string): string {
    return `user:email:${email}`;
  }

  /**
   * Generate users collection cache key
   */
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

  /**
   * Generate post cache key
   */
  generatePostCacheKey(postId: string): string {
    return `post:${postId}`;
  }

  /**
   * Generate posts collection cache key
   */
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

  // ========================================
  // CACHE STATISTICS AND MONITORING
  // ========================================

  /**
   * Get cache statistics for all types
   */
  async getCacheStats(): Promise<{
    users: number;
    posts: number;
    general: number;
    total: number;
  }> {
    try {
      const client = redisManager.getClient();

      const [userKeys, postKeys, generalKeys] = await Promise.all([
        client.keys("cache:user:*"),
        client.keys("cache:post:*"),
        client.keys("cache:general:*"),
      ]);

      return {
        users: userKeys.length,
        posts: postKeys.length,
        general: generalKeys.length,
        total: userKeys.length + postKeys.length + generalKeys.length,
      };
    } catch (error) {
      console.error("Error getting cache stats:", error);
      return { users: 0, posts: 0, general: 0, total: 0 };
    }
  }

  /**
   * Get cached items count by type
   */
  async getCachedCount(type: string): Promise<number> {
    try {
      const client = redisManager.getClient();
      const keys = await client.keys(`cache:${type}:*`);
      return keys.length;
    } catch (error) {
      console.error(`Error getting cached ${type} count:`, error);
      return 0;
    }
  }

  /**
   * Check if item is cached
   */
  async isCached(key: string, type: string = "general"): Promise<boolean> {
    try {
      const cacheKey = `cache:${type}:${key}`;
      const cached = await redisManager.getCache(cacheKey);
      return cached !== null;
    } catch (error) {
      console.error(`Error checking if ${type} is cached ${key}:`, error);
      return false;
    }
  }

  /**
   * Warm cache with specific items
   */
  async warmCache(
    keys: string[],
    type: string,
    batchSize: number = 10
  ): Promise<void> {
    try {
      await queueWarmup({ keys, itemType: type, batchSize });
      console.log(`🔥 Queued cache warming for ${keys.length} ${type} items`);
    } catch (error) {
      console.error(`Error warming ${type} cache:`, error);
      throw error;
    }
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  /**
   * Restore Date objects from cached data (from CacheService)
   */
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
          const date = new Date(obj[field]);
          if (!isNaN(date.getTime()) && obj[field].includes("T")) {
            obj[field] = date;
          }
        } catch (error) {
          console.warn(`Failed to restore date field ${field}:`, error);
        }
      }
    });
  }

  /**
   * Queue validation for item existence
   */
  private async queueValidation(key: string, type: string): Promise<void> {
    try {
      await queueValidation({ itemKey: key, itemType: type });
    } catch (error) {
      console.error(`Error queueing ${type} validation:`, error);
    }
  }
}
