#!/usr/bin/env bun

// Comprehensive cache debugging test
import { CacheService } from "./src/services/CacheService";
import { redisManager } from "./src/config/redis";

async function testCacheDebug() {
  console.log("🔍 Starting comprehensive cache debugging...\n");

  try {
    // 1. Test Redis connection
    console.log("1️⃣ Testing Redis connection...");
    const isConnected = redisManager.isRedisConnected();
    console.log(`   Redis connected: ${isConnected}`);

    if (!isConnected) {
      console.log("   Attempting to connect...");
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for connection
      const newStatus = redisManager.isRedisConnected();
      console.log(`   Redis connected after wait: ${newStatus}`);
    }

    // 2. Test direct Redis operations
    console.log("\n2️⃣ Testing direct Redis operations...");
    const client = redisManager.getClient();

    await client.set("direct:test", "direct_value");
    const directResult = await client.get("direct:test");
    console.log(
      `   Direct Redis set/get: ${
        directResult === "direct_value" ? "✅" : "❌"
      }`
    );

    await client.del("direct:test");
    const deletedResult = await client.get("direct:test");
    console.log(
      `   Direct Redis delete: ${deletedResult === null ? "✅" : "❌"}`
    );

    // 3. Test RedisManager methods
    console.log("\n3️⃣ Testing RedisManager methods...");

    // Check if setWithExpiry method exists
    console.log(
      `   setWithExpiry method exists: ${
        typeof redisManager.setWithExpiry === "function" ? "✅" : "❌"
      }`
    );
    console.log(
      `   setWithExpiration method exists: ${
        typeof (redisManager as any).setWithExpiration === "function"
          ? "✅"
          : "❌"
      }`
    );
    console.log(
      `   del method exists: ${
        typeof redisManager.del === "function" ? "✅" : "❌"
      }`
    );
    console.log(
      `   delete method exists: ${
        typeof (redisManager as any).delete === "function" ? "✅" : "❌"
      }`
    );

    // Test available methods
    await redisManager.setWithExpiry("manager:test", "manager_value", 60);
    const managerResult = await redisManager.get("manager:test");
    console.log(
      `   RedisManager set/get: ${
        managerResult === "manager_value" ? "✅" : "❌"
      }`
    );

    await redisManager.del("manager:test");
    const managerDeleted = await redisManager.get("manager:test");
    console.log(
      `   RedisManager delete: ${managerDeleted === null ? "✅" : "❌"}`
    );

    // 4. Test CacheService
    console.log("\n4️⃣ Testing CacheService...");
    const cacheService = new CacheService();

    try {
      await cacheService.set(
        "cache:test",
        { message: "cache_value" },
        { ttl: 60 }
      );
      console.log("   CacheService set: ✅");
    } catch (error) {
      console.log(`   CacheService set: ❌ - ${error.message}`);
    }

    try {
      const cacheResult = await cacheService.get<{ message: string }>(
        "cache:test"
      );
      console.log(
        `   CacheService get: ${
          cacheResult?.message === "cache_value" ? "✅" : "❌"
        }`
      );
    } catch (error) {
      console.log(`   CacheService get: ❌ - ${error.message}`);
    }

    try {
      await cacheService.delete("cache:test");
      console.log("   CacheService delete: ✅");
    } catch (error) {
      console.log(`   CacheService delete: ❌ - ${error.message}`);
    }

    // 5. Test remember pattern
    console.log("\n5️⃣ Testing remember pattern...");
    let callCount = 0;

    const testCallback = async () => {
      callCount++;
      return { data: "callback_result", timestamp: Date.now() };
    };

    // First call - should execute callback
    const result1 = await cacheService.remember("remember:test", testCallback, {
      ttl: 10,
    });
    console.log(
      `   First call executed callback: ${callCount === 1 ? "✅" : "❌"}`
    );

    // Second call - should use cache
    const result2 = await cacheService.remember("remember:test", testCallback, {
      ttl: 10,
    });
    console.log(`   Second call used cache: ${callCount === 1 ? "✅" : "❌"}`);
    console.log(
      `   Results match: ${result1.data === result2.data ? "✅" : "❌"}`
    );

    // 6. Test cache keys
    console.log("\n6️⃣ Testing cache key patterns...");
    const allKeys = await redisManager.keys("*");
    console.log(`   Total Redis keys: ${allKeys.length}`);

    if (allKeys.length > 0) {
      console.log("   Sample keys:");
      allKeys.slice(0, 5).forEach((key) => console.log(`     - ${key}`));
    }

    // Clean up test keys
    await cacheService.deletePattern("cache:*");
    await cacheService.deletePattern("remember:*");

    console.log("\n🎉 Cache debugging complete!");
  } catch (error) {
    console.error("❌ Cache debugging failed:", error);
  }
}

testCacheDebug();
