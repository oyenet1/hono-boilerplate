import { ZodSchema } from "zod";
import { zValidator as zv } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import { ResponseHelper } from "../utils/response";

export const zValidator = <
  T extends ZodSchema,
  Target extends keyof ValidationTargets
>(
  target: Target,
  schema: T
) =>
  zv(target, schema, (result, c) => {
    if (!result.success) {
      // Convert the validation errors to an array of error messages
      const errorMessages = result.error.errors.map((err) => {
        const field = err.path.join(".");
        return field ? `${field}: ${err.message}` : err.message;
      });

      // Format errors as an object with field names as keys for detailed error info
      const formattedErrors = result.error.errors.reduce((acc, err) => {
        const key = err.path.join(".") || "general";
        acc[key] = err.message;
        return acc;
      }, {} as Record<string, string>);

      // Return a structured error response using ResponseHelper
      return ResponseHelper.badRequest(c, "Validation failed", errorMessages);
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
