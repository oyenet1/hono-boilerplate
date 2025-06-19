import { Context } from "hono";

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export class ResponseHelper {
  static success<T>(
    c: Context,
    data: T,
    message: string = "Success",
    status: number = 200,
    meta?: ApiResponse<T>["meta"]
  ) {
    const response: ApiResponse<T> = {
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
    errors?: string[]
  ) {
    const response: ApiResponse = {
      success: false,
      message,
    };

    if (errors && errors.length > 0) {
      response.errors = errors;
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
    errors?: string[]
  ) {
    return this.error(c, message, 422, errors);
  }

  static badRequest(
    c: Context,
    message: string = "Invalid request. Please check your data and try again",
    errors?: string[]
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
