import { injectable } from "inversify";
import { redisManager } from "../config/redis";
import { queueUserCache, queueEmailValidation, queueCacheInvalidation } from "../jobs/user-cache-queue";
import type { User } from "../interfaces/IDatabase";

export interface CachedUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

@injectable()
export class UserCacheService {
  
  /**
   * Check if email exists in cache or database
   * This is optimized for email validation during registration
   */
  async emailExists(email: string): Promise<boolean> {
    try {
      const normalizedEmail = email.toLowerCase();
      const cacheKey = `user:email:${normalizedEmail}`;
      
      // First check cache
      const cached = await redisManager.getCache(cacheKey);
      if (cached) {
        console.log(`📧 Email existence check (cached): ${email} - EXISTS`);
        return true;
      }
      
      // If not in cache, queue validation and return false for now
      // The validation will cache the result for future checks
      await queueEmailValidation(email);
      console.log(`📧 Email existence check queued for: ${email}`);
      
      return false; // Conservative approach - return false if not cached
    } catch (error) {
      console.error(`Error checking email existence for ${email}:`, error);
      return false;
    }
  }

  /**
   * Get user by email from cache
   * Falls back to database if not cached
   */
  async getUserByEmail(email: string): Promise<CachedUser | null> {
    try {
      const normalizedEmail = email.toLowerCase();
      const cacheKey = `user:email:${normalizedEmail}`;
      
      const cached = await redisManager.getCache(cacheKey);
      if (cached) {
        console.log(`👤 User retrieved from cache: ${email}`);
        return cached as CachedUser;
      }
      
      console.log(`👤 User not in cache: ${email}`);
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
      const cacheKey = `user:id:${userId}`;
      
      const cached = await redisManager.getCache(cacheKey);
      if (cached) {
        console.log(`👤 User retrieved from cache by ID: ${userId}`);
        return cached as CachedUser;
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
  async cacheUser(user: User, action: 'CREATE' | 'UPDATE' = 'CREATE'): Promise<void> {
    try {
      const userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };

      await queueUserCache({
        userId: user.id,
        email: user.email,
        userData,
        action,
      });

      console.log(`📝 Queued user caching: ${action} for ${user.email}`);
    } catch (error) {
      console.error(`Error queueing user cache for ${user.email}:`, error);
      throw error;
    }
  }

  /**
   * Remove user from cache after deletion
   */
  async removeUserFromCache(user: User): Promise<void> {
    try {
      const userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };

      await queueUserCache({
        userId: user.id,
        email: user.email,
        userData,
        action: 'DELETE',
      });

      console.log(`🗑️ Queued user cache removal for ${user.email}`);
    } catch (error) {
      console.error(`Error queueing user cache removal for ${user.email}:`, error);
      throw error;
    }
  }

  /**
   * Invalidate cache for specific user
   */
  async invalidateUserCache(userId: string, email?: string): Promise<void> {
    try {
      const invalidationData: any = { userId };
      if (email) {
        invalidationData.email = email;
      }

      await queueCacheInvalidation(invalidationData);
      console.log(`🗑️ Queued cache invalidation for user: ${userId}`);
    } catch (error) {
      console.error(`Error queueing cache invalidation for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Bulk invalidate cache using pattern
   */
  async invalidateCachePattern(pattern: string): Promise<void> {
    try {
      await queueCacheInvalidation({ pattern });
      console.log(`🗑️ Queued bulk cache invalidation for pattern: ${pattern}`);
    } catch (error) {
      console.error(`Error queueing bulk cache invalidation for pattern ${pattern}:`, error);
      throw error;
    }
  }

  /**
   * Get cached user count (for monitoring)
   */
  async getCachedUserCount(): Promise<number> {
    try {
      const client = redisManager.getClient();
      const keys = await client.keys('cache:user:email:*');
      return keys.length;
    } catch (error) {
      console.error('Error getting cached user count:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalUsers: number;
    emailMappings: number;
    userIdMappings: number;
  }> {
    try {
      const client = redisManager.getClient();
      
      const [emailKeys, userIdKeys, mappingKeys] = await Promise.all([
        client.keys('cache:user:email:*'),
        client.keys('cache:user:id:*'),
        client.keys('cache:email:mapping:*'),
      ]);

      return {
        totalUsers: emailKeys.length,
        emailMappings: mappingKeys.length,
        userIdMappings: userIdKeys.length,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { totalUsers: 0, emailMappings: 0, userIdMappings: 0 };
    }
  }

  /**
   * Check if user is cached
   */
  async isUserCached(email: string): Promise<boolean> {
    try {
      const normalizedEmail = email.toLowerCase();
      const cacheKey = `user:email:${normalizedEmail}`;
      const cached = await redisManager.getCache(cacheKey);
      return cached !== null;
    } catch (error) {
      console.error(`Error checking if user is cached ${email}:`, error);
      return false;
    }
  }

  /**
   * Warm cache with specific users
   */
  async warmUserCache(emails: string[]): Promise<void> {
    try {
      const { queueCacheWarming } = await import('../jobs/user-cache-queue');
      await queueCacheWarming({ emails, batchSize: 10 });
      console.log(`🔥 Queued cache warming for ${emails.length} users`);
    } catch (error) {
      console.error('Error warming user cache:', error);
      throw error;
    }
  }
}
