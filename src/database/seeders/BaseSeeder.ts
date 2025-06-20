import { seed, reset } from "drizzle-seed";
import { db } from "../connection";
import * as schema from "../schema";

export abstract class BaseSeeder {
  protected db = db;
  protected schema = schema;

  abstract getName(): string;
  abstract run(): Promise<void>;

  protected async resetDatabase(): Promise<void> {
    console.log("🧹 Resetting database...");
    await reset(this.db, this.schema);
    console.log("✅ Database reset completed");
  }

  protected async seedWithDrizzleSeed(
    refinements: Parameters<ReturnType<typeof seed>["refine"]>[0]
  ): Promise<void> {
    await seed(this.db, this.schema).refine(refinements);
  }

  protected log(message: string): void {
    console.log(`[${this.getName()}] ${message}`);
  }

  protected logSuccess(message: string): void {
    console.log(`✅ [${this.getName()}] ${message}`);
  }

  protected logError(message: string, error?: any): void {
    console.error(`❌ [${this.getName()}] ${message}`, error);
  }
}
