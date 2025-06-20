import { BaseSeeder } from "./BaseSeeder";
import { hash } from "bcryptjs";
import { appConfig } from "../../config/app";

export class TestSeeder extends BaseSeeder {
  getName(): string {
    return "TestSeeder";
  }

  async run(): Promise<void> {
    try {
      this.log("Starting test environment seeding...");

      // Reset database first
      await this.resetDatabase();

      // Hash password for users
      const hashedPassword = await hash(
        "password123",
        appConfig.security.bcryptRounds
      );

      // Seed the database with test data
      await this.seedWithDrizzleSeed((f) => ({
        users: {
          count: 3,
          columns: {
            name: f.valuesFromArray({
              values: ["Test User", "John Doe", "Jane Smith"],
            }),
            email: f.valuesFromArray({
              values: [
                "test@example.com",
                "john@example.com",
                "jane@example.com",
              ],
            }),
            password: f.default({ defaultValue: hashedPassword }),
          },
          with: {
            posts: 2, // Each user gets exactly 2 posts
          },
        },
        posts: {
          columns: {
            title: f.valuesFromArray({
              values: [
                "Test Post 1",
                "Test Post 2",
                "Sample Article",
                "Demo Content",
                "First Post",
                "Second Post",
              ],
            }),
            content: f.valuesFromArray({
              values: [
                "This is test content for development and testing purposes.",
                "Sample post content for testing the application functionality.",
                "Demo article with sample text to verify everything works correctly.",
                "Another test post to ensure proper data handling.",
                "Sample content for integration testing scenarios.",
              ],
            }),
          },
        },
      }));

      this.logSuccess("Test environment seeded successfully!");
      this.log("📊 Generated:");
      this.log("   - 3 test users with predictable data");
      this.log("   - 6 test posts (2 per user)");
      this.log("💡 Default password for all users: 'password123'");
    } catch (error) {
      this.logError("Test seeding failed", error);
      throw error;
    }
  }
}
