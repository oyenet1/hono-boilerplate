import Redis from "ioredis";
import { stringifyAsync, parseAsync, safeParse } from "../utils/asyncJson";

// Enhanced Redis configuration for high-scale production
const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || "0"),
  keyPrefix: process.env.REDIS_KEY_PREFIX || "hono:",

  // Connection pooling and performance optimizations
  lazyConnect: true, // Don't connect immediately
  keepAlive: 30000, // Keep connections alive
  maxRetriesPerRequest: null, // Don't limit retries per request
  retryDelayOnFailover: 100, // Fast failover
  enableAutoPipelining: true, // Auto-batch commands for performance

  // Timeouts optimized for high traffic
  commandTimeout: 2000, // Reduced from 5000ms
  connectTimeout: 5000, // Reduced from 10000ms
  disconnectTimeout: 2000,

  // Connection management
  family: 4, // IPv4
  maxListeners: 0, // No limit on event listeners

  // Performance tuning
  enableReadyCheck: true,
  maxLoadingTimeout: 5000,

  // Queue management (different for dev vs prod)
  enableOfflineQueue: process.env.NODE_ENV !== "production",
};

class RedisManager {
  private static instance: RedisManager;
  private client: Redis;
  private isConnected: boolean = false;

  private constructor() {
    this.client = new Redis(redisConfig);
    this.setupEventHandlers();
    // Try to connect immediately
    this.connect();
  }

  public static getInstance(): RedisManager {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
    }
    return RedisManager.instance;
  }

  private async connect(): Promise<void> {
    try {
      await this.client.ping();
      this.isConnected = true;
      console.log("Redis connected successfully");
    } catch (error) {
      console.error("Redis connection failed:", error);
      this.isConnected = false;
    }
  }

  private setupEventHandlers(): void {
    this.client.on("connect", () => {
      console.log("Redis connected successfully");
      this.isConnected = true;
    });

    this.client.on("error", (error) => {
      console.error("Redis connection error:", error);
      this.isConnected = false;
    });

    this.client.on("close", () => {
      console.log("Redis connection closed");
      this.isConnected = false;
    });

    this.client.on("reconnecting", () => {
      console.log("Redis reconnecting...");
    });
  }

  public getClient(): Redis {
    return this.client;
  }

  public isRedisConnected(): boolean {
    return this.isConnected;
  }

  public async disconnect(): Promise<void> {
    await this.client.disconnect();
  }

  // Session management methods
  public async setSession(
    sessionId: string,
    data: any,
    ttlSeconds: number = 3600
  ): Promise<void> {
    try {
      const serializedData = await stringifyAsync(data);
      await this.client.setex(
        `session:${sessionId}`,
        ttlSeconds,
        serializedData
      );
    } catch (error) {
      console.error("Error setting session:", error);
      throw error;
    }
  }

  public async getSession(sessionId: string): Promise<any | null> {
    try {
      const data = await this.client.get(`session:${sessionId}`);
      return data ? await parseAsync(data) : null;
    } catch (error) {
      console.error("Error getting session:", error);
      return null;
    }
  }

  public async delSession(sessionId: string): Promise<void> {
    try {
      await this.client.del(`session:${sessionId}`);
    } catch (error) {
      console.error("Error deleting session:", error);
      throw error;
    }
  }

  // Set operations for session management
  public async sadd(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.client.sadd(key, ...members);
    } catch (error) {
      console.error(`Error adding to set ${key}:`, error);
      throw error;
    }
  }

  public async smembers(key: string): Promise<string[]> {
    try {
      return await this.client.smembers(key);
    } catch (error) {
      console.error(`Error getting set members ${key}:`, error);
      return [];
    }
  }

  public async srem(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.client.srem(key, ...members);
    } catch (error) {
      console.error(`Error removing from set ${key}:`, error);
      throw error;
    }
  }

  public async expire(key: string, seconds: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, seconds);
      return result === 1;
    } catch (error) {
      console.error(`Error setting expiry for key ${key}:`, error);
      throw error;
    }
  }

  // Generic methods
  public async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      console.error(`Error getting key ${key}:`, error);
      return null;
    }
  }

  public async setWithExpiry(
    key: string,
    value: string,
    ttlSeconds: number
  ): Promise<void> {
    try {
      await this.client.setex(key, ttlSeconds, value);
    } catch (error) {
      console.error(`Error setting key ${key} with expiry:`, error);
      throw error;
    }
  }

  public async del(key: string | string[]): Promise<void> {
    try {
      if (Array.isArray(key)) {
        await this.client.del(...key);
      } else {
        await this.client.del(key);
      }
    } catch (error) {
      console.error(`Error deleting key(s) ${key}:`, error);
      throw error;
    }
  }

  public async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      console.error(`Error getting keys for pattern ${pattern}:`, error);
      return [];
    }
  }

  // Rate limiting methods
  public async incrementRateLimit(
    key: string,
    windowSeconds: number,
    limit: number
  ): Promise<{ count: number; resetTime: number; allowed: boolean }> {
    try {
      const pipeline = this.client.pipeline();
      const now = Date.now();
      const window = Math.floor(now / (windowSeconds * 1000));
      const rateLimitKey = `rate_limit:${key}:${window}`;

      pipeline.incr(rateLimitKey);
      pipeline.expire(rateLimitKey, windowSeconds);

      const results = await pipeline.exec();
      const count = (results?.[0]?.[1] as number) || 0;
      const resetTime = (window + 1) * windowSeconds * 1000;

      return {
        count,
        resetTime,
        allowed: count <= limit,
      };
    } catch (error) {
      console.error("Error checking rate limit:", error);
      return {
        count: 0,
        resetTime: Date.now() + windowSeconds * 1000,
        allowed: true,
      };
    }
  }

  // Cache methods
  public async setCache(
    key: string,
    value: any,
    ttlSeconds: number = 300
  ): Promise<void> {
    try {
      const serializedValue = await stringifyAsync(value);
      await this.client.setex(`cache:${key}`, ttlSeconds, serializedValue);
    } catch (error) {
      console.error("Error setting cache:", error);
      throw error;
    }
  }

  public async getCache(key: string): Promise<any | null> {
    try {
      const data = await this.client.get(`cache:${key}`);
      return data ? await parseAsync(data) : null;
    } catch (error) {
      console.error("Error getting cache:", error);
      return null;
    }
  }

  public async deleteCache(key: string): Promise<void> {
    try {
      await this.client.del(`cache:${key}`);
    } catch (error) {
      console.error("Error deleting cache:", error);
      throw error;
    }
  }
}

export const redisManager = RedisManager.getInstance();
export { Redis };
