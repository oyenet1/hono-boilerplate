import { Context } from "hono";

export interface ApiResponseData<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string>; // Changed from string[] to object
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    isFirstPage?: boolean;
    isLastPage?: boolean;
    hasNextPage?: boolean;
    hasPrevPage?: boolean;
    nextPage?: number | null;
    prevPage?: number | null;
    startIndex?: number;
    endIndex?: number;
  };
}

export class ApiResponse {
  static success<T>(
    c: Context,
    data: T,
    message: string = "Success",
    status: number = 200,
    meta?: ApiResponseData<T>["meta"]
  ) {
    const response: ApiResponseData<T> = {
      success: true,
      message,
      data,
    };

    if (meta) {
      response.meta = meta;
    }

    return c.json(response, status as any);
  }

  static error(
    c: Context,
    message: string = "An error occurred",
    status: number = 500,
    errors?: string[] | Record<string, string>
  ) {
    const response: ApiResponseData = {
      success: false,
      message,
    };

    if (errors) {
      if (Array.isArray(errors)) {
        // Convert array to object format
        const errorObj: Record<string, string> = {};
        errors.forEach((error, index) => {
          // Extract field name if format is "field: message"
          const colonIndex = error.indexOf(":");
          if (colonIndex > 0) {
            const field = error.substring(0, colonIndex).trim();
            const msg = error.substring(colonIndex + 1).trim();
            errorObj[field] = msg;
          } else {
            // Use generic key if no field specified
            errorObj[`error_${index + 1}`] = error;
          }
        });
        response.errors = errorObj;
      } else {
        // Already an object
        response.errors = errors;
      }
    }

    return c.json(response, status as any);
  }

  static created<T>(
    c: Context,
    data: T,
    message: string = "Resource created successfully"
  ) {
    return this.success(c, data, message, 201);
  }

  static notFound(
    c: Context,
    message: string = "The requested resource was not found"
  ) {
    return this.error(c, message, 404);
  }

  static unauthorized(
    c: Context,
    message: string = "Invalid token: Authentication required"
  ) {
    return this.error(c, message, 401);
  }

  static forbidden(
    c: Context,
    message: string = "Permission denied. You don't have access to this resource"
  ) {
    return this.error(c, message, 403);
  }

  static sessionExpired(
    c: Context,
    message: string = "Your session has expired. Please login again"
  ) {
    return this.error(c, message, 401);
  }

  static validationError(
    c: Context,
    message: string = "Validation failed. Please check your input",
    errors?: string[] | Record<string, string>
  ) {
    return this.error(c, message, 422, errors);
  }

  static badRequest(
    c: Context,
    message: string = "Invalid request. Please check your data and try again",
    errors?: string[] | Record<string, string>
  ) {
    return this.error(c, message, 400, errors);
  }

  static paginated<T>(
    c: Context,
    data: T[],
    page: number,
    limit: number,
    total: number,
    message: string = "Data retrieved successfully"
  ) {
    const totalPages = Math.ceil(total / limit);

    return this.success(c, data, message, 200, {
      page,
      limit,
      total,
      totalPages,
    });
  }
}
