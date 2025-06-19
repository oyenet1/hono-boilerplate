import { inject, injectable } from "inversify";
import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { IAuthService } from "../interfaces/IAuthService";
import { TYPES } from "../di/types";

@injectable()
export class AuthController {
  constructor(@inject(TYPES.AuthService) private authService: IAuthService) {}

  async register(c: Context) {
    try {
      const userData = await c.req.json();
      const ipAddress = c.req.header("X-Forwarded-For") || c.req.header("X-Real-IP");
      
      const result = await this.authService.register(userData, ipAddress);

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
      const ipAddress = c.req.header("X-Forwarded-For") || c.req.header("X-Real-IP");
      const userAgent = c.req.header("User-Agent");
      
      const result = await this.authService.login(loginData, ipAddress, userAgent);

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

  async logout(c: Context) {
    try {
      const sessionData = c.get("sessionData");
      if (!sessionData) {
        throw new HTTPException(400, { message: "No active session found" });
      }

      // Extract session ID from the auth header
      const authHeader = c.req.header("Authorization");
      if (authHeader) {
        const token = authHeader.substring(7);
        // You might need to decode the token to get sessionId, or pass it differently
        // For now, we'll implement a simple logout
      }

      return c.json({
        success: true,
        message: "Logout successful",
      });
    } catch (error) {
      throw new HTTPException(500, {
        message: error instanceof Error ? error.message : "Logout failed",
      });
    }
  }

  async refreshSession(c: Context) {
    try {
      const { sessionId } = await c.req.json();
      
      if (!sessionId) {
        throw new HTTPException(400, { message: "Session ID required" });
      }

      const result = await this.authService.refreshSession(sessionId);
      
      if (!result) {
        throw new HTTPException(401, { message: "Invalid session" });
      }

      return c.json({
        success: true,
        message: "Session refreshed successfully",
        data: result,
      });
    } catch (error) {
      throw new HTTPException(500, {
        message: error instanceof Error ? error.message : "Session refresh failed",
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
