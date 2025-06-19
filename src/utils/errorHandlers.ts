import { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import { ResponseHelper } from "./response";

/**
 * Global error handler middleware that catches all errors and returns consistent JSON responses
 */
export const errorHandler = async (c: Context, next: Next) => {
  try {
    await next();
  } catch (err) {
    // Log error for debugging
    console.error("Error caught by errorHandler:", err);

    // Handle HTTPException (thrown by controllers/middleware)
    if (err instanceof HTTPException) {
      // Try to parse the message as JSON (for validation errors)
      try {
        const parsedMessage = JSON.parse(err.message);
        if (parsedMessage.success === false && parsedMessage.errors) {
          return c.json(parsedMessage, err.status);
        }
      } catch {
        // If parsing fails, treat as regular message
      }

      return ResponseHelper.error(
        c,
        err.message || "An error occurred",
        err.status
      );
    }

    // Handle Zod validation errors
    if (err instanceof ZodError) {
      const formattedErrors = err.errors.map((error) => {
        const field = error.path.join(".");
        return field ? `${field}: ${error.message}` : error.message;
      });

      return ResponseHelper.validationError(
        c,
        "Validation failed. Please check your input",
        formattedErrors
      );
    }

    // Handle generic errors
    if (err instanceof Error) {
      // Don't expose internal error messages in production
      const message =
        process.env.NODE_ENV === "production"
          ? "Something went wrong. Please try again later"
          : err.message;

      return ResponseHelper.error(c, message, 500);
    }

    // Handle unknown errors
    return ResponseHelper.error(
      c,
      "An unexpected error occurred. Please try again later",
      500
    );
  }
};

/**
 * Error handler specifically for async route handlers
 * Wraps async functions to catch and handle errors automatically
 */
export const asyncHandler = (fn: Function) => {
  return async (c: Context, next?: Next) => {
    try {
      return await fn(c, next);
    } catch (err) {
      throw err; // Re-throw to be caught by global error handler
    }
  };
};

/**
 * Custom error classes for different types of application errors
 */
export class ValidationError extends HTTPException {
  constructor(
    message: string = "Validation failed. Please check your input",
    errors: string[] = []
  ) {
    const errorResponse = {
      success: false,
      message,
      errors,
    };
    super(422, { message: JSON.stringify(errorResponse) });
  }
}

export class NotFoundError extends HTTPException {
  constructor(resource: string = "Resource") {
    const message =
      resource === "Resource"
        ? "The requested resource was not found"
        : `${resource} not found`;
    super(404, { message });
  }
}

export class UnauthorizedError extends HTTPException {
  constructor(message: string = "Invalid token: Authentication required") {
    super(401, { message });
  }
}

export class ForbiddenError extends HTTPException {
  constructor(
    message: string = "Permission denied. You don't have access to this resource"
  ) {
    super(403, { message });
  }
}

export class SessionExpiredError extends HTTPException {
  constructor(
    message: string = "Your session has expired. Please login again"
  ) {
    super(401, { message }); // Use 401 instead of 419 for better compatibility
  }
}

export class ConflictError extends HTTPException {
  constructor(message: string = "This resource already exists") {
    super(409, { message });
  }
}

export class BadRequestError extends HTTPException {
  constructor(
    message: string = "Invalid request. Please check your data and try again",
    errors: string[] = []
  ) {
    if (errors.length > 0) {
      const errorResponse = {
        success: false,
        message,
        errors,
      };
      super(400, { message: JSON.stringify(errorResponse) });
    } else {
      super(400, { message });
    }
  }
}

/**
 * Database error handler
 * Converts database-specific errors to user-friendly messages
 */
export const handleDatabaseError = (error: any): HTTPException => {
  // PostgreSQL error codes
  if (error.code === "23505") {
    // Unique violation
    return new ConflictError(
      "This resource already exists. Please use different values"
    );
  }

  if (error.code === "23503") {
    // Foreign key violation
    return new BadRequestError(
      "The referenced resource does not exist. Please check your data"
    );
  }

  if (error.code === "23514") {
    // Check violation
    return new BadRequestError(
      "The provided data is invalid. Please check the requirements"
    );
  }

  // Drizzle-specific errors
  if (error.message?.includes("duplicate key")) {
    return new ConflictError(
      "This resource already exists. Please use different values"
    );
  }

  if (error.message?.includes("foreign key")) {
    return new BadRequestError(
      "The referenced resource does not exist. Please check your data"
    );
  }

  // Generic database error
  console.error("Database error:", error);
  return new HTTPException(500, {
    message:
      process.env.NODE_ENV === "production"
        ? "We're having trouble saving your data. Please try again later"
        : error.message,
  });
};

/**
 * Redis error handler
 * Handles Redis connection and operation errors
 */
export const handleRedisError = (error: any): HTTPException => {
  console.error("Redis error:", error);

  if (error.message?.includes("Connection")) {
    return new HTTPException(503, {
      message:
        "Our services are temporarily unavailable. Please try again in a few moments",
    });
  }

  return new HTTPException(500, {
    message:
      process.env.NODE_ENV === "production"
        ? "We're experiencing technical difficulties. Please try again later"
        : error.message,
  });
};

/**
 * JWT error handler
 * Handles JWT-related authentication errors
 */
export const handleJWTError = (error: any): HTTPException => {
  if (error.message?.includes("expired")) {
    return new SessionExpiredError(
      "Your session has expired. Please login again"
    );
  }

  if (error.message?.includes("invalid")) {
    return new UnauthorizedError(
      "Invalid authentication token. Please login again"
    );
  }

  if (error.message?.includes("malformed")) {
    return new UnauthorizedError(
      "Invalid authentication format. Please login again"
    );
  }

  return new UnauthorizedError(
    "Authentication failed. Please login to continue"
  );
};
