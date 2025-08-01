#!/usr/bin/env bun

// Simple Redis connection and basic operations test
import { CacheService } from "../src/services/CacheService";
import { redisManager } from "../src/config/redis";

async function testRedisBasic() {
  console.log("🔄 Testing Redis basic operations...\n");

  try {
    const cacheService = new CacheService();

    // 1. Test Redis connection
    console.log("1️⃣ Testing Redis connection...");
    const isConnected = redisManager.isRedisConnected();
    console.log(`   Redis connected: ${isConnected ? "✅" : "❌"}`);

    if (!isConnected) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // 2. Test basic operations
    console.log("\n2️⃣ Testing basic cache operations...");

    await cacheService.set(
      "test:basic",
      { message: "Hello Redis!" },
      { ttl: 60 }
    );
    console.log("   ✅ Cache set successful");

    const cached = await cacheService.get("test:basic");
    console.log(`   ✅ Cache get result: ${cached ? "✅" : "❌"}`);
    console.log("   Cached data:", cached);

    await cacheService.delete("test:basic");
    console.log("   ✅ Cache delete successful");

    const deletedResult = await cacheService.get("test:basic");
    console.log(
      `   ✅ Deleted cache result (should be null): ${
        deletedResult === null ? "✅" : "❌"
      }`
    );

    // 3. Test with different data types
    console.log("\n3️⃣ Testing different data types...");

    await cacheService.set("test:string", "simple string", { ttl: 60 });
    await cacheService.set("test:number", 42, { ttl: 60 });
    await cacheService.set("test:array", [1, 2, 3], { ttl: 60 });
    await cacheService.set(
      "test:object",
      { id: 1, name: "Test User" },
      { ttl: 60 }
    );

    const stringResult = await cacheService.get("test:string");
    const numberResult = await cacheService.get("test:number");
    const arrayResult = await cacheService.get("test:array");
    const objectResult = await cacheService.get("test:object");

    console.log(`   String: ${stringResult === "simple string" ? "✅" : "❌"}`);
    console.log(`   Number: ${numberResult === 42 ? "✅" : "❌"}`);
    console.log(
      `   Array: ${
        Array.isArray(arrayResult) && arrayResult.length === 3 ? "✅" : "❌"
      }`
    );
    console.log(
      `   Object: ${
        objectResult && objectResult.name === "Test User" ? "✅" : "❌"
      }`
    );

    // 4. Test keys
    console.log("\n4️⃣ Testing Redis keys...");
    const allKeys = await redisManager.keys("*");
    console.log(`   Total keys: ${allKeys.length}`);
    console.log("   Keys:", allKeys);

    // Cleanup
    await cacheService.deletePattern("test:*");
    console.log("   ✅ Cleanup completed");

    console.log("\n🎉 Redis basic tests passed!");
  } catch (error) {
    console.error("❌ Redis test failed:", error);
  }
}

testRedisBasic();
