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
      throw handleDatabaseError(error);
    }
  }

  async getUser(c: Context) {
    try {
      const id = c.req.param("id");
      if (!id) {
        throw new BadRequestError("User ID is required");
      }

      const user = await this.userService.findById(id);

      if (!user) {
        throw new NotFoundError("User");
      }

      return ResponseHelper.success(c, user, "User retrieved successfully");
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BadRequestError) {
        throw error;
      }
      throw handleDatabaseError(error);
    }
  }

  async updateUser(c: Context) {
    try {
      const id = c.req.param("id");
      if (!id) {
        throw new BadRequestError("User ID is required");
      }

      const userData = await c.req.json();
      const user = await this.userService.updateUser(id, userData);

      if (!user) {
        throw new NotFoundError("User");
      }

      return ResponseHelper.success(c, user, "User updated successfully");
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BadRequestError) {
        throw error;
      }
      throw handleDatabaseError(error);
    }
  }

  async deleteUser(c: Context) {
    try {
      const id = c.req.param("id");
      if (!id) {
        throw new BadRequestError("User ID is required");
      }

      const deleted = await this.userService.deleteUser(id);

      if (!deleted) {
        throw new NotFoundError("User");
      }

      return ResponseHelper.success(c, null, "User deleted successfully");
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BadRequestError) {
        throw error;
      }
      throw handleDatabaseError(error);
    }
  }
}
