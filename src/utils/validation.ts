import { z } from "zod";
import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { ApiResponse } from "./response";

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
            message: "Please check your request data and try again",
            errors: errorMessages,
          }),
        });
      }
      throw new HTTPException(422, {
        message: JSON.stringify({
          success: false,
          message: "Invalid request format. Please check your data",
          errors: ["The request data format is not valid"],
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
            message: "Please check your query parameters and try again",
            errors: errorMessages,
          }),
        });
      }
      throw new HTTPException(422, {
        message: JSON.stringify({
          success: false,
          message: "Invalid query parameters. Please check your request",
          errors: ["The query parameters format is not valid"],
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
            message: "Please check your URL parameters and try again",
            errors: errorMessages,
          }),
        });
      }
      throw new HTTPException(422, {
        message: JSON.stringify({
          success: false,
          message: "Invalid URL parameters. Please check your request",
          errors: ["The URL parameters format is not valid"],
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

    const contextMessages: Record<string, string> = {
      Body: "Please check your request data and try again",
      Query: "Please check your query parameters and try again",
      Parameter: "Please check your URL parameters and try again",
      Validation: "Please check your input and try again",
    };

    return {
      success: false,
      message: contextMessages[context] || contextMessages["Validation"],
      errors: errorMessages,
    };
  }
}
