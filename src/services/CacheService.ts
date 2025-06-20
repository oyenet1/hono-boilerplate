import { injectable } from "inversify";
import { redisManager } from "../config/redis";
import { parseAsync, stringifyAsync } from "../utils/asyncJson";

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
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
      await redisManager.setWithExpiration(key, serialized, ttl);
    } catch (error) {
      console.error(`Error setting cache for key ${key}:`, error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await redisManager.delete(key);
    } catch (error) {
      console.error(`Error deleting cache for key ${key}:`, error);
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    try {
      // Use the client directly for pattern operations
      const client = redisManager.getClient();
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(...keys);
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

  // Invalidate related cache keys
  async invalidateUserCache(userId?: string): Promise<void> {
    const patterns = ["users:*", userId ? `user:${userId}:*` : null].filter(
      Boolean
    );

    for (const pattern of patterns) {
      await this.deletePattern(pattern!);
    }
  }

  async invalidatePostCache(userId?: string): Promise<void> {
    const patterns = [
      "posts:*",
      userId ? `posts:user:${userId}:*` : null,
    ].filter(Boolean);

    for (const pattern of patterns) {
      await this.deletePattern(pattern!);
    }
  }
}
