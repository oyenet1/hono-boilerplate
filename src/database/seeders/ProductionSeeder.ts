import { BaseSeeder } from "./BaseSeeder";
import { hash } from "bcryptjs";
import { appConfig } from "../../config/app";

export class ProductionSeeder extends BaseSeeder {
  getName(): string {
    return "ProductionSeeder";
  }

  async run(): Promise<void> {
    try {
      this.log("Starting production environment seeding...");
      this.log("⚠️  WARNING: This will create initial production data");

      // Reset database first (be careful in production!)
      await this.resetDatabase();

      // Hash password for admin user
      const hashedPassword = await hash(
        "admin123!",
        appConfig.security.bcryptRounds
      );

      // Seed minimal production data
      await this.seedWithDrizzleSeed((f) => ({
        users: {
          count: 1, // Only create an admin user
          columns: {
            name: f.default({ defaultValue: "System Administrator" }),
            email: f.default({ defaultValue: "admin@yourcompany.com" }),
            password: f.default({ defaultValue: hashedPassword }),
          },
          with: {
            posts: 1, // Create one welcome post
          },
        },
        posts: {
          columns: {
            title: f.default({ defaultValue: "Welcome to the Platform" }),
            content: f.default({
              defaultValue:
                "Welcome to our platform! This is your first post. You can edit or delete this content through the admin interface.",
            }),
          },
        },
      }));

      this.logSuccess("Production environment seeded successfully!");
      this.log("📊 Generated:");
      this.log("   - 1 admin user (admin@yourcompany.com)");
      this.log("   - 1 welcome post");
      this.log("🔒 IMPORTANT: Change the admin password immediately!");
      this.log("💡 Default admin password: 'admin123!'");
    } catch (error) {
      this.logError("Production seeding failed", error);
      throw error;
    }
  }
}
