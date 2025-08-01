import { Worker, Job } from "bullmq";
import { container } from "../di/container";
import { UserService } from "../services/UserService";
import { UniversalCacheService } from "../services/UniversalCacheService";
import { redisManager } from "../config/redis";
import type {
  JobData,
  CacheUserJob,
  InvalidateCacheJob,
  WarmCacheJob,
  EmailValidationJob,
  GeneralCacheJob,
} from "./cache-queue";

// Redis connection configuration
const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
};

// Worker class for better organization
export class CacheWorker {
  private worker: Worker;
  private userService: UserService;
  private cacheService: UniversalCacheService;

  constructor() {
    this.userService = container.get(UserService);
    this.cacheService = container.get(UniversalCacheService);

    this.worker = new Worker("cache-operations", this.processJob.bind(this), {
      connection: redisConnection,
      concurrency: parseInt(process.env.QUEUE_CONCURRENCY || "5"),
      maxStalledCount: 1,
      stalledInterval: 30000,
    });

    this.setupEventHandlers();
  }

  private async processJob(job: Job<JobData>): Promise<void> {
    const { data } = job;

    try {
      switch (data.type) {
        case "cacheUser":
          await this.processCacheUser(data);
          break;
        case "invalidateCache":
          await this.processInvalidateCache(data);
          break;
        case "warmCache":
          await this.processWarmCache(data);
          break;
        case "validateEmail":
          await this.processValidateEmail(data);
          break;
        case "generalCache":
          await this.processGeneralCache(data);
          break;
        default:
          throw new Error(`Unknown job type: ${(data as any).type}`);
      }

      console.log(`✅ Completed job: ${data.type} (${job.id})`);
    } catch (error) {
      console.error(`❌ Failed job: ${data.type} (${job.id}):`, error);
      throw error;
    }
  }

  private async processCacheUser(data: CacheUserJob): Promise<void> {
    const { userId, email, userData, action } = data;

    try {
      const normalizedEmail = email.toLowerCase();

      if (action === "DELETE") {
        // Remove from cache
        const emailKey = `cache:user:email:${normalizedEmail}`;
        const idKey = `cache:user:id:${userId}`;
        const mappingKey = `cache:email:mapping:${normalizedEmail}`;

        await Promise.all([
          redisManager.del(emailKey),
          redisManager.del(idKey),
          redisManager.del(mappingKey),
        ]);

        console.log(`🗑️ Removed user from cache: ${email}`);
      } else {
        // Cache user data
        const emailKey = `cache:user:email:${normalizedEmail}`;
        const idKey = `cache:user:id:${userId}`;
        const mappingKey = `cache:email:mapping:${normalizedEmail}`;

        const ttl = 30 * 60; // 30 minutes

        await Promise.all([
          redisManager.setWithExpiry(emailKey, JSON.stringify(userData), ttl),
          redisManager.setWithExpiry(idKey, JSON.stringify(userData), ttl),
          redisManager.setWithExpiry(mappingKey, userId, ttl),
        ]);

        console.log(`💾 Cached user: ${email} (${action})`);
      }
    } catch (error) {
      console.error(`Error processing cache user job for ${email}:`, error);
      throw error;
    }
  }

  private async processInvalidateCache(
    data: InvalidateCacheJob
  ): Promise<void> {
    const { userId, email, pattern } = data;

    try {
      if (pattern) {
        // Bulk invalidation using pattern
        await this.cacheService.deletePattern(pattern);
        console.log(`🗑️ Invalidated cache pattern: ${pattern}`);
      } else if (userId || email) {
        // Specific user invalidation
        if (email) {
          const normalizedEmail = email.toLowerCase();
          const emailKey = `cache:user:email:${normalizedEmail}`;
          const mappingKey = `cache:email:mapping:${normalizedEmail}`;

          await Promise.all([
            redisManager.del(emailKey),
            redisManager.del(mappingKey),
          ]);
        }

        if (userId) {
          const idKey = `cache:user:id:${userId}`;
          await redisManager.del(idKey);
        }

        console.log(`🗑️ Invalidated user cache: ${email || userId}`);
      }
    } catch (error) {
      console.error("Error processing cache invalidation:", error);
      throw error;
    }
  }

  private async processWarmCache(data: WarmCacheJob): Promise<void> {
    const { emails, batchSize } = data;

    try {
      // Process emails in batches
      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (email: string) => {
            try {
              const user = await this.userService.findByEmail(email);
              if (user) {
                // User will be cached by the findByEmail method
                console.log(`🔥 Warmed cache for: ${email}`);
              }
            } catch (error) {
              console.error(`Error warming cache for ${email}:`, error);
            }
          })
        );

        // Small delay between batches to prevent overwhelming
        if (i + batchSize < emails.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      console.log(`🔥 Cache warming completed for ${emails.length} users`);
    } catch (error) {
      console.error("Error processing cache warming:", error);
      throw error;
    }
  }

  private async processValidateEmail(data: EmailValidationJob): Promise<void> {
    const { email } = data;

    try {
      const normalizedEmail = email.toLowerCase();
      const cacheKey = `cache:user:email:${normalizedEmail}`;

      // Check if already cached
      const cached = await redisManager.getCache(cacheKey);
      if (cached) {
        console.log(`📧 Email validation (already cached): ${email}`);
        return;
      }

      // Check database and cache result
      const user = await this.userService.findByEmail(email);

      if (user) {
        // Cache the existence (user will be cached by findByEmail)
        console.log(`📧 Email validation (found and cached): ${email}`);
      } else {
        // Cache negative result temporarily
        const negativeKey = `cache:email:negative:${normalizedEmail}`;
        await redisManager.setWithExpiry(negativeKey, "not_found", 300); // 5 minutes
        console.log(`📧 Email validation (not found): ${email}`);
      }
    } catch (error) {
      console.error(`Error processing email validation for ${email}:`, error);
      throw error;
    }
  }

  private async processGeneralCache(data: GeneralCacheJob): Promise<void> {
    const { operation, key, value, ttl, pattern } = data;

    try {
      switch (operation) {
        case "set":
          if (!key || value === undefined) {
            throw new Error("Key and value required for cache set operation");
          }
          await this.cacheService.set(key, value, { ttl });
          console.log(`💾 General cache set: ${key}`);
          break;

        case "delete":
          if (pattern) {
            await this.cacheService.deletePattern(pattern);
            console.log(`🗑️ General cache delete pattern: ${pattern}`);
          } else if (key) {
            await this.cacheService.delete(key);
            console.log(`🗑️ General cache delete: ${key}`);
          }
          break;

        case "clear":
          await this.cacheService.clear();
          console.log(`🧹 General cache cleared`);
          break;

        default:
          throw new Error(`Unknown cache operation: ${operation}`);
      }
    } catch (error) {
      console.error("Error processing general cache operation:", error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    this.worker.on("completed", (job) => {
      console.log(`✅ Job completed: ${job.name} (${job.id})`);
    });

    this.worker.on("failed", (job, err) => {
      console.error(`❌ Job failed: ${job?.name} (${job?.id}):`, err.message);
    });

    this.worker.on("error", (err) => {
      console.error("🚨 Worker error:", err);
    });

    this.worker.on("stalled", (jobId) => {
      console.warn(`⚠️ Job stalled: ${jobId}`);
    });

    console.log("🔧 Cache worker started with event handlers");
  }

  public async close(): Promise<void> {
    try {
      await this.worker.close();
      console.log("🔧 Cache worker closed");
    } catch (error) {
      console.error("Error closing cache worker:", error);
    }
  }

  public getWorker(): Worker {
    return this.worker;
  }
}

// Create and export the worker instance
export const cacheWorker = new CacheWorker();
