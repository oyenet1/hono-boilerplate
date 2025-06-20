import { BaseSeeder } from "./BaseSeeder";
import { hash } from "bcryptjs";
import { appConfig } from "../../config/app";

export class DemoSeeder extends BaseSeeder {
  getName(): string {
    return "DemoSeeder";
  }

  async run(): Promise<void> {
    try {
      this.log("Starting demo environment seeding...");

      // Reset database first
      await this.resetDatabase();

      // Hash password for users
      const hashedPassword = await hash(
        "demo123",
        appConfig.security.bcryptRounds
      );

      // Demo-specific data
      const demoUsers = [
        { name: "Alice Johnson", email: "alice@demo.com" },
        { name: "Bob Smith", email: "bob@demo.com" },
        { name: "Carol Wilson", email: "carol@demo.com" },
        { name: "David Brown", email: "david@demo.com" },
        { name: "Emma Davis", email: "emma@demo.com" },
      ];

      const techPostTitles = [
        "Building Reactive UIs with Modern Frameworks",
        "Microservices Architecture: A Practical Guide",
        "Database Optimization Strategies",
        "Container Orchestration with Kubernetes",
        "API Security Best Practices",
        "Serverless Computing: Pros and Cons",
        "Machine Learning in Production",
        "DevOps Culture and Practices",
        "Frontend Performance Monitoring",
        "Cloud Migration Strategies",
      ];

      const techPostContents = [
        "Reactive programming has transformed how we build user interfaces. This article explores the key concepts and practical implementation strategies for modern reactive UIs.",
        "Microservices offer numerous benefits but come with their own challenges. Learn how to design, implement, and maintain a microservices architecture effectively.",
        "Database performance is crucial for application success. Discover proven optimization techniques that can dramatically improve your database performance.",
        "Kubernetes has become the standard for container orchestration. This guide covers the essential concepts and best practices for production deployments.",
        "API security is more important than ever. Learn about authentication, authorization, rate limiting, and other critical security measures.",
        "Serverless computing promises reduced operational overhead, but is it right for your use case? We examine the benefits and limitations.",
        "Taking machine learning models from development to production involves many considerations. This guide covers the essential practices.",
        "DevOps is more than just tools—it's a culture. Learn how to foster collaboration and implement effective DevOps practices in your organization.",
        "Frontend performance directly impacts user experience and business metrics. Discover monitoring strategies and optimization techniques.",
        "Moving to the cloud requires careful planning and execution. This comprehensive guide covers migration strategies and best practices.",
      ];

      // Seed demo data
      await this.seedWithDrizzleSeed((f) => ({
        users: {
          count: 5,
          columns: {
            name: f.valuesFromArray({
              values: demoUsers.map((u) => u.name),
            }),
            email: f.valuesFromArray({
              values: demoUsers.map((u) => u.email),
            }),
            password: f.default({ defaultValue: hashedPassword }),
          },
          with: {
            posts: [
              { weight: 0.6, count: [2, 3] }, // Most users have 2-3 posts
              { weight: 0.4, count: [4, 5] }, // Some users have 4-5 posts
            ],
          },
        },
        posts: {
          columns: {
            title: f.valuesFromArray({ values: techPostTitles }),
            content: f.valuesFromArray({ values: techPostContents }),
          },
        },
      }));

      this.logSuccess("Demo environment seeded successfully!");
      this.log("📊 Generated:");
      this.log("   - 5 demo users with tech-focused profiles");
      this.log("   - Multiple tech blog posts");
      this.log("   - Realistic engagement patterns");
      this.log("💡 Default password for all demo users: 'demo123'");
      this.log("🎯 Perfect for demonstrations and showcases");
    } catch (error) {
      this.logError("Demo seeding failed", error);
      throw error;
    }
  }
}
