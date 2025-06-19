import { z } from "zod";
import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { ResponseHelper } from "./response";

export class ValidationHelper {
  static validateBody<T>(schema: z.ZodSchema<T>, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(
          (err) => `${err.path.join(".")}: ${err.message}`
        );
        throw new HTTPException(422, {
          message: JSON.stringify({
            success: false,
            message: "Body validation failed",
            errors: errorMessages,
          }),
        });
      }
      throw new HTTPException(422, {
        message: JSON.stringify({
          success: false,
          message: "Body validation failed",
          errors: ["Invalid data format"],
        }),
      });
    }
  }

  static validateQuery<T>(schema: z.ZodSchema<T>, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(
          (err) => `${err.path.join(".")}: ${err.message}`
        );
        throw new HTTPException(422, {
          message: JSON.stringify({
            success: false,
            message: "Query validation failed",
            errors: errorMessages,
          }),
        });
      }
      throw new HTTPException(422, {
        message: JSON.stringify({
          success: false,
          message: "Query validation failed",
          errors: ["Invalid query parameters"],
        }),
      });
    }
  }

  static validateParams<T>(schema: z.ZodSchema<T>, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(
          (err) => `${err.path.join(".")}: ${err.message}`
        );
        throw new HTTPException(422, {
          message: JSON.stringify({
            success: false,
            message: "Parameter validation failed",
            errors: errorMessages,
          }),
        });
      }
      throw new HTTPException(422, {
        message: JSON.stringify({
          success: false,
          message: "Parameter validation failed",
          errors: ["Invalid parameters"],
        }),
      });
    }
  }

  // Helper method to format validation errors consistently
  static formatValidationError(
    error: z.ZodError,
    context: string = "Validation"
  ): {
    success: false;
    message: string;
    errors: string[];
  } {
    const errorMessages = error.errors.map((err) => {
      const field = err.path.join(".");
      return field ? `${field}: ${err.message}` : err.message;
    });

    return {
      success: false,
      message: `${context} failed`,
      errors: errorMessages,
    };
  }
}
