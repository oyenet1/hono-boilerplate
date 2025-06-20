#!/usr/bin/env bun

// Simple Redis connection test
import { redisManager } from "./src/config/redis";

async function testRedis() {
  console.log("🔧 Testing Redis connection...");

  try {
    // Test basic connection
    const isConnected = redisManager.isRedisConnected();
    console.log(
      `📊 Redis connection status: ${
        isConnected ? "connected" : "disconnected"
      }`
    );

    // Test ping
    const client = redisManager.getClient();
    const pingResult = await client.ping();
    console.log(`🏓 Redis ping result: ${pingResult}`);

    // Test set/get
    await redisManager.setCache("test_key", { message: "Hello Redis!" }, 10);
    console.log("✅ Successfully set test cache");

    const testData = await redisManager.getCache("test_key");
    console.log(`📝 Retrieved from cache:`, testData);

    // Clean up
    await redisManager.deleteCache("test_key");
    console.log("🧹 Cleaned up test cache");

    console.log("✅ Redis connection test completed successfully!");
  } catch (error) {
    console.error("❌ Redis connection test failed:", error);
  } finally {
    await redisManager.disconnect();
    process.exit(0);
  }
}

testRedis();
