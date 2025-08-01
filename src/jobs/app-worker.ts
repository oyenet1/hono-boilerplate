import { Worker, Job } from "bullmq";
import { container } from "../di/container";
import { UserService } from "../services/UserService";
import { PostService } from "../services/PostService";
import { UniversalCacheService } from "../services/UniversalCacheService";
import { redisManager } from "../config/redis";
import type {
  JobData,
  CacheOperationJob,
  InvalidateJob,
  WarmupJob,
  ValidationJob,
  GeneralJob,
} from "./app-queue";

// Redis connection configuration
const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // BullMQ requirement
  retryDelayOnFailover: 100,
};

// Worker class for better organization
export class AppWorker {
  private worker: Worker;
  private userService: UserService;
  private postService: PostService;
  private cacheService: UniversalCacheService;

  constructor() {
    this.userService = container.get(UserService);
    this.postService = container.get(PostService);
    this.cacheService = container.get(UniversalCacheService);

    this.worker = new Worker("app-operations", this.processJob.bind(this), {
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
        case "cacheOperation":
          await this.processCacheOperation(data);
          break;
        case "invalidate":
          await this.processInvalidate(data);
          break;
        case "warmup":
          await this.processWarmup(data);
          break;
        case "validate":
          await this.processValidate(data);
          break;
        case "general":
          await this.processGeneral(data);
          break;
        default:
          throw new Error(`Unknown job type: ${(data as any).type}`);
      }
    } catch (error) {
      console.error(`❌ Failed job: ${data.type} (${job.id}):`, error);
      throw error;
    }
  }

  private async processCacheOperation(data: CacheOperationJob): Promise<void> {
    const { itemId, itemKey, itemData, itemType, action } = data;

    try {
      if (action === "DELETE") {
        // Remove from cache
        const keys = this.generateCacheKeys(itemKey, itemId, itemType);
        const keysToDelete = Object.values(keys).filter(Boolean) as string[];

        await Promise.all(keysToDelete.map((key) => redisManager.del(key)));

        console.log(`🗑️ Removed ${itemType} from cache: ${itemKey}`);
      } else {
        // Cache item data
        const keys = this.generateCacheKeys(itemKey, itemId, itemType);
        const ttl = 30 * 60; // 30 minutes

        // Cache by key (email, slug, etc.)
        if (keys.keyBased) {
          await redisManager.setWithExpiry(
            keys.keyBased,
            JSON.stringify(itemData),
            ttl
          );
        }

        // Cache by ID
        if (keys.idBased) {
          await redisManager.setWithExpiry(
            keys.idBased,
            JSON.stringify(itemData),
            ttl
          );
        }

        // Cache mapping
        if (keys.mapping) {
          await redisManager.setWithExpiry(keys.mapping, itemId, ttl);
        }

        console.log(`💾 Cached ${itemType}: ${itemKey} (${action})`);
      }
    } catch (error) {
      console.error(
        `Error processing cache operation for ${itemType} ${itemKey}:`,
        error
      );
      throw error;
    }
  }

  private async processInvalidate(data: InvalidateJob): Promise<void> {
    const { itemId, itemKey, itemType, pattern } = data;

    try {
      if (pattern) {
        // Bulk invalidation using pattern
        await this.cacheService.deletePattern(pattern);
        console.log(`🗑️ Invalidated cache pattern: ${pattern}`);
      } else if (itemId || itemKey) {
        // Specific item invalidation
        if (itemKey && itemType) {
          const keys = this.generateCacheKeys(itemKey, itemId, itemType);
          await Promise.all(
            Object.values(keys)
              .filter(Boolean)
              .map((key) => redisManager.del(key!))
          );
        }

        console.log(`🗑️ Invalidated ${itemType} cache: ${itemKey || itemId}`);
      }
    } catch (error) {
      console.error("Error processing cache invalidation:", error);
      throw error;
    }
  }

  private async processWarmup(data: WarmupJob): Promise<void> {
    const { keys, itemType, batchSize } = data;

    try {
      // Process items in batches
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (key) => {
            try {
              await this.warmupItem(key, itemType);
              console.log(`🔥 Warmed cache for ${itemType}: ${key}`);
            } catch (error) {
              console.error(
                `Error warming cache for ${itemType} ${key}:`,
                error
              );
            }
          })
        );

        // Small delay between batches to prevent overwhelming
        if (i + batchSize < keys.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      console.log(
        `🔥 Cache warming completed for ${keys.length} ${itemType} items`
      );
    } catch (error) {
      console.error("Error processing cache warming:", error);
      throw error;
    }
  }

  private async processValidate(data: ValidationJob): Promise<void> {
    const { itemKey, itemType } = data;

    try {
      const cacheKey = `cache:${itemType}:${itemKey}`;

      // Check if already cached
      const cached = await redisManager.getCache(cacheKey);
      if (cached) {
        console.log(`📧 ${itemType} validation (already cached): ${itemKey}`);
        return;
      }

      // Check database and cache result
      const item = await this.findItem(itemKey, itemType);

      if (item) {
        // Cache the item
        console.log(`📧 ${itemType} validation (found and cached): ${itemKey}`);
      } else {
        // Cache negative result temporarily
        const negativeKey = `cache:${itemType}:negative:${itemKey}`;
        await redisManager.setWithExpiry(negativeKey, "not_found", 300); // 5 minutes
        console.log(`📧 ${itemType} validation (not found): ${itemKey}`);
      }
    } catch (error) {
      console.error(
        `Error processing ${itemType} validation for ${itemKey}:`,
        error
      );
      throw error;
    }
  }

  private async processGeneral(data: GeneralJob): Promise<void> {
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

  private generateCacheKeys(
    itemKey: string,
    itemId?: string,
    itemType?: string
  ): {
    keyBased?: string;
    idBased?: string;
    mapping?: string;
  } {
    const normalizedKey = itemKey.toLowerCase();
    const keys: any = {};

    if (itemType) {
      keys.keyBased = `cache:${itemType}:${normalizedKey}`;
      if (itemId) {
        keys.idBased = `cache:${itemType}:id:${itemId}`;
        keys.mapping = `cache:${itemType}:mapping:${normalizedKey}`;
      }
    }

    return keys;
  }

  private async warmupItem(key: string, itemType: string): Promise<void> {
    try {
      const item = await this.findItem(key, itemType);
      if (item) {
        // Item will be cached by the find method
        return;
      }
    } catch (error) {
      console.error(`Error warming up ${itemType} ${key}:`, error);
    }
  }

  private async findItem(key: string, itemType: string): Promise<any> {
    try {
      switch (itemType) {
        case "user":
          // Try to find by email first, then by ID
          if (key.includes("@")) {
            return await this.userService.findByEmail(key);
          } else {
            return await this.userService.findById(key);
          }
        case "post":
          return await this.postService.findById(key);
        default:
          console.warn(`Unknown item type for finding: ${itemType}`);
          return null;
      }
    } catch (error) {
      console.error(`Error finding ${itemType} ${key}:`, error);
      return null;
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

    console.log("🔧 App worker started with event handlers");
  }

  public async close(): Promise<void> {
    try {
      await this.worker.close();
      console.log("🔧 App worker closed");
    } catch (error) {
      console.error("Error closing app worker:", error);
    }
  }

  public getWorker(): Worker {
    return this.worker;
  }
}

// Create and export the worker instance
export const appWorker = new AppWorker();
