import { container } from "./src/di/container";
import { CacheService } from "./src/services/CacheService";

async function testCacheService() {
  console.log("🧪 Testing CacheService implementation...\n");

  const cacheService = container.get(CacheService);

  // Test cache key generation
  console.log("1. Testing cache key generation:");
  console.log("   User cache key:", cacheService.generateUserCacheKey("123"));
  console.log(
    "   User email cache key:",
    cacheService.generateUserEmailCacheKey("test@example.com")
  );
  console.log(
    "   Users collection key:",
    cacheService.generateUsersCacheKey(1, 10, "search", [
      { column: "name", order: "asc" },
    ])
  );
  console.log(
    "   Posts collection key:",
    cacheService.generatePostsCacheKey(2, 20, "post search", "user123", [
      { column: "createdAt", order: "desc" },
    ])
  );

  console.log("\n2. Testing cache operations:");

  // Test basic cache operations
  const testKey = "test:cache:key";
  const testData = {
    message: "Hello Cache!",
    timestamp: new Date().toISOString(),
  };

  console.log("   Setting cache...");
  await cacheService.set(testKey, testData, { ttl: 60 });

  console.log("   Getting cache...");
  const cachedData = await cacheService.get(testKey);
  console.log("   Cached data:", cachedData);

  console.log("   Testing remember function...");
  let callCount = 0;
  const expensiveOperation = async () => {
    callCount++;
    console.log(`     Expensive operation called (${callCount})`);
    return { computed: true, value: Math.random() };
  };

  // First call - should execute the function
  console.log("   First remember call:");
  const result1 = await cacheService.remember(
    "test:remember:key",
    expensiveOperation,
    { ttl: 60 }
  );
  console.log("   Result:", result1);

  // Second call - should use cache
  console.log("   Second remember call:");
  const result2 = await cacheService.remember(
    "test:remember:key",
    expensiveOperation,
    { ttl: 60 }
  );
  console.log("   Result:", result2);

  console.log(`   Function was called ${callCount} times (should be 1)`);

  console.log("\n3. Testing error handling in remember:");
  try {
    await cacheService.remember("test:error:key", async () => {
      throw new Error("Simulated error");
    });
  } catch (error) {
    console.log("   ✅ Error correctly thrown and not cached");
  }

  // Verify error wasn't cached
  const errorResult = await cacheService.get("test:error:key");
  console.log("   ✅ Error result not in cache:", errorResult === null);

  console.log("\n4. Testing cache invalidation:");

  // Set some test caches
  await cacheService.set("user:123", { id: "123", name: "Test User" });
  await cacheService.set("user:456", { id: "456", name: "Another User" });
  await cacheService.set("users:collection:page:1|limit:10", []);
  await cacheService.set("post:789", { id: "789", title: "Test Post" });
  await cacheService.set("posts:collection:page:1|limit:10", []);

  console.log("   Invalidating user cache for user 123...");
  await cacheService.invalidateUserCache("123");

  console.log("   Invalidating all post caches...");
  await cacheService.invalidatePostCache();

  console.log("\n✅ Cache service test completed!");

  // Clean up
  await cacheService.delete(testKey);
  await cacheService.delete("test:remember:key");
}

// Run the test
testCacheService().catch(console.error);
