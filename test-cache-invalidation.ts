#!/usr/bin/env bun

// Test cache invalidation specifically
import { container } from "./src/di/container";
import { TYPES } from "./src/di/types";
import { CacheService } from "./src/services/CacheService";
import { UserService } from "./src/services/UserService";
import { redisManager } from "./src/config/redis";
import type { IUserService } from "./src/interfaces/IUserService";

async function testCacheInvalidation() {
  console.log("🧪 Testing Cache Invalidation...\n");

  try {
    // Get services from container
    const cacheService = container.get<CacheService>(CacheService);
    const userService = container.get<IUserService>(TYPES.UserService);

    // 1. Clear all cache first
    console.log("1️⃣ Clearing all cache...");
    await cacheService.clear();

    // 2. Test basic cache operations
    console.log("\n2️⃣ Testing basic cache operations...");
    await cacheService.set("test:key", { data: "test" }, { ttl: 60 });
    const cached = await cacheService.get("test:key");
    console.log(`   Basic cache set/get: ${cached ? "✅" : "❌"}`);

    // 3. Test cache key patterns
    console.log("\n3️⃣ Testing cache key patterns...");

    // Set some test cache entries
    await cacheService.set(
      "users:page:1:limit:10:search::sort:",
      { data: "users_list" },
      { ttl: 60 }
    );
    await cacheService.set("user:test123", { data: "user_data" }, { ttl: 60 });
    await cacheService.set(
      "user:email:test@example.com",
      { data: "user_by_email" },
      { ttl: 60 }
    );

    // Check all keys exist
    const allKeys = await redisManager.keys("*");
    console.log(`   Total Redis keys before invalidation: ${allKeys.length}`);
    console.log("   Keys:", allKeys);

    // 4. Test invalidation
    console.log("\n4️⃣ Testing cache invalidation...");
    await cacheService.invalidateUserCache("test123");

    const keysAfterInvalidation = await redisManager.keys("*");
    console.log(
      `   Total Redis keys after invalidation: ${keysAfterInvalidation.length}`
    );
    console.log("   Remaining keys:", keysAfterInvalidation);

    // 5. Test specific invalidation patterns
    console.log("\n5️⃣ Testing invalidation patterns...");

    // Test pattern deletion directly
    const client = redisManager.getClient();

    // Set test keys with known patterns
    await client.set("users:test1", "value1");
    await client.set("users:test2", "value2");
    await client.set("user:123", "value3");
    await client.set("other:key", "value4");

    console.log("   Before pattern delete:");
    const beforePattern = await client.keys("*");
    console.log("   Keys:", beforePattern);

    // Delete users:* pattern
    const usersKeys = await client.keys("users:*");
    if (usersKeys.length > 0) {
      await client.del(...usersKeys);
    }

    console.log("   After deleting users:* pattern:");
    const afterPattern = await client.keys("*");
    console.log("   Keys:", afterPattern);

    // 6. Test real user service cache
    console.log("\n6️⃣ Testing real UserService cache...");

    try {
      // This will try to call the database - may fail if no DB connection
      console.log(
        "   Attempting to test real user service (may fail without DB)..."
      );
      const users = await userService.getAllUsers({ page: 1, limit: 5 });
      console.log(`   Users retrieved: ${users.data.length}`);

      // Check if cache was created
      const usersCacheKeys = await redisManager.keys("users:*");
      console.log(`   Users cache keys created: ${usersCacheKeys.length}`);
    } catch (error) {
      console.log(
        `   UserService test failed (expected without DB): ${error.message}`
      );
    }

    // Cleanup
    await cacheService.clear();
    console.log("\n🎉 Cache invalidation tests completed!");
  } catch (error) {
    console.error("❌ Cache invalidation test failed:", error);
  }
}

testCacheInvalidation();
