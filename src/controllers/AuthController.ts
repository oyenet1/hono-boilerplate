import { inject, injectable } from "inversify";
import { Context } from "hono";
import type { IAuthService } from "../interfaces/IAuthService";
import { TYPES } from "../di/types";
import { ResponseHelper } from "../utils/response";
import { TokenExtractor } from "../utils/tokenExtractor";
import {
  BadRequestError,
  UnauthorizedError,
  handleDatabaseError,
} from "../utils/errorHandlers";

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
      const message =
        error instanceof Error ? error.message : "Registration failed";
      return ResponseHelper.error(c, message, 400);
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
      const message = error instanceof Error ? error.message : "Login failed";
      return ResponseHelper.error(c, message, 401);
    }
  }

  async logout(c: Context) {
    try {
      const sessionData = c.get("sessionData");
      if (!sessionData) {
        return ResponseHelper.error(c, "No active session found", 400);
      }

      // Extract token using the TokenExtractor utility
      const token = TokenExtractor.getTokenSafe(c);
      if (token) {
        // You might need to decode the token to get sessionId, or pass it differently
        // For now, we'll implement a simple logout
      }

      return ResponseHelper.success(c, null, "Logout successful");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Logout failed";
      return ResponseHelper.error(c, message, 400);
    }
  }

  async refreshSession(c: Context) {
    try {
      const { sessionId } = await c.req.json();

      if (!sessionId) {
        return ResponseHelper.error(c, "Session ID required", 400);
      }

      const result = await this.authService.refreshSession(sessionId);

      if (!result) {
        return ResponseHelper.error(c, "Invalid session", 401);
      }

      return ResponseHelper.success(
        c,
        result,
        "Session refreshed successfully"
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Session refresh failed";
      return ResponseHelper.error(c, message, 400);
    }
  }

  async profile(c: Context) {
    try {
      const userId = c.get("userId");
      if (!userId) {
        return ResponseHelper.error(c, "User not authenticated", 401);
      }

      // Fetch user profile from the authService (or userService if preferred)
      const user = await this.authService.getProfile(userId);
      if (!user) {
        return ResponseHelper.error(c, "User not found", 404);
      }

      return ResponseHelper.success(c, user, "Profile retrieved successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to retrieve profile";
      return ResponseHelper.error(c, message, 400);
    }
  }
}
