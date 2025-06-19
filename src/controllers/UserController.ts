import { inject, injectable } from "inversify";
import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { IUserService } from "../interfaces/IUserService";
import { TYPES } from "../di/types";

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

      return c.json({
        success: true,
        message: "Users retrieved successfully",
        data: users,
      });
    } catch (error) {
      throw new HTTPException(500, {
        message: "Failed to retrieve users",
      });
    }
  }

  async getUser(c: Context) {
    try {
      const id = Number(c.req.param("id"));
      const user = await this.userService.findById(id);

      if (!user) {
        throw new HTTPException(404, { message: "User not found" });
      }

      return c.json({
        success: true,
        message: "User retrieved successfully",
        data: user,
      });
    } catch (error) {
      if (error instanceof HTTPException) throw error;
      throw new HTTPException(500, {
        message: "Failed to retrieve user",
      });
    }
  }

  async updateUser(c: Context) {
    try {
      const id = Number(c.req.param("id"));
      const userData = await c.req.json();
      const user = await this.userService.updateUser(id, userData);

      return c.json({
        success: true,
        message: "User updated successfully",
        data: user,
      });
    } catch (error) {
      throw new HTTPException(500, {
        message:
          error instanceof Error ? error.message : "Failed to update user",
      });
    }
  }

  async deleteUser(c: Context) {
    try {
      const id = Number(c.req.param("id"));
      await this.userService.deleteUser(id);

      return c.json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      throw new HTTPException(500, {
        message: "Failed to delete user",
      });
    }
  }
}
