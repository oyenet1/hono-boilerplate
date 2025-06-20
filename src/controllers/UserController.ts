import { inject, injectable } from "inversify";
import { Context } from "hono";
import type { IUserService } from "../interfaces/IUserService";
import { TYPES } from "../di/types";
import { ApiResponse } from "../utils/response";
import { UserResource } from "../resources/UserResource";
import { SortField } from "../interfaces/IDatabase";

@injectable()
export class UserController {
  private userResource = new UserResource();

  constructor(@inject(TYPES.UserService) private userService: IUserService) {}

  async getUsers(c: Context) {
    try {
      const query = c.req.query();
      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 10;
      const search = query.search || undefined;

      // Parse sortBy parameter: ?sortBy=name:asc,createdAt:desc
      let sortBy: SortField[] | undefined;
      if (query.sortBy) {
        sortBy = query.sortBy.split(",").map((sort) => {
          const [column, order] = sort.split(":");
          return {
            column,
            order: (order as "asc" | "desc") || "asc",
          };
        });
      }

      const result = await this.userService.getAllUsers({
        page,
        limit,
        search,
        sortBy,
      });

      return ApiResponse.success(c, result, "Users retrieved successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to get users";
      return ApiResponse.error(c, message, 500);
    }
  }

  async getUser(c: Context) {
    try {
      const id = c.req.param("id");
      if (!id) {
        return ApiResponse.error(c, "User ID is required", 400);
      }

      const user = await this.userService.findById(id);
      if (!user) {
        return ApiResponse.error(c, "User not found", 404);
      }

      // Transform the user using the resource
      const transformedUser = this.userResource.transform(user);
      return ApiResponse.success(
        c,
        transformedUser,
        "User retrieved successfully"
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to get user";
      return ApiResponse.error(c, message, 500);
    }
  }

  async updateUser(c: Context) {
    try {
      const id = c.req.param("id");
      if (!id) {
        return ApiResponse.error(c, "User ID is required", 400);
      }
      const userData = await c.req.json();
      const user = await this.userService.updateUser(id, userData);
      if (!user) {
        return ApiResponse.error(c, "User not found", 404);
      }

      // Transform the updated user using the resource
      const transformedUser = this.userResource.transform(user);
      return ApiResponse.success(
        c,
        transformedUser,
        "User updated successfully"
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update user";
      return ApiResponse.error(c, message, 500);
    }
  }

  async deleteUser(c: Context) {
    try {
      const id = c.req.param("id");
      if (!id) {
        return ApiResponse.error(c, "User ID is required", 400);
      }
      const deleted = await this.userService.deleteUser(id);
      if (!deleted) {
        return ApiResponse.error(c, "User not found", 404);
      }
      return ApiResponse.success(c, null, "User deleted successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete user";
      return ApiResponse.error(c, message, 500);
    }
  }
}
