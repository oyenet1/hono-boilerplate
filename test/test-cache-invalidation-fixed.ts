#!/usr/bin/env bun

// Test the fixed cache invalidation
import { container } from "../src/di/container";
import { TYPES } from "../src/di/types";
import { CacheService } from "../src/services/CacheService";
import { redisManager } from "../src/config/redis";
import type { IUserService } from "../src/interfaces/IUserService";

async function testFixedCacheInvalidation() {
  console.log("🧪 Testing Fixed Cache Invalidation...\n");

  try {
    const cacheService = container.get<CacheService>(CacheService);

    // 1. Clear all cache first
    console.log("1️⃣ Clearing all cache...");
    await cacheService.clear();

    // 2. Set some test cache entries
    console.log("\n2️⃣ Setting test cache entries...");
    await cacheService.set(
      "users:page:1:limit:10",
      { data: "users_list" },
      { ttl: 300 }
    );
    await cacheService.set("user:123", { data: "user_data" }, { ttl: 300 });
    await cacheService.set(
      "user:email:test@example.com",
      { data: "user_by_email" },
      { ttl: 300 }
    );
    await cacheService.set(
      "posts:page:1:limit:10",
      { data: "posts_list" },
      { ttl: 300 }
    );
    await cacheService.set(
      "posts:user:123",
      { data: "user_posts" },
      { ttl: 300 }
    );

    // Check all keys exist
    const allKeys = await redisManager.keys("*");
    console.log(`   Total Redis keys: ${allKeys.length}`);
    console.log("   Keys:", allKeys);

    // 3. Test user cache invalidation (should clear ALL caches)
    console.log("\n3️⃣ Testing user cache invalidation...");
    await cacheService.invalidateUserCache("123");

    const keysAfterUserInvalidation = await redisManager.keys("*");
    console.log(
      `   Keys after user invalidation: ${keysAfterUserInvalidation.length}`
    );
    console.log("   Remaining keys:", keysAfterUserInvalidation);

    // 4. Set cache again and test post invalidation
    console.log("\n4️⃣ Setting cache again and testing post invalidation...");
    await cacheService.set(
      "users:page:1:limit:10",
      { data: "users_list_2" },
      { ttl: 300 }
    );
    await cacheService.set(
      "posts:page:1:limit:10",
      { data: "posts_list_2" },
      { ttl: 300 }
    );

    const keysBeforePostInvalidation = await redisManager.keys("*");
    console.log(
      `   Keys before post invalidation: ${keysBeforePostInvalidation.length}`
    );

    await cacheService.invalidatePostCache("123");

    const keysAfterPostInvalidation = await redisManager.keys("*");
    console.log(
      `   Keys after post invalidation: ${keysAfterPostInvalidation.length}`
    );
    console.log("   Remaining keys:", keysAfterPostInvalidation);

    // 5. Test the invalidateAllCaches method directly
    console.log("\n5️⃣ Testing invalidateAllCaches directly...");
    await cacheService.set("test:key1", { data: "test1" }, { ttl: 300 });
    await cacheService.set("test:key2", { data: "test2" }, { ttl: 300 });
    await cacheService.set(
      "session:abc123",
      { data: "session_data" },
      { ttl: 300 }
    );

    const keysBeforeInvalidateAll = await redisManager.keys("*");
    console.log(
      `   Keys before invalidateAllCaches: ${keysBeforeInvalidateAll.length}`
    );
    console.log("   Keys:", keysBeforeInvalidateAll);

    await cacheService.invalidateAllCaches();

    const keysAfterInvalidateAll = await redisManager.keys("*");
    console.log(
      `   Keys after invalidateAllCaches: ${keysAfterInvalidateAll.length}`
    );
    console.log(
      "   Remaining keys (should keep sessions):",
      keysAfterInvalidateAll
    );

    console.log("\n🎉 Cache invalidation tests completed!");
  } catch (error) {
    console.error("❌ Cache invalidation test failed:", error);
  }
}

testFixedCacheInvalidation();
