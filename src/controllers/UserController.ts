import { inject, injectable } from "inversify";
import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { IUserService } from "../interfaces/IUserService";
import { TYPES } from "../di/types";
import { ResponseHelper } from "../utils/response";

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
      return ResponseHelper.error(c, "Failed to retrieve users", 500);
    }
  }

  async getUser(c: Context) {
    try {
      const id = c.req.param("id");
      const user = await this.userService.findById(id);

      if (!user) {
        return ResponseHelper.notFound(c, "User not found");
      }

      return ResponseHelper.success(c, user, "User retrieved successfully");
    } catch (error) {
      return ResponseHelper.error(c, "Failed to retrieve user", 500);
    }
  }

  async updateUser(c: Context) {
    try {
      const id = c.req.param("id");
      const userData = await c.req.json();
      const user = await this.userService.updateUser(id, userData);

      if (!user) {
        return ResponseHelper.notFound(c, "User not found");
      }

      return ResponseHelper.success(c, user, "User updated successfully");
    } catch (error) {
      return ResponseHelper.error(
        c,
        error instanceof Error ? error.message : "Failed to update user",
        500
      );
    }
  }

  async deleteUser(c: Context) {
    try {
      const id = c.req.param("id");
      const deleted = await this.userService.deleteUser(id);

      if (!deleted) {
        return ResponseHelper.notFound(c, "User not found");
      }

      return ResponseHelper.success(c, null, "User deleted successfully");
    } catch (error) {
      return ResponseHelper.error(c, "Failed to delete user", 500);
    }
  }
}
