import { Queue, Worker, Job } from "bullmq";
import { redisManager } from "../config/redis";

// General job interfaces for the whole app
export interface CacheOperationJob {
  type: "cacheOperation";
  itemId: string;
  itemKey: string;
  itemData: {
    id: string;
    data: any;
    type: string;
    createdAt: string;
    updatedAt: string;
  };
  itemType: string; // 'user', 'post', 'product', etc.
  action: "CREATE" | "UPDATE" | "DELETE";
}

export interface InvalidateJob {
  type: "invalidate";
  itemId?: string;
  itemKey?: string;
  itemType?: string;
  pattern?: string;
}

export interface WarmupJob {
  type: "warmup";
  keys: string[];
  itemType: string;
  batchSize: number;
}

export interface ValidationJob {
  type: "validate";
  itemKey: string;
  itemType: string;
}

export interface GeneralJob {
  type: "general";
  operation: "set" | "delete" | "clear";
  key?: string;
  value?: any;
  ttl?: number;
  pattern?: string;
}

// Union type for all job types
export type JobData =
  | CacheOperationJob
  | InvalidateJob
  | WarmupJob
  | ValidationJob
  | GeneralJob;

// Redis connection configuration
const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // BullMQ requirement
  retryDelayOnFailover: 100,
};

// Create the main app queue
export const appQueue = new Queue("app-operations", {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  },
});

// Queue functions for different job types
export async function queueCacheOperation(
  jobData: Omit<CacheOperationJob, "type">
): Promise<void> {
  try {
    await appQueue.add(
      "cacheOperation",
      {
        type: "cacheOperation",
        ...jobData,
      },
      {
        priority: jobData.action === "DELETE" ? 10 : 5, // Higher priority for deletions
        delay: 0,
      }
    );

    console.log(
      `📤 Queued ${jobData.itemType} cache job: ${jobData.action} for ${jobData.itemKey}`
    );
  } catch (error) {
    console.error("Error queueing cache operation job:", error);
    throw error;
  }
}

export async function queueValidation(
  jobData: Omit<ValidationJob, "type">
): Promise<void> {
  try {
    await appQueue.add(
      "validate",
      {
        type: "validate",
        ...jobData,
      },
      {
        priority: 8, // High priority for validation operations
      }
    );

    console.log(`📤 Queued ${jobData.itemType} validation: ${jobData.itemKey}`);
  } catch (error) {
    console.error("Error queueing validation:", error);
    throw error;
  }
}

export async function queueInvalidation(
  jobData: Omit<InvalidateJob, "type">
): Promise<void> {
  try {
    await appQueue.add(
      "invalidate",
      {
        type: "invalidate",
        ...jobData,
      },
      {
        priority: 10, // Highest priority for cache invalidation
      }
    );

    console.log(`📤 Queued cache invalidation`);
  } catch (error) {
    console.error("Error queueing cache invalidation:", error);
    throw error;
  }
}

export async function queueWarmup(
  jobData: Omit<WarmupJob, "type">
): Promise<void> {
  try {
    await appQueue.add(
      "warmup",
      {
        type: "warmup",
        ...jobData,
      },
      {
        priority: 1, // Low priority for warming
        delay: 1000, // Small delay to let other operations complete
      }
    );

    console.log(
      `📤 Queued cache warming for ${jobData.keys.length} ${jobData.itemType} items`
    );
  } catch (error) {
    console.error("Error queueing cache warming:", error);
    throw error;
  }
}

export async function queueGeneral(
  jobData: Omit<GeneralJob, "type">
): Promise<void> {
  try {
    await appQueue.add(
      "general",
      {
        type: "general",
        ...jobData,
      },
      {
        priority: jobData.operation === "delete" ? 8 : 3,
      }
    );

    console.log(`📤 Queued general operation: ${jobData.operation}`);
  } catch (error) {
    console.error("Error queueing general operation:", error);
    throw error;
  }
}

// Queue statistics
export async function getAppQueueStats(): Promise<{
  appOperations: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    total: number;
  };
} | null> {
  try {
    const [waiting, active, completed, failed] = await Promise.all([
      appQueue.getWaiting(),
      appQueue.getActive(),
      appQueue.getCompleted(),
      appQueue.getFailed(),
    ]);

    const stats = {
      appOperations: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        total:
          waiting.length + active.length + completed.length + failed.length,
      },
    };

    return stats;
  } catch (error) {
    console.error("Error getting app queue stats:", error);
    return null;
  }
}

// Graceful shutdown
export async function closeAppQueue(): Promise<void> {
  try {
    await appQueue.close();
    console.log("📤 App queue closed");
  } catch (error) {
    console.error("Error closing app queue:", error);
  }
}
