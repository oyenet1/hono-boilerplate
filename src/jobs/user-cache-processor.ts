import { Worker } from "bullmq";
import { redisManager } from "../config/redis";
import { container } from "../di/container";
import { UserService } from "../services/UserService";
import { CacheUserJob, InvalidateCacheJob, WarmCacheJob } from "./user-cache-queue";

// Get Redis connection details from environment
const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || "0"),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

// Initialize UserService
const userService = container.get(UserService);

// User cache processing functions
async function cacheUser(data: CacheUserJob) {
  const { email, userData, action } = data;
  
  try {
    const cacheKey = `user:email:${email.toLowerCase()}`;
    
    switch (action) {
      case 'CREATE':
      case 'UPDATE':
        // Cache user data by email
        await redisManager.setCache(cacheKey, userData, 24 * 60 * 60); // 24 hours TTL
        console.log(`✅ Cached user ${userData.id} with email ${email}`);
        
        // Also cache by userId for cross-reference
        const userIdKey = `user:id:${userData.id}`;
        await redisManager.setCache(userIdKey, userData, 24 * 60 * 60);
        
        // Create email->userId mapping
        const emailMappingKey = `email:mapping:${email.toLowerCase()}`;
        await redisManager.setCache(emailMappingKey, userData.id, 24 * 60 * 60);
        
        break;
        
      case 'DELETE':
        // Remove user from cache
        await redisManager.deleteCache(cacheKey);
        await redisManager.deleteCache(`user:id:${userData.id}`);
        await redisManager.deleteCache(`email:mapping:${email.toLowerCase()}`);
        console.log(`🗑️ Removed user ${userData.id} from cache`);
        break;
    }
    
    return { success: true, action, email };
  } catch (error) {
    console.error(`❌ Failed to cache user ${email}:`, error);
    throw error;
  }
}

async function invalidateCache(data: InvalidateCacheJob) {
  const { email, userId, pattern } = data;
  
  try {
    if (pattern) {
      // Bulk invalidation using pattern
      const client = redisManager.getClient();
      const keys = await client.keys(`cache:${pattern}`);
      
      if (keys.length > 0) {
        // Remove prefix from keys since deleteCache adds it
        const unprefixedKeys = keys.map(key => key.replace(/^cache:/, ''));
        await Promise.all(unprefixedKeys.map(key => redisManager.deleteCache(key)));
        console.log(`🧹 Invalidated ${keys.length} cache entries matching pattern: ${pattern}`);
      }
    } else if (email) {
      // Invalidate specific email cache
      const cacheKey = `user:email:${email.toLowerCase()}`;
      const mappingKey = `email:mapping:${email.toLowerCase()}`;
      
      await redisManager.deleteCache(cacheKey);
      await redisManager.deleteCache(mappingKey);
      console.log(`🗑️ Invalidated cache for email: ${email}`);
    } else if (userId) {
      // Invalidate specific user cache
      const userIdKey = `user:id:${userId}`;
      await redisManager.deleteCache(userIdKey);
      console.log(`🗑️ Invalidated cache for user ID: ${userId}`);
    }
    
    return { success: true, invalidated: email || userId || pattern };
  } catch (error) {
    console.error(`❌ Failed to invalidate cache:`, error);
    throw error;
  }
}

async function warmCache(data: WarmCacheJob) {
  const { emails, batchSize = 10 } = data;
  
  try {
    let processed = 0;
    const failed: string[] = [];
    
    // Process emails in batches
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (email) => {
        try {
          // Check if already cached
          const cacheKey = `user:email:${email.toLowerCase()}`;
          const cached = await redisManager.getCache(cacheKey);
          
          if (!cached) {
            // Fetch from database and cache
            const user = await userService.findByEmail(email);
            
            if (user) {
              const userData = {
                id: user.id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt.toISOString(),
                updatedAt: user.updatedAt.toISOString(),
              };
              
              await redisManager.setCache(cacheKey, userData, 24 * 60 * 60);
              console.log(`🔥 Warmed cache for: ${email}`);
              processed++;
            } else {
              failed.push(email);
            }
          } else {
            processed++;
          }
        } catch (error) {
          console.error(`Failed to warm cache for ${email}:`, error);
          failed.push(email);
        }
      });
      
      await Promise.all(batchPromises);
      
      // Small delay between batches to avoid overwhelming the system
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`🔥 Cache warming completed: ${processed} processed, ${failed.length} failed`);
    return { success: true, processed, failed };
  } catch (error) {
    console.error(`❌ Failed to warm cache:`, error);
    throw error;
  }
}

async function validateEmail(data: { email: string }) {
  const { email } = data;
  
  try {
    // First check cache
    const cacheKey = `user:email:${email.toLowerCase()}`;
    const cached = await redisManager.getCache(cacheKey);
    
    if (cached) {
      console.log(`✅ Email validation (cached): ${email} exists`);
      return { exists: true, source: 'cache', user: cached };
    }
    
    // Check database
    const user = await userService.findByEmail(email);
    
    if (user) {
      // Cache the user for future lookups
      const userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };
      
      await redisManager.setCache(cacheKey, userData, 24 * 60 * 60);
      console.log(`✅ Email validation (database): ${email} exists and cached`);
      return { exists: true, source: 'database', user: userData };
    }
    
    console.log(`❌ Email validation: ${email} does not exist`);
    return { exists: false, source: 'database' };
  } catch (error) {
    console.error(`❌ Failed to validate email ${email}:`, error);
    throw error;
  }
}

// User cache worker
const userCacheWorker = new Worker(
  "userCacheQueue",
  async (job) => {
    const { name, data } = job;
    
    console.log(`🔄 Processing user cache job: ${name} (ID: ${job.id})`);
    
    switch (name) {
      case "cacheUser":
        return await cacheUser(data as CacheUserJob);
      case "invalidateCache":
        return await invalidateCache(data as InvalidateCacheJob);
      case "warmCache":
        return await warmCache(data as WarmCacheJob);
      default:
        throw new Error(`Unknown job type: ${name}`);
    }
  },
  {
    connection: redisConnection,
    concurrency: 5, // Process 5 jobs simultaneously
    limiter: {
      max: 100,     // Max 100 jobs
      duration: 60000, // Per minute
    },
  }
);

// User validation worker
const userValidationWorker = new Worker(
  "userValidationQueue",
  async (job) => {
    const { data } = job;
    console.log(`📧 Processing email validation: ${data.email} (ID: ${job.id})`);
    return await validateEmail(data);
  },
  {
    connection: redisConnection,
    concurrency: 10, // Higher concurrency for fast validation
    limiter: {
      max: 200,     // Max 200 validations
      duration: 60000, // Per minute
    },
  }
);

// Event handlers for user cache worker
userCacheWorker.on("completed", (job, result) => {
  console.log(`✅ User cache job ${job.id} completed:`, result);
});

userCacheWorker.on("failed", (job, err) => {
  console.error(`❌ User cache job ${job?.id} failed:`, err.message);
});

userCacheWorker.on("error", (err) => {
  console.error("🔴 User cache worker error:", err);
});

userCacheWorker.on("ready", () => {
  console.log("🟢 User cache worker ready");
});

// Event handlers for validation worker
userValidationWorker.on("completed", (job, result) => {
  console.log(`✅ Email validation ${job.id} completed:`, result);
});

userValidationWorker.on("failed", (job, err) => {
  console.error(`❌ Email validation ${job?.id} failed:`, err.message);
});

userValidationWorker.on("error", (err) => {
  console.error("🔴 Email validation worker error:", err);
});

userValidationWorker.on("ready", () => {
  console.log("🟢 Email validation worker ready");
});

console.log("🚀 User cache workers started and ready to process jobs");

export { userCacheWorker, userValidationWorker };
