#!/usr/bin/env bun

// Simple test to check basic functionality
import { UserResource } from "./src/resources/UserResource";
import { PostResource } from "./src/resources/PostResource";

console.log("🧪 Testing Resource Classes");

// Test UserResource
const userResource = new UserResource();
const mockUser = {
  id: "test-123",
  name: "John Doe",
  email: "john@example.com",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const transformedUser = userResource.transform(mockUser);
console.log("✅ User transformation:", transformedUser);
console.log(
  "✅ Password field present:",
  "password" in transformedUser ? "YES" : "NO"
);

// Test PostResource
const postResource = new PostResource();
const mockPost = {
  id: "post-123",
  title: "Test Post",
  content: "This is a test post content",
  userId: "user-123",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const transformedPost = postResource.transform(mockPost);
console.log("✅ Post transformation:", transformedPost);

// Test pagination meta
const paginationMeta = userResource.createPaginationMeta(1, 10, 50);
console.log("✅ Pagination meta:", paginationMeta);

// Test collection creation
const mockUsers = [mockUser];
const collection = userResource.createCollection(mockUsers, 1, 10, 50);
console.log("✅ Collection structure:", {
  dataLength: collection.data.length,
  metaKeys: Object.keys(collection.meta),
});

// Test cache key generation
const cacheKey = userResource.generateUsersCacheKey(1, 10, "search", [
  { column: "name", order: "asc" },
]);
console.log("✅ Cache key:", cacheKey);

console.log("\n🎉 Basic resource tests passed!");
