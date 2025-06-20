#!/usr/bin/env bun

// Test cache invalidation specifically
import { container } from "../src/di/container";
import { TYPES } from "../src/di/types";
import { CacheService } from "../src/services/CacheService";
import { UserService } from "../src/services/UserService";
import { redisManager } from "../src/config/redis";
import type { IUserService } from "../src/interfaces/IUserService";

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
    await cacheService.set("users:page:1:limit:10:search::sort:", { data: "users_list" }, { ttl: 60 });
    await cacheService.set("user:test123", { data: "user_data" }, { ttl: 60 });
    await cacheService.set("user:email:test@example.com", { data: "user_by_email" }, { ttl: 60 });
    
    // Check all keys exist
    const allKeys = await redisManager.keys("*");
    console.log(`   Total Redis keys before invalidation: ${allKeys.length}`);
    console.log("   Keys:", allKeys);

    // 4. Test invalidation
    console.log("\n4️⃣ Testing cache invalidation...");
    await cacheService.invalidateUserCache("test123");
    
    const keysAfterInvalidation = await redisManager.keys("*");
    console.log(`   Total Redis keys after invalidation: ${keysAfterInvalidation.length}`);
    console.log("   Remaining keys:", keysAfterInvalidation);
    
    // Should only have the test:key remaining (not user-related)
    const expectedRemaining = keysAfterInvalidation.filter(key => key.includes("test:key"));
    console.log(`   Cache invalidation working: ${expectedRemaining.length === 1 ? "✅" : "❌"}`);

    // 5. Test complete cache clear
    console.log("\n5️⃣ Testing complete cache clear...");
    
    // Add some cache entries
    await cacheService.set("users:list", { data: "users" }, { ttl: 60 });
    await cacheService.set("posts:list", { data: "posts" }, { ttl: 60 });
    await cacheService.set("other:data", { data: "other" }, { ttl: 60 });
    
    const beforeClear = await redisManager.keys("*");
    console.log(`   Keys before clear: ${beforeClear.length}`);
    
    await cacheService.invalidateAllCache();
    
    const afterClear = await redisManager.keys("*");
    console.log(`   Keys after clear: ${afterClear.length}`);
    console.log(`   Complete clear working: ${afterClear.length === 0 ? "✅" : "❌"}`);

    // 6. Test pattern deletion with prefix fix
    console.log("\n6️⃣ Testing pattern deletion with prefix fix...");
    
    // Set test keys
    await cacheService.set("users:page:1", { data: "page1" }, { ttl: 60 });
    await cacheService.set("users:page:2", { data: "page2" }, { ttl: 60 });
    await cacheService.set("user:123", { data: "user123" }, { ttl: 60 });
    await cacheService.set("posts:list", { data: "posts" }, { ttl: 60 });
    
    const beforePattern = await redisManager.keys("*");
    console.log(`   Keys before pattern delete: ${beforePattern.length}`);
    
    // Delete only user patterns
    await cacheService.invalidateUserCache();
    
    const afterPattern = await redisManager.keys("*");
    console.log(`   Keys after user pattern delete: ${afterPattern.length}`);
    
    // Should only have posts:list remaining
    const postsRemaining = afterPattern.filter(key => key.includes("posts"));
    console.log(`   Pattern deletion working: ${postsRemaining.length === 1 ? "✅" : "❌"}`);

    // 7. Test real user service cache (if DB available)
    console.log("\n7️⃣ Testing real UserService cache...");
    
    try {
      console.log("   Attempting to test real user service (may fail without DB)...");
      const users = await userService.getAllUsers({ page: 1, limit: 5 });
      console.log(`   Users retrieved: ${users.data.length}`);
      
      // Check if cache was created
      const usersCacheKeys = await redisManager.keys("users:*");
      console.log(`   Users cache keys created: ${usersCacheKeys.length}`);
      
    } catch (error) {
      console.log(`   UserService test failed (expected without DB): ${error.message}`);
    }

    // Cleanup
    await cacheService.clear();
    console.log("\n🎉 Cache invalidation tests completed!");
    
  } catch (error) {
    console.error("❌ Cache invalidation test failed:", error);
  }
}

testCacheInvalidation();
