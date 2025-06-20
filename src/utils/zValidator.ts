import { ZodSchema } from "zod";
import { zValidator as zv } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import { ApiResponse } from "../utils/response";

export const zValidator = <
  T extends ZodSchema,
  Target extends keyof ValidationTargets
>(
  target: Target,
  schema: T
) =>
  zv(target, schema, (result, c) => {
    if (!result.success) {
      // Format errors as an object with field names as keys
      const errorObj: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path.join(".") || "general";
        errorObj[field] = err.message;
      });

      // Return a structured error response using ApiResponse
      return ApiResponse.badRequest(c, "Validation failed", errorObj);
    }
  });

// Additional validator utilities
export const validateBody = <T extends ZodSchema>(schema: T) =>
  zValidator("form", schema);

export const validateJson = <T extends ZodSchema>(schema: T) =>
  zValidator("json", schema);

export const validateQuery = <T extends ZodSchema>(schema: T) =>
  zValidator("query", schema);

export const validateParam = <T extends ZodSchema>(schema: T) =>
  zValidator("param", schema);

export const validateHeader = <T extends ZodSchema>(schema: T) =>
  zValidator("header", schema);

// Export types for better TypeScript support
export type ValidatorMiddleware<T extends ZodSchema> = ReturnType<
  typeof zValidator<T, keyof ValidationTargets>
>;
