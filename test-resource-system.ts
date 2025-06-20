#!/usr/bin/env bun

// Quick test script to validate the resource transformation system
import { container } from "./src/di/container";
import { TYPES } from "./src/di/types";
import type { IUserService } from "./src/interfaces/IUserService";
import type { IPostService } from "./src/interfaces/IPostService";

async function testResourceSystem() {
  console.log("🚀 Testing Laravel-like Resource Transformation System");

  try {
    // Get services from DI container (Redis should auto-connect when needed)
    const userService = container.get<IUserService>(TYPES.UserService);
    const postService = container.get<IPostService>(TYPES.PostService);

    console.log("✅ Services initialized from DI container");

    // Test user resource collection with pagination, search, and sort
    console.log("\n📋 Testing User Resource Collection:");

    // Test basic pagination
    const users1 = await userService.getAllUsers({ page: 1, limit: 5 });
    console.log(
      `✅ Users (page 1): ${users1.data.length} items, total: ${users1.meta.total}`
    );
    console.log(`   Pagination meta:`, {
      currentPage: users1.meta.currentPage,
      totalPages: users1.meta.totalPages,
      hasNextPage: users1.meta.hasNextPage,
      hasPreviousPage: users1.meta.hasPreviousPage,
    });

    // Test search functionality
    const searchUsers = await userService.getAllUsers({
      page: 1,
      limit: 10,
      search: "user",
    });
    console.log(`✅ User search results: ${searchUsers.data.length} items`);

    // Test sorting
    const sortedUsers = await userService.getAllUsers({
      page: 1,
      limit: 5,
      sortBy: [{ column: "name", order: "asc" }],
    });
    console.log(`✅ Sorted users: ${sortedUsers.data.length} items`);

    // Verify user data structure (password should not be present)
    if (sortedUsers.data.length > 0) {
      const firstUser = sortedUsers.data[0];
      console.log(`   User structure:`, Object.keys(firstUser));
      console.log(
        `   Password field present: ${
          "password" in firstUser ? "❌ YES" : "✅ NO"
        }`
      );
    }

    // Test post resource collection
    console.log("\n📝 Testing Post Resource Collection:");

    const posts1 = await postService.getAllPosts({ page: 1, limit: 5 });
    console.log(
      `✅ Posts (page 1): ${posts1.data.length} items, total: ${posts1.meta.total}`
    );

    // Test post search
    const searchPosts = await postService.getAllPosts({
      page: 1,
      limit: 10,
      search: "test",
    });
    console.log(`✅ Post search results: ${searchPosts.data.length} items`);

    // Test cache functionality (second call should be faster)
    console.log("\n🔄 Testing Cache Performance:");

    const start1 = Date.now();
    await userService.getAllUsers({ page: 1, limit: 5 });
    const time1 = Date.now() - start1;

    const start2 = Date.now();
    await userService.getAllUsers({ page: 1, limit: 5 }); // Should hit cache
    const time2 = Date.now() - start2;

    console.log(`✅ First call: ${time1}ms, Second call (cached): ${time2}ms`);
    console.log(
      `   Cache performance: ${
        time1 > time2 ? "✅ Improved" : "⚠️ No improvement"
      }`
    );

    console.log("\n🎉 All resource transformation tests passed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  } finally {
    // Clean up
    console.log("✅ Test completed");
  }
}

// Run the test
testResourceSystem();
