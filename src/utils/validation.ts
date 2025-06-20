import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import { stringifyAsync } from "./asyncJson";

export class ValidationHelper {
  static async validateBody<T>(
    schema: z.ZodSchema<T>,
    data: unknown
  ): Promise<T> {
    try {
      return await schema.parseAsync(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorObj: Record<string, string> = {};
        error.errors.forEach((err) => {
          const field = err.path.join(".") || "general";
          errorObj[field] = err.message;
        });
        throw new HTTPException(422, {
          message: await stringifyAsync({
            success: false,
            message: "Please check your request data and try again",
            errors: errorObj,
          }),
        });
      }
      throw new HTTPException(422, {
        message: await stringifyAsync({
          success: false,
          message: "Invalid request format. Please check your data",
          errors: { general: "The request data format is not valid" },
        }),
      });
    }
  }

  static async validateQuery<T>(
    schema: z.ZodSchema<T>,
    data: unknown
  ): Promise<T> {
    try {
      return await schema.parseAsync(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorObj: Record<string, string> = {};
        error.errors.forEach((err) => {
          const field = err.path.join(".") || "general";
          errorObj[field] = err.message;
        });
        throw new HTTPException(422, {
          message: await stringifyAsync({
            success: false,
            message: "Please check your query parameters and try again",
            errors: errorObj,
          }),
        });
      }
      throw new HTTPException(422, {
        message: await stringifyAsync({
          success: false,
          message: "Invalid query parameters. Please check your request",
          errors: { general: "The query parameters format is not valid" },
        }),
      });
    }
  }

  static async validateParams<T>(
    schema: z.ZodSchema<T>,
    data: unknown
  ): Promise<T> {
    try {
      return await schema.parseAsync(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorObj: Record<string, string> = {};
        error.errors.forEach((err) => {
          const field = err.path.join(".") || "general";
          errorObj[field] = err.message;
        });
        throw new HTTPException(422, {
          message: await stringifyAsync({
            success: false,
            message: "Please check your URL parameters and try again",
            errors: errorObj,
          }),
        });
      }
      throw new HTTPException(422, {
        message: await stringifyAsync({
          success: false,
          message: "Invalid URL parameters. Please check your request",
          errors: { general: "The URL parameters format is not valid" },
        }),
      });
    }
  }

  // Helper method to format validation errors consistently
  static async formatValidationError(
    error: z.ZodError,
    context: string = "Validation"
  ): Promise<{
    success: false;
    message: string;
    errors: Record<string, string>;
  }> {
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
