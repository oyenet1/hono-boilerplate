import { injectable, inject } from "inversify";
import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { IAuthController } from "../interfaces/IAuthController";
import type { IAuthService } from "../interfaces/IAuthService";
import { TYPES } from "../di/types";

@injectable()
export class AuthController implements IAuthController {
  constructor(
    @inject(TYPES.AuthService) private authService: IAuthService
  ) {}

  async register(c: Context) {
    try {
      const userData = await c.req.json();
      const result = await this.authService.register(userData);

      return c.json(
        {
          success: true,
          message: "User registered successfully",
          data: result,
        },
        201
      );
    } catch (error) {
      throw new HTTPException(400, {
        message: error instanceof Error ? error.message : "Registration failed",
      });
    }
  }

  async login(c: Context) {
    try {
      const loginData = await c.req.json();
      const result = await this.authService.login(loginData);

      return c.json({
        success: true,
        message: "Login successful",
        data: result,
      });
    } catch (error) {
      throw new HTTPException(401, {
        message: error instanceof Error ? error.message : "Login failed",
      });
    }
  }

  async profile(c: Context) {
    try {
      const userId = c.get("userId");
      // Implementation would get user profile
      return c.json({
        success: true,
        message: "Profile retrieved successfully",
        data: { userId },
      });
    } catch (error) {
      throw new HTTPException(500, {
        message: "Failed to retrieve profile",
      });
    }
  }
}
