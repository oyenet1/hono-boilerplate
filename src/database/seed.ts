import { hash } from "bcryptjs";
import { db } from "./connection";
import { users, posts } from "./schema";
import { appConfig } from "../config/app";

async function seed() {
  try {
    console.log("🌱 Seeding database...");

    // Create sample users
    const hashedPassword = await hash("password123", appConfig.bcryptRounds);

    const seedUsers = await db
      .insert(users)
      .values([
        {
          name: "John Doe",
          email: "john@example.com",
          password: hashedPassword,
        },
        {
          name: "Jane Smith",
          email: "jane@example.com",
          password: hashedPassword,
        },
      ])
      .onConflictDoNothing()
      .returning();

    if (seedUsers.length > 0) {
      // Create sample posts
      await db
        .insert(posts)
        .values([
          {
            title: "First Post",
            content: "This is my first post content",
            userId: seedUsers[0].id,
          },
          {
            title: "Second Post",
            content: "This is my second post content",
            userId: seedUsers[0].id,
          },
          {
            title: "Jane's Post",
            content: "This is Jane's post content",
            userId: seedUsers[1].id,
          },
        ])
        .onConflictDoNothing();
    }

    console.log("✅ Database seeded successfully");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

// Run seeding
if (import.meta.main) {
  seed();
}

export { seed };
