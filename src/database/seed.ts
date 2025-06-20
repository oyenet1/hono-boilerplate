import { seed, reset } from "drizzle-seed";
import { db } from "./connection";
import * as schema from "./schema";

export async function seedDatabase() {
  try {
    console.log("🌱 Seeding database with drizzle-seed...");

    await seed(db, schema).refine((f) => ({
      users: {
        count: 50, // Create 50 users
        columns: {
          name: f.fullName(),
          email: f.email(),
          // Password will be handled by the bcrypt hashing in the refined implementation
          password: f.default({ defaultValue: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi" }), // pre-hashed "password"
        },
      },        posts: {
        count: 200, // Create 200 posts total
        columns: {
          title: f.loremIpsum({ sentencesCount: 1 }), // Single sentence for titles
          content: f.loremIpsum({ sentencesCount: 5 }), // 5 sentences for content
        },
        with: {
          // This will be ignored due to the one-to-many limitation, so we'll rely on userId references
        },
      },
    }));

    console.log("✅ Database seeded successfully with drizzle-seed");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  }
}

export async function resetDatabase() {
  try {
    console.log("🧹 Resetting database...");
    await reset(db, schema);
    console.log("✅ Database reset successfully");
  } catch (error) {
    console.error("❌ Database reset failed:", error);
    throw error;
  }
}

// Enhanced seed function with realistic data and better relationships
export async function seedDatabaseEnhanced() {
  try {
    console.log("🌱 Seeding database with enhanced realistic data...");

    const postTitles = [
      "Getting Started with TypeScript",
      "The Future of Web Development",
      "Understanding Database Design",
      "Best Practices for API Development",
      "Modern JavaScript Patterns",
      "Building Scalable Applications",
      "Database Optimization Techniques",
      "Security in Web Applications",
      "Microservices Architecture",
      "Cloud Development Strategies",
    ];

    const jobTitles = [
      "Software Engineer",
      "Frontend Developer", 
      "Backend Developer",
      "Full Stack Developer",
      "DevOps Engineer",
      "Product Manager",
      "UI/UX Designer",
      "Data Scientist",
      "Technical Writer",
      "Engineering Manager",
    ];

    await seed(db, schema).refine((f) => ({
      users: {
        count: 25, // Create 25 users
        columns: {
          name: f.fullName(),
          email: f.email(),
          password: f.weightedRandom([
            { 
              weight: 0.8, 
              value: f.default({ defaultValue: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi" }) // "password"
            },
            { 
              weight: 0.2, 
              value: f.default({ defaultValue: "$2a$10$N9qo8uLOickgx2ZMRZoMye/3A5YQzgw4/JBp6z1nO.cJ1.OqStjam" }) // "secret123"
            },
          ]),
        },
        with: {
          posts: [
            { weight: 0.3, count: [1, 2] },      // 30% chance of 1-2 posts
            { weight: 0.4, count: [3, 5] },      // 40% chance of 3-5 posts  
            { weight: 0.2, count: [6, 10] },     // 20% chance of 6-10 posts
            { weight: 0.1, count: [11, 15] },    // 10% chance of 11-15 posts
          ],
        },
      },
      posts: {
        columns: {
          title: f.weightedRandom([
            { 
              weight: 0.6, 
              value: f.valuesFromArray({ values: postTitles })
            },
            { 
              weight: 0.4, 
              value: f.loremIpsum({ sentencesCount: 1 })
            },
          ]),
          content: f.weightedRandom([
            { 
              weight: 0.4, 
              value: f.loremIpsum({ sentencesCount: 3 }) // Short posts
            },
            { 
              weight: 0.4, 
              value: f.loremIpsum({ sentencesCount: 6 }) // Medium posts
            },
            { 
              weight: 0.2, 
              value: f.loremIpsum({ sentencesCount: 12 }) // Long posts
            },
          ]),
        },
      },
    }));

    console.log("✅ Database seeded successfully with enhanced realistic data");
  } catch (error) {
    console.error("❌ Enhanced seeding failed:", error);
    throw error;
  }
}

// Simple seed function for testing (compatible with existing tests)
export async function seedTestData() {
  try {
    console.log("🧪 Seeding test data...");
    
    // Clear existing data first
    await reset(db, schema);
    
    // Seed minimal test data
    await seed(db, { users: schema.users }).refine((f) => ({
      users: {
        count: 1,
        columns: {
          name: f.default({ defaultValue: "Test User" }),
          email: f.default({ defaultValue: "test@example.com" }),
          password: f.default({ defaultValue: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi" }), // "password"
        },
      },
    }));

    console.log("✅ Test data seeded successfully");
  } catch (error) {
    console.error("❌ Test seeding failed:", error);
    throw error;
  }
}

// Main function for CLI usage
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "enhanced";

  try {
    switch (command) {
      case "reset":
        await resetDatabase();
        break;
      case "basic":
        await seedDatabase();
        break;
      case "enhanced":
        await seedDatabaseEnhanced();
        break;
      case "test":
        await seedTestData();
        break;
      default:
        console.log("Available commands:");
        console.log("  bun run seed          - Enhanced realistic data (default)");
        console.log("  bun run seed basic    - Basic seeding");
        console.log("  bun run seed enhanced - Enhanced realistic data");
        console.log("  bun run seed test     - Minimal test data");
        console.log("  bun run seed reset    - Reset database");
        break;
    }
  } catch (error) {
    console.error("Seeding process failed:", error);
    process.exit(1);
  }
}

// Export legacy function names for backward compatibility
export { seedDatabase as seed };

// For CLI usage - call main() manually when running the script
if (process.argv[1]?.endsWith('seed.ts')) {
  main();
}
