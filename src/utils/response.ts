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

    return c.json(response, status);
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

    return c.json(response, status);
  }

  static created<T>(
    c: Context,
    data: T,
    message: string = "Resource created successfully"
  ) {
    return this.success(c, data, message, 201);
  }

  static notFound(c: Context, message: string = "Resource not found") {
    return this.error(c, message, 404);
  }

  static unauthorized(c: Context, message: string = "Unauthorized") {
    return this.error(c, message, 401);
  }

  static forbidden(c: Context, message: string = "Forbidden") {
    return this.error(c, message, 403);
  }

  static badRequest(
    c: Context,
    message: string = "Bad request",
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
