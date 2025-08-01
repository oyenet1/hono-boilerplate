import { Queue } from "bullmq";
import { redisManager } from "../config/redis";

// Get Redis connection details from environment
const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || "0"),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

// User cache job interfaces
export interface CacheUserJob {
  userId: string;
  email: string;
  userData: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
    updatedAt: string;
  };
  action: 'CREATE' | 'UPDATE' | 'DELETE';
}

export interface InvalidateCacheJob {
  email?: string;
  userId?: string;
  pattern?: string; // For bulk invalidation
}

export interface WarmCacheJob {
  emails: string[];
  batchSize?: number;
}

// User cache queue configuration
const userCacheQueue = new Queue("userCacheQueue", {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 500,  // Keep more completed jobs for monitoring
    removeOnFail: 100,      // Keep failed jobs for debugging
    attempts: 3,            // Retry failed jobs
    backoff: {
      type: "exponential",
      delay: 2000,          // Start with 2 second delay
    },
    delay: 0,               // No initial delay
    priority: 0,            // Default priority
  },
});

// User validation queue (for email existence checks)
const userValidationQueue = new Queue("userValidationQueue", {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 200,
    removeOnFail: 50,
    attempts: 2,
    backoff: {
      type: "fixed",
      delay: 1000,
    },
    priority: 10,           // Higher priority for validation
  },
});

export const queueUserCache = async (data: CacheUserJob) => {
  try {
    const priority = data.action === 'CREATE' ? 5 : 0; // Higher priority for new users
    
    await userCacheQueue.add("cacheUser", data, {
      priority,
      jobId: `cache-${data.action.toLowerCase()}-${data.userId}`, // Prevent duplicates
    });
    
    console.log(`📝 Queued user cache job: ${data.action} for ${data.email}`);
  } catch (error) {
    console.error("Failed to queue user cache job:", error);
    throw error;
  }
};

// Queue cache invalidation
export const queueCacheInvalidation = async (data: InvalidateCacheJob) => {
  try {
    await userCacheQueue.add("invalidateCache", data, {
      priority: 8, // High priority for invalidation
    });
    
    console.log(`🗑️ Queued cache invalidation:`, data);
  } catch (error) {
    console.error("Failed to queue cache invalidation:", error);
    throw error;
  }
};

// Queue email validation check
export const queueEmailValidation = async (email: string) => {
  try {
    const jobId = `validate-${email}-${Date.now()}`;
    
    await userValidationQueue.add("validateEmail", { email }, {
      jobId,
      priority: 10,
    });
    
    console.log(`✉️ Queued email validation for: ${email}`);
    return jobId;
  } catch (error) {
    console.error("Failed to queue email validation:", error);
    throw error;
  }
};

// Queue cache warming (bulk operations)
export const queueCacheWarming = async (data: WarmCacheJob) => {
  try {
    await userCacheQueue.add("warmCache", data, {
      priority: 1, // Lower priority for warming
    });
    
    console.log(`🔥 Queued cache warming for ${data.emails.length} users`);
  } catch (error) {
    console.error("Failed to queue cache warming:", error);
    throw error;
  }
};

// Bulk user caching (for multiple users)
export const queueBulkUserCache = async (users: CacheUserJob[]) => {
  try {
    const jobs = users.map(user => ({
      name: "cacheUser",
      data: user,
      opts: {
        priority: user.action === 'CREATE' ? 5 : 0,
        jobId: `cache-${user.action.toLowerCase()}-${user.userId}`,
      }
    }));
    
    await userCacheQueue.addBulk(jobs);
    
    console.log(`📦 Queued bulk cache jobs for ${users.length} users`);
  } catch (error) {
    console.error("Failed to queue bulk user cache jobs:", error);
    throw error;
  }
};

// Get queue statistics
export const getUserCacheQueueStats = async () => {
  try {
    const waiting = await userCacheQueue.getWaiting();
    const active = await userCacheQueue.getActive();
    const completed = await userCacheQueue.getCompleted();
    const failed = await userCacheQueue.getFailed();
    
    return {
      userCache: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        total: waiting.length + active.length,
      },
    };
  } catch (error) {
    console.error("Failed to get queue stats:", error);
    return null;
  }
};

// Get validation queue statistics
export const getValidationQueueStats = async () => {
  try {
    const waiting = await userValidationQueue.getWaiting();
    const active = await userValidationQueue.getActive();
    const completed = await userValidationQueue.getCompleted();
    const failed = await userValidationQueue.getFailed();
    
    return {
      validation: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        total: waiting.length + active.length,
      },
    };
  } catch (error) {
    console.error("Failed to get validation queue stats:", error);
    return null;
  }
};

// Clean up old jobs
export const cleanupUserCacheJobs = async () => {
  try {
    // Keep completed jobs for 2 hours, failed jobs for 24 hours
    await userCacheQueue.clean(2 * 60 * 60 * 1000, 100, "completed");
    await userCacheQueue.clean(24 * 60 * 60 * 1000, 50, "failed");
    
    await userValidationQueue.clean(1 * 60 * 60 * 1000, 50, "completed");
    await userValidationQueue.clean(12 * 60 * 60 * 1000, 25, "failed");
    
    console.log("🧹 User cache queues cleaned up");
  } catch (error) {
    console.error("Failed to cleanup user cache queues:", error);
  }
};

export { userCacheQueue, userValidationQueue };
