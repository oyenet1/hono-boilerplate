import { BaseSeeder } from "./BaseSeeder";
import { DevelopmentSeeder } from "./DevelopmentSeeder";
import { TestSeeder } from "./TestSeeder";
import { ProductionSeeder } from "./ProductionSeeder";
import { DemoSeeder } from "./DemoSeeder";

export class SeederRegistry {
  private static seeders: Map<string, () => BaseSeeder> = new Map([
    ["development", () => new DevelopmentSeeder()],
    ["dev", () => new DevelopmentSeeder()], // Alias
    ["test", () => new TestSeeder()],
    ["testing", () => new TestSeeder()], // Alias
    ["production", () => new ProductionSeeder()],
    ["prod", () => new ProductionSeeder()], // Alias
    ["demo", () => new DemoSeeder()],
  ]);

  static getSeeder(name: string): BaseSeeder | null {
    const seederFactory = this.seeders.get(name.toLowerCase());
    return seederFactory ? seederFactory() : null;
  }

  static listSeeders(): string[] {
    return Array.from(this.seeders.keys());
  }

  static registerSeeder(name: string, seederFactory: () => BaseSeeder): void {
    this.seeders.set(name.toLowerCase(), seederFactory);
  }

  static hasSeeder(name: string): boolean {
    return this.seeders.has(name.toLowerCase());
  }
}

export class SeederManager {
  static async runSeeder(seederName: string): Promise<void> {
    const seeder = SeederRegistry.getSeeder(seederName);

    if (!seeder) {
      console.error(`❌ Seeder '${seederName}' not found.`);
      console.log("\n📋 Available seeders:");
      SeederRegistry.listSeeders().forEach((name) => {
        console.log(`   - ${name}`);
      });
      process.exit(1);
    }

    console.log(`🌱 Running ${seeder.getName()}...`);
    const startTime = Date.now();

    try {
      await seeder.run();
      const duration = Date.now() - startTime;
      console.log(`✅ Seeding completed successfully in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Seeding failed after ${duration}ms:`, error);
      process.exit(1);
    }
  }

  static async listSeeders(): Promise<void> {
    console.log("📋 Available seeders:");
    SeederRegistry.listSeeders().forEach((name) => {
      const seeder = SeederRegistry.getSeeder(name);
      console.log(`   - ${name.padEnd(12)} (${seeder?.getName()})`);
    });
  }
}

// Export all seeders for convenience
export { BaseSeeder } from "./BaseSeeder";
export { DevelopmentSeeder } from "./DevelopmentSeeder";
export { TestSeeder } from "./TestSeeder";
export { ProductionSeeder } from "./ProductionSeeder";
export { DemoSeeder } from "./DemoSeeder";
