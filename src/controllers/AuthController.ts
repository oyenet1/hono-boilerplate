import { inject, injectable } from "inversify";
import { Context } from "hono";
import type { IAuthService } from "../interfaces/IAuthService";
import { TYPES } from "../di/types";
import { ApiResponse } from "../utils/response";
import { TokenExtractor } from "../utils/tokenExtractor";

@injectable()
export class AuthController {
  constructor(@inject(TYPES.AuthService) private authService: IAuthService) {}

  async register(c: Context) {
    try {
      const userData = await c.req.json();
      const ipAddress =
        c.req.header("X-Forwarded-For") || c.req.header("X-Real-IP");

      const result = await this.authService.register(userData, ipAddress);

      return ApiResponse.created(c, result, "User registered successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Registration failed";
      return ApiResponse.error(c, message, 400);
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

      return ApiResponse.success(c, result, "Login successful");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      return ApiResponse.error(c, message, 401);
    }
  }

  async logout(c: Context) {
    try {
      const sessionData = c.get("sessionData");
      if (!sessionData) {
        return ApiResponse.error(c, "No active session found", 400);
      }

      // Extract token using the TokenExtractor utility
      const token = TokenExtractor.getTokenSafe(c);
      if (token) {
        // You might need to decode the token to get sessionId, or pass it differently
        // For now, we'll implement a simple logout
      }

      return ApiResponse.success(c, null, "Logout successful");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Logout failed";
      return ApiResponse.error(c, message, 400);
    }
  }

  async refreshSession(c: Context) {
    try {
      const { sessionId } = await c.req.json();

      if (!sessionId) {
        return ApiResponse.error(c, "Session ID required", 400);
      }

      const result = await this.authService.refreshSession(sessionId);

      if (!result) {
        return ApiResponse.error(c, "Invalid session", 401);
      }

      return ApiResponse.success(c, result, "Session refreshed successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Session refresh failed";
      return ApiResponse.error(c, message, 400);
    }
  }

  async profile(c: Context) {
    try {
      const userId = c.get("userId");

      // Fetch user profile from the authService (or userService if preferred)
      const user = await this.authService.getProfile(userId);
      if (!user) {
        return ApiResponse.error(c, "User not found", 404);
      }

      return ApiResponse.success(c, user, "Profile retrieved successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to retrieve profile";
      return ApiResponse.error(c, message, 400);
    }
  }

  async getSessions(c: Context) {
    try {
      const userId = c.get("userId");
      const sessionData = c.get("sessionData");

      if (!userId) {
        return ApiResponse.error(c, "User not authenticated", 401);
      }

      const currentSessionId = sessionData?.sessionId;
      const sessions = await this.authService.getAllUserSessions(
        userId,
        currentSessionId
      );

      return ApiResponse.success(
        c,
        { sessions },
        "Sessions retrieved successfully"
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to retrieve sessions";
      return ApiResponse.error(c, message, 500);
    }
  }

  async getCurrentSession(c: Context) {
    try {
      const token = TokenExtractor.getTokenSafe(c);

      if (!token) {
        return ApiResponse.error(c, "No active session found", 401);
      }

      const currentSession = await this.authService.getCurrentSession(token);

      if (!currentSession) {
        return ApiResponse.error(c, "Session not found", 404);
      }

      return ApiResponse.success(
        c,
        { session: currentSession },
        "Current session retrieved successfully"
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to retrieve current session";
      return ApiResponse.error(c, message, 500);
    }
  }

  async revokeSession(c: Context) {
    try {
      const userId = c.get("userId");
      const { sessionId } = await c.req.json();

      if (!userId) {
        return ApiResponse.error(c, "User not authenticated", 401);
      }

      if (!sessionId) {
        return ApiResponse.error(c, "Session ID is required", 400);
      }

      const success = await this.authService.revokeSession(sessionId, userId);

      if (!success) {
        return ApiResponse.error(c, "Failed to revoke session", 500);
      }

      return ApiResponse.success(c, null, "Session revoked successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to revoke session";
      return ApiResponse.error(c, message, 500);
    }
  }

  async revokeAllOtherSessions(c: Context) {
    try {
      const userId = c.get("userId");
      const sessionData = c.get("sessionData");

      if (!userId || !sessionData?.sessionId) {
        return ApiResponse.error(c, "User not authenticated", 401);
      }

      const revokedCount = await this.authService.revokeAllOtherSessions(
        sessionData.sessionId,
        userId
      );

      return ApiResponse.success(
        c,
        { revokedCount },
        `Successfully revoked ${revokedCount} other session(s)`
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to revoke other sessions";
      return ApiResponse.error(c, message, 500);
    }
  }
}
