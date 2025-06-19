import { hash } from "bcryptjs";
import { db } from "../config/database";
import { config } from "../config/app";

async function seed() {
  try {
    console.log("Seeding database...");

    // Create sample users
    const hashedPassword = await hash("password123", config.bcryptRounds);

    await db.run(`
      INSERT OR IGNORE INTO users (name, email, password, created_at, updated_at)
      VALUES 
        ('John Doe', 'john@example.com', '${hashedPassword}', ${Date.now()}, ${Date.now()}),
        ('Jane Smith', 'jane@example.com', '${hashedPassword}', ${Date.now()}, ${Date.now()})
    `);

    // Create sample posts
    await db.run(`
      INSERT OR IGNORE INTO posts (title, content, user_id, created_at, updated_at)
      VALUES 
        ('First Post', 'This is my first post content', 1, ${Date.now()}, ${Date.now()}),
        ('Second Post', 'This is my second post content', 1, ${Date.now()}, ${Date.now()}),
        ('Jane Post', 'This is Jane''s post content', 2, ${Date.now()}, ${Date.now()})
    `);

    console.log("Database seeded successfully");
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

// Run seeding
seed();
