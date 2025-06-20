import { z } from "zod";
import { HTTPException } from "hono/http-exception";

export class ValidationHelper {
  static validateBody<T>(schema: z.ZodSchema<T>, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorObj: Record<string, string> = {};
        error.errors.forEach((err) => {
          const field = err.path.join(".") || "general";
          errorObj[field] = err.message;
        });
        throw new HTTPException(422, {
          message: JSON.stringify({
            success: false,
            message: "Please check your request data and try again",
            errors: errorObj,
          }),
        });
      }
      throw new HTTPException(422, {
        message: JSON.stringify({
          success: false,
          message: "Invalid request format. Please check your data",
          errors: { general: "The request data format is not valid" },
        }),
      });
    }
  }

  static validateQuery<T>(schema: z.ZodSchema<T>, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorObj: Record<string, string> = {};
        error.errors.forEach((err) => {
          const field = err.path.join(".") || "general";
          errorObj[field] = err.message;
        });
        throw new HTTPException(422, {
          message: JSON.stringify({
            success: false,
            message: "Please check your query parameters and try again",
            errors: errorObj,
          }),
        });
      }
      throw new HTTPException(422, {
        message: JSON.stringify({
          success: false,
          message: "Invalid query parameters. Please check your request",
          errors: { general: "The query parameters format is not valid" },
        }),
      });
    }
  }

  static validateParams<T>(schema: z.ZodSchema<T>, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorObj: Record<string, string> = {};
        error.errors.forEach((err) => {
          const field = err.path.join(".") || "general";
          errorObj[field] = err.message;
        });
        throw new HTTPException(422, {
          message: JSON.stringify({
            success: false,
            message: "Please check your URL parameters and try again",
            errors: errorObj,
          }),
        });
      }
      throw new HTTPException(422, {
        message: JSON.stringify({
          success: false,
          message: "Invalid URL parameters. Please check your request",
          errors: { general: "The URL parameters format is not valid" },
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
    errors: Record<string, string>;
  } {
    const errorObj: Record<string, string> = {};
    error.errors.forEach((err) => {
      const field = err.path.join(".") || "general";
      errorObj[field] = err.message;
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
      errors: errorObj,
    };
  }
}
