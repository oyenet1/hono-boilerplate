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

  // Utility method for cache-aside pattern
  async remember<T>(
    key: string,
    callback: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // If not in cache, execute callback and cache result
    const result = await callback();
    await this.set(key, result, options);
    return result;
  }

  // Invalidate ALL caches (for create, update, delete operations)
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

  // Invalidate related cache keys
  async invalidateUserCache(userId?: string): Promise<void> {
    // For any user operation, clear all caches to ensure consistency
    await this.invalidateAllCaches();
  }

  async invalidatePostCache(userId?: string): Promise<void> {
    // For any post operation, clear all caches to ensure consistency
    await this.invalidateAllCaches();
  }
}
