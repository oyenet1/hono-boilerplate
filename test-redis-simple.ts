#!/usr/bin/env bun

// Test Redis connection and basic operations
import { CacheService } from "./src/services/CacheService";

async function testRedis() {
  const cacheService = new CacheService();

  try {
    console.log("🔄 Testing Redis connection...");

    // Test basic set/get
    await cacheService.set("test:key", { message: "Hello Redis" });
    console.log("✅ Cache set successful");

    const cached = await cacheService.get("test:key");
    console.log("✅ Cache get result:", cached);

    // Test cache deletion
    await cacheService.delete("test:key");
    console.log("✅ Cache delete successful");

    const deletedResult = await cacheService.get("test:key");
    console.log("✅ Deleted cache result (should be null):", deletedResult);

    console.log("🎉 Redis tests passed!");
  } catch (error) {
    console.error("❌ Redis test failed:", error);
  }
}

testRedis();
