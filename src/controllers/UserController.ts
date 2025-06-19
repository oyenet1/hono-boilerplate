import { inject, injectable } from "inversify";
import { Context } from "hono";
import type { IUserService } from "../interfaces/IUserService";
import { TYPES } from "../di/types";
import { ResponseHelper } from "../utils/response";
import {
  NotFoundError,
  BadRequestError,
  handleDatabaseError,
} from "../utils/errorHandlers";

@injectable()
export class UserController {
  constructor(@inject(TYPES.UserService) private userService: IUserService) {}

  async getUsers(c: Context) {
    try {
      const { page = 1, limit = 10 } = c.req.query();
      const users = await this.userService.getAllUsers(
        Number(page),
        Number(limit)
      );
      return ResponseHelper.success(c, users, "Users retrieved successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to get users";
      return ResponseHelper.error(c, message, 500);
    }
  }

  async getUser(c: Context) {
    try {
      const id = c.req.param("id");
      if (!id) {
        return ResponseHelper.error(c, "User ID is required", 400);
      }
      const user = await this.userService.findById(id);
      if (!user) {
        return ResponseHelper.error(c, "User not found", 404);
      }
      return ResponseHelper.success(c, user, "User retrieved successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to get user";
      return ResponseHelper.error(c, message, 500);
    }
  }

  async updateUser(c: Context) {
    try {
      const id = c.req.param("id");
      if (!id) {
        return ResponseHelper.error(c, "User ID is required", 400);
      }
      const userData = await c.req.json();
      const user = await this.userService.updateUser(id, userData);
      if (!user) {
        return ResponseHelper.error(c, "User not found", 404);
      }
      return ResponseHelper.success(c, user, "User updated successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update user";
      return ResponseHelper.error(c, message, 500);
    }
  }

  async deleteUser(c: Context) {
    try {
      const id = c.req.param("id");
      if (!id) {
        return ResponseHelper.error(c, "User ID is required", 400);
      }
      const deleted = await this.userService.deleteUser(id);
      if (!deleted) {
        return ResponseHelper.error(c, "User not found", 404);
      }
      return ResponseHelper.success(c, null, "User deleted successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete user";
      return ResponseHelper.error(c, message, 500);
    }
  }
}
