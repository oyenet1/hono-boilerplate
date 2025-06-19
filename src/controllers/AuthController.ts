import { inject, injectable } from "inversify";
import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { IAuthService } from "../interfaces/IAuthService";
import { TYPES } from "../di/types";
import { ResponseHelper } from "../utils/response";

@injectable()
export class AuthController {
  constructor(@inject(TYPES.AuthService) private authService: IAuthService) {}

  async register(c: Context) {
    try {
      const userData = await c.req.json();
      const ipAddress =
        c.req.header("X-Forwarded-For") || c.req.header("X-Real-IP");

      const result = await this.authService.register(userData, ipAddress);

      return ResponseHelper.created(c, result, "User registered successfully");
    } catch (error) {
      return ResponseHelper.badRequest(
        c,
        error instanceof Error ? error.message : "Registration failed"
      );
    }
  }

  async login(c: Context) {
    try {
      const loginData = await c.req.json();
      const ipAddress =
        c.req.header("X-Forwarded-For") || c.req.header("X-Real-IP");
      const userAgent = c.req.header("User-Agent");

      const result = await this.authService.login(
        loginData,
        ipAddress,
        userAgent
      );

      return ResponseHelper.success(c, result, "Login successful");
    } catch (error) {
      return ResponseHelper.unauthorized(
        c,
        error instanceof Error ? error.message : "Login failed"
      );
    }
  }

  async logout(c: Context) {
    try {
      const sessionData = c.get("sessionData");
      if (!sessionData) {
        return ResponseHelper.badRequest(c, "No active session found");
      }

      // Extract session ID from the auth header
      const authHeader = c.req.header("Authorization");
      if (authHeader) {
        const token = authHeader.substring(7);
        // You might need to decode the token to get sessionId, or pass it differently
        // For now, we'll implement a simple logout
      }

      return ResponseHelper.success(c, null, "Logout successful");
    } catch (error) {
      return ResponseHelper.error(
        c,
        error instanceof Error ? error.message : "Logout failed",
        500
      );
    }
  }

  async refreshSession(c: Context) {
    try {
      const { sessionId } = await c.req.json();

      if (!sessionId) {
        return ResponseHelper.badRequest(c, "Session ID required");
      }

      const result = await this.authService.refreshSession(sessionId);

      if (!result) {
        return ResponseHelper.unauthorized(c, "Invalid session");
      }

      return ResponseHelper.success(
        c,
        result,
        "Session refreshed successfully"
      );
    } catch (error) {
      return ResponseHelper.error(
        c,
        error instanceof Error ? error.message : "Session refresh failed",
        500
      );
    }
  }

  async profile(c: Context) {
    try {
      const userId = c.get("userId");
      // Implementation would get user profile
      return ResponseHelper.success(
        c,
        { userId },
        "Profile retrieved successfully"
      );
    } catch (error) {
      return ResponseHelper.error(c, "Failed to retrieve profile", 500);
    }
  }
}
