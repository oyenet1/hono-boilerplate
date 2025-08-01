import { CacheService } from "./src/services/CacheService";

async function testDateCacheFix() {
  console.log("🧪 Testing Date Cache Fix...\n");

  const cacheService = new CacheService();

  // Mock user data with Date objects
  const mockUser = {
    id: "test-123",
    name: "Test User",
    email: "test@example.com",
    createdAt: new Date("2024-01-01T10:00:00.000Z"),
    updatedAt: new Date("2024-01-02T15:30:00.000Z"),
  };

  console.log("1. Original user object:");
  console.log(
    "   createdAt type:",
    typeof mockUser.createdAt,
    "- value:",
    mockUser.createdAt
  );
  console.log(
    "   updatedAt type:",
    typeof mockUser.updatedAt,
    "- value:",
    mockUser.updatedAt
  );
  console.log("   Can call toISOString():", mockUser.createdAt.toISOString());

  // Test direct cache operations
  console.log("\n2. Testing direct cache operations:");
  const cacheKey = cacheService.generateUserCacheKey(mockUser.id);
  console.log("   Cache key:", cacheKey);

  // Set in cache
  await cacheService.set(cacheKey, mockUser, { ttl: 60 });
  console.log("   ✅ User cached");

  // Get from cache
  const cachedUser = await cacheService.get<typeof mockUser>(cacheKey);
  console.log("   Retrieved from cache:");
  console.log(
    "   createdAt type:",
    typeof cachedUser?.createdAt,
    "- value:",
    cachedUser?.createdAt
  );
  console.log(
    "   updatedAt type:",
    typeof cachedUser?.updatedAt,
    "- value:",
    cachedUser?.updatedAt
  );

  // Test if toISOString works
  try {
    if (cachedUser?.createdAt) {
      const isoString = cachedUser.createdAt.toISOString();
      console.log("   ✅ toISOString() works:", isoString);
    }
  } catch (error) {
    console.log("   ❌ toISOString() failed:", error.message);
  }

  console.log("\n3. Testing remember function:");

  // Clear cache
  await cacheService.delete(cacheKey);

  // Test remember function
  const rememberedUser = await cacheService.remember(
    cacheKey,
    async () => {
      console.log("   📊 Database call simulated");
      return mockUser;
    },
    { ttl: 60 }
  );

  console.log("   First call (should hit database):");
  console.log(
    "   createdAt type:",
    typeof rememberedUser.createdAt,
    "- value:",
    rememberedUser.createdAt
  );

  // Second call - should hit cache
  const rememberedUser2 = await cacheService.remember(
    cacheKey,
    async () => {
      console.log("   📊 This should NOT be called");
      return mockUser;
    },
    { ttl: 60 }
  );

  console.log("   Second call (should hit cache):");
  console.log(
    "   createdAt type:",
    typeof rememberedUser2.createdAt,
    "- value:",
    rememberedUser2.createdAt
  );

  try {
    const isoString2 = rememberedUser2.createdAt.toISOString();
    console.log("   ✅ toISOString() works on cached data:", isoString2);
  } catch (error) {
    console.log("   ❌ toISOString() failed on cached data:", error.message);
  }

  console.log("\n✅ Date cache fix test completed!");

  // Clean up
  await cacheService.delete(cacheKey);
}

// Run the test
testDateCacheFix().catch(console.error);
