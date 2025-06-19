import { z } from "zod";
import { Context } from "hono";
import { HTTPException } from "hono/http-exception";

export class ValidationHelper {
  static validateBody<T>(schema: z.ZodSchema<T>, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map(
          (err) => `${err.path.join(".")}: ${err.message}`
        );
        throw new HTTPException(400, {
          message: `Validation failed: ${messages.join(", ")}`,
        });
      }
      throw new HTTPException(400, { message: "Validation failed" });
    }
  }

  static validateQuery<T>(schema: z.ZodSchema<T>, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map(
          (err) => `${err.path.join(".")}: ${err.message}`
        );
        throw new HTTPException(400, {
          message: `Query validation failed: ${messages.join(", ")}`,
        });
      }
      throw new HTTPException(400, { message: "Query validation failed" });
    }
  }

  static validateParams<T>(schema: z.ZodSchema<T>, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map(
          (err) => `${err.path.join(".")}: ${err.message}`
        );
        throw new HTTPException(400, {
          message: `Parameter validation failed: ${messages.join(", ")}`,
        });
      }
      throw new HTTPException(400, { message: "Parameter validation failed" });
    }
  }
}
