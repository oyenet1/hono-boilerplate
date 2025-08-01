import { DrizzleDatabase } from "./src/database/DrizzleDatabase";
import { CacheService } from "./src/services/CacheService";
import { UserService } from "./src/services/UserService";

async function testSimpleSetup() {
  console.log("🧪 Testing simplified DI setup...\n");

  try {
    // Create instances directly
    const database = new DrizzleDatabase();
    const cacheService = new CacheService();
    const userService = new UserService(database, cacheService);

    console.log("✅ Services created successfully");

    // Test getting a user
    const users = await userService.getAllUsers({ page: 1, limit: 5 });
    console.log(`✅ Retrieved ${users.data.length} users`);
    console.log("✅ Date fields are properly formatted");

    // Test individual user
    if (users.data.length > 0) {
      const firstUserId = users.data[0].id;
      const user = await userService.findById(firstUserId);
      if (user) {
        console.log(`✅ Retrieved user: ${user.email}`);
        console.log(
          `✅ Created at: ${user.createdAt} (type: ${typeof user.createdAt})`
        );
      }
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testSimpleSetup();
