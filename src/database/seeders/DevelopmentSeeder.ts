import { BaseSeeder } from "./BaseSeeder";
import { hash } from "bcryptjs";
import { appConfig } from "../../config/app";

export class DevelopmentSeeder extends BaseSeeder {
  getName(): string {
    return "DevelopmentSeeder";
  }

  async run(): Promise<void> {
    try {
      this.log("Starting development environment seeding...");

      // Reset database first
      await this.resetDatabase();

      // Hash password for users
      const hashedPassword = await hash(
        "password123",
        appConfig.security.bcryptRounds
      );

      // Sample data arrays for realistic seeding
      const postTitles = [
        "Getting Started with TypeScript",
        "The Future of Web Development", 
        "Building Scalable APIs",
        "Database Design Best Practices",
        "Understanding Microservices",
        "Frontend Performance Optimization",
        "Security in Modern Applications",
        "DevOps and CI/CD Pipelines",
        "Machine Learning Basics",
        "Cloud Computing Essentials",
        "Modern JavaScript Features",
        "React Best Practices",
        "Node.js Performance Tips",
        "GraphQL vs REST APIs",
        "Docker for Developers",
        "Introduction to Kubernetes",
        "AWS Lambda Best Practices",
        "Testing Strategies for Modern Apps",
        "CSS Grid vs Flexbox",
        "Vue.js Component Design",
        "Async JavaScript Patterns",
        "Database Indexing Strategies",
        "Redis Caching Techniques",
        "Mobile-First Design Principles",
        "Progressive Web Apps",
        "Webpack Configuration Guide",
        "Git Workflow Best Practices",
        "Code Review Guidelines",
        "Monitoring and Logging",
        "API Rate Limiting",
        "Authentication vs Authorization",
        "SOLID Principles in Practice",
        "Clean Code Principles",
        "Refactoring Legacy Code",
        "Design Patterns in JavaScript",
        "Functional Programming Concepts",
        "Error Handling Strategies",
        "Performance Optimization Tips",
        "Accessibility in Web Development",
        "SEO for Single Page Applications"
      ];

      const postContents = [
        "TypeScript has revolutionized the way we write JavaScript by adding static type checking. This comprehensive guide will walk you through the fundamentals and advanced concepts.",
        "The web development landscape is constantly evolving with new frameworks and tools. Let's explore what the future holds for developers and how to stay ahead.",
        "When building APIs, scalability should be a primary concern from the start. This article covers best practices for designing APIs that can handle growth.",
        "A well-designed database is the foundation of any successful application. Learn the principles of good database design and common pitfalls to avoid.",
        "Microservices architecture offers many benefits but also introduces complexity. Understanding when and how to implement microservices is crucial.",
        "Frontend performance directly impacts user experience and business metrics. Discover techniques to optimize your frontend applications for speed.",
        "Security should never be an afterthought in application development. This guide covers essential security practices for modern web applications.",
        "Automated deployment pipelines are essential for modern software development. Learn how to set up CI/CD for your projects.",
        "Machine learning is becoming more accessible to developers across all domains. This introduction will help you get started with ML concepts.",
        "Cloud platforms have transformed how we build and deploy applications. Explore the benefits and challenges of cloud-native development.",
        "ES6+ has introduced many powerful features that make JavaScript more expressive and maintainable. Let's explore the most important ones.",
        "React continues to be one of the most popular frontend frameworks. Here are the best practices every React developer should know.",
        "Node.js performance optimization is crucial for building scalable backend applications. Learn the techniques that matter most.",
        "GraphQL and REST each have their strengths. Understanding when to use each approach is key to building effective APIs.",
        "Docker has revolutionized how we develop, ship, and run applications. This guide covers the essentials every developer should know.",
        "Kubernetes provides powerful orchestration capabilities for containerized applications. Learn the core concepts and best practices.",
        "AWS Lambda enables serverless computing at scale. Discover how to build efficient serverless applications with proper architecture.",
        "Testing is crucial for maintaining code quality and preventing regressions. This article covers modern testing strategies and tools.",
        "CSS Grid and Flexbox are powerful layout systems. Understanding when and how to use each will improve your frontend development.",
        "Vue.js offers a progressive approach to building user interfaces. Learn component design patterns and best practices.",
        "Asynchronous JavaScript can be tricky to master. This guide covers promises, async/await, and error handling patterns.",
        "Database indexing is crucial for performance. Learn how to design and optimize indexes for your specific use cases.",
        "Redis is a powerful caching solution. Discover caching strategies and patterns that can dramatically improve application performance.",
        "Mobile-first design ensures your applications work well on all devices. Learn the principles and techniques for responsive design.",
        "Progressive Web Apps combine the best of web and mobile applications. Build engaging, app-like experiences for the web.",
        "Webpack can seem complex but understanding its core concepts will improve your development workflow and application performance.",
        "Git workflows can make or break team productivity. Learn proven strategies for branching, merging, and collaboration.",
        "Code reviews are essential for maintaining code quality. This guide covers best practices for both reviewers and contributors.",
        "Monitoring and logging are crucial for production applications. Learn how to implement effective observability in your systems.",
        "API rate limiting protects your services from abuse and ensures fair usage. Implement rate limiting strategies that work for your use case.",
        "Authentication and authorization are fundamental security concepts. Understanding the difference is crucial for building secure applications.",
        "SOLID principles provide a foundation for writing maintainable object-oriented code. Learn how to apply these principles in practice.",
        "Clean code is more than just syntax. Learn the principles and practices that make code readable, maintainable, and extensible.",
        "Legacy code refactoring requires careful planning and execution. This guide covers strategies for safely modernizing old codebases.",
        "Design patterns provide proven solutions to common programming problems. Learn the most useful patterns for JavaScript development.",
        "Functional programming concepts can improve code quality and reduce bugs. Explore how to apply FP principles in JavaScript.",
        "Proper error handling is crucial for robust applications. Learn strategies for handling errors gracefully and providing good user experiences.",
        "Performance optimization is an ongoing process. This comprehensive guide covers profiling, optimization techniques, and monitoring.",
        "Web accessibility ensures your applications are usable by everyone. Learn the principles and techniques for building inclusive web experiences.",
        "SEO for single-page applications requires special consideration. Learn how to make your SPA discoverable and indexable by search engines."
      ];

      // Seed the database with refined data
      await this.seedWithDrizzleSeed((f) => ({
        users: {
          count: 100, // Create 100 users
          columns: {
            name: f.fullName(),
            email: f.email(),
            password: f.default({ defaultValue: hashedPassword }),
          },
          with: {
            posts: [
              { weight: 0.2, count: [1, 2] }, // 20% chance of 1-2 posts
              { weight: 0.3, count: [3, 4, 5] }, // 30% chance of 3-5 posts
              { weight: 0.3, count: [6, 7, 8] }, // 30% chance of 6-8 posts
              { weight: 0.15, count: [9, 10, 11, 12] }, // 15% chance of 9-12 posts
              { weight: 0.05, count: [13, 14, 15] }, // 5% chance of 13-15 posts (power users)
            ],
          },
        },
        posts: {
          columns: {
            title: f.weightedRandom([
              {
                weight: 0.7,
                value: f.valuesFromArray({ values: postTitles }),
              },
              {
                weight: 0.3,
                value: f.firstName(), // Generate random titles using firstName as base
              },
            ]),
            content: f.weightedRandom([
              {
                weight: 0.6,
                value: f.valuesFromArray({ values: postContents }),
              },
              {
                weight: 0.4,
                value: f.loremIpsum({ sentencesCount: 5 }),
              },
            ]),
          },
        },
      }));

      this.logSuccess("Development environment seeded successfully!");
      this.log("📊 Generated:");
      this.log("   - 100 users with realistic names and emails");
      this.log("   - Posts distributed across users with weighted randomization");
      this.log("   - Expected ~700-900 total posts based on distribution");
      this.log("   - Each user has 1-15 posts (most have 3-8 posts)");
      this.log("   - Mixture of predefined and generated content");
      this.log("💡 Default password for all users: 'password123'");
    } catch (error) {
      this.logError("Development seeding failed", error);
      throw error;
    }
  }
}
