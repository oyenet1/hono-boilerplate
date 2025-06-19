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
      if (error instanceof Error) {
        if (error.message.includes("already exists")) {
          throw new BadRequestError(error.message);
        }
        throw handleDatabaseError(error);
      }
      throw new BadRequestError("Registration failed");
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
      if (error instanceof Error) {
        if (
          error.message.includes("Invalid credentials") ||
          error.message.includes("not found")
        ) {
          throw new UnauthorizedError("Invalid email or password");
        }
        if (
          error.message.includes("blocked") ||
          error.message.includes("attempts")
        ) {
          throw new UnauthorizedError(error.message);
        }
      }
      throw new UnauthorizedError("Login failed");
    }
  }

  async logout(c: Context) {
    try {
      const sessionData = c.get("sessionData");
      if (!sessionData) {
        throw new BadRequestError("No active session found");
      }

      // Extract token using the TokenExtractor utility
      const token = TokenExtractor.getTokenSafe(c);
      if (token) {
        // You might need to decode the token to get sessionId, or pass it differently
        // For now, we'll implement a simple logout
      }

      return ResponseHelper.success(c, null, "Logout successful");
    } catch (error) {
      if (error instanceof BadRequestError) {
        throw error;
      }
      throw new BadRequestError("Logout failed");
    }
  }

  async refreshSession(c: Context) {
    try {
      const { sessionId } = await c.req.json();

      if (!sessionId) {
        throw new BadRequestError("Session ID required");
      }

      const result = await this.authService.refreshSession(sessionId);

      if (!result) {
        throw new UnauthorizedError("Invalid session");
      }

      return ResponseHelper.success(
        c,
        result,
        "Session refreshed successfully"
      );
    } catch (error) {
      if (
        error instanceof BadRequestError ||
        error instanceof UnauthorizedError
      ) {
        throw error;
      }
      throw new BadRequestError("Session refresh failed");
    }
  }

  async profile(c: Context) {
    try {
      const userId = c.get("userId");
      if (!userId) {
        throw new UnauthorizedError("User not authenticated");
      }

      // Implementation would get user profile
      return ResponseHelper.success(
        c,
        { userId },
        "Profile retrieved successfully"
      );
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      throw new BadRequestError("Failed to retrieve profile");
    }
  }
}
