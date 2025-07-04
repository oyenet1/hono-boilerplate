import { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { appConfig } from "../config/app";
import { redisManager } from "../config/redis";
import { container } from "../di/container";
import { TYPES } from "../di/types";
import { SecureAuthService } from "../services/SecureAuthService";
import { TokenExtractor } from "../utils/tokenExtractor";
import { ApiResponse } from "../utils/response";
import logger from "../utils/logger";
import { stringifyAsync } from "../utils/asyncJson";

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export const secureAuthMiddleware = async (c: Context, next: Next) => {
  const token = TokenExtractor.getTokenSafe(c);

  if (!token) {
    return ApiResponse.error(c, "Authentication token is required", 401);
  }

  try {
    const authService = container.get<SecureAuthService>(TYPES.AuthService);
    const sessionData = await authService.verifySession(token);

    if (!sessionData) {
      return ApiResponse.error(
        c,
        "Your session has expired. Please login again",
        419
      );
    }

    // Set user context
    c.set("userId", sessionData.userId);
    c.set("userEmail", sessionData.email);
    c.set("sessionData", sessionData);

    // Get IP and User Agent for security tracking
    const ipAddress =
      c.req.header("X-Forwarded-For") || c.req.header("X-Real-IP") || "unknown";
    const userAgent = c.req.header("User-Agent") || "unknown";

    c.set("ipAddress", ipAddress);
    c.set("userAgent", userAgent);

    await next();
  } catch (error) {
    console.error("Authentication error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Authentication failed. Please login to continue";
    return ApiResponse.error(c, message, 401);
  }
};

export const createRateLimitMiddleware = (rateLimitConfig: RateLimitConfig) => {
  return async (c: Context, next: Next) => {
    try {
      // Get IP address with proper header precedence
      const ipAddress =
        c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ||
        c.req.header("X-Real-IP") ||
        c.req.header("CF-Connecting-IP") || // Cloudflare
        "unknown";

      const userId = c.get("userId");
      const userAgent = c.req.header("User-Agent") || "unknown";

      // Create multiple rate limiting strategies
      let identifier: string;
      let rateLimitMax = rateLimitConfig.max;

      if (userId) {
        // For authenticated users: Use user ID (most accurate)
        identifier = `user:${userId}`;
      } else {
        // For unauthenticated users: Use combination of IP + User Agent
        // This helps differentiate between different browsers/devices behind same NAT
        const browserFingerprint = Buffer.from(userAgent)
          .toString("base64")
          .substring(0, 16);
        identifier = `ip:${ipAddress}:ua:${browserFingerprint}`;

        // Increase limits for IP-based limiting to account for NAT scenarios
        // Scale up the limit for shared IPs
        rateLimitMax = Math.floor(rateLimitConfig.max * 1.5); // 50% higher for shared networks
      }

      // Get route path for specific rate limiting
      const route = c.req.path;
      const method = c.req.method;
      const rateLimitKey = `${identifier}:${method}:${route}`;

      // Check rate limit
      const windowSeconds = Math.floor(rateLimitConfig.windowMs / 1000);
      const { count, resetTime, allowed } =
        await redisManager.incrementRateLimit(
          rateLimitKey,
          windowSeconds,
          rateLimitMax
        );

      // Set rate limit headers
      c.header("X-RateLimit-Limit", rateLimitMax.toString());
      c.header(
        "X-RateLimit-Remaining",
        Math.max(0, rateLimitMax - count).toString()
      );
      c.header("X-RateLimit-Reset", new Date(resetTime).toISOString());
      c.header("X-RateLimit-Strategy", userId ? "user-based" : "ip-ua-based");

      if (!allowed) {
        const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
        c.header("Retry-After", retryAfter.toString());

        // Enhanced error message for NAT scenarios
        const message = userId
          ? rateLimitConfig.message ||
            "Too many requests, please try again later"
          : "Rate limit exceeded. If you're on a shared network, please try again later or login to increase your limits";

        throw new HTTPException(429, { message });
      }

      await next();

      // Skip counting successful requests if configured
      if (rateLimitConfig.skipSuccessfulRequests && c.res.status < 400) {
        // This would require decrementing the counter, but Redis INCR doesn't support that easily
        // For production, consider using a sliding window approach
      }
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      console.error("Rate limiting error:", error);
      // Don't block request if rate limiting fails
      await next();
    }
  };
};

// Predefined rate limit configurations - Optimized for 10K+ users
export const rateLimits = {
  // Authentication endpoints - increased for scale
  auth: createRateLimitMiddleware({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 50, // Increased from 10 to 50 for higher traffic
    message: "Too many authentication attempts, please try again later",
  }),

  // OTP sending - slightly more flexible
  otpSend: createRateLimitMiddleware({
    windowMs: 3 * 60 * 1000, // 3 minutes (reduced from 5)
    max: 2, // Increased from 1 to 2 for better UX
    message:
      "OTP can only be sent twice every 3 minutes. Please wait before requesting another OTP",
  }),

  // OTP verification - more attempts allowed
  otpVerify: createRateLimitMiddleware({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // Increased from 3 to 10 for better UX
    message:
      "Too many OTP verification attempts. Please wait 5 minutes before trying again",
  }),

  // API endpoints - significantly increased for scale
  api: createRateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    max: 1000, // Increased from 120 to 1000 for high traffic
    message: "Rate limit exceeded, please slow down",
  }),

  // Public endpoints - increased for scale
  public: createRateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    max: 2000, // Increased from 200 to 2000 for high traffic
    message: "Rate limit exceeded",
  }),

  // Sensitive operations - slightly more flexible
  sensitive: createRateLimitMiddleware({
    windowMs: 30 * 60 * 1000, // 30 minutes (reduced from 60)
    max: 10, // Increased from 5 to 10
    message: "Too many sensitive operations, please try again later",
  }),
};

export const corsMiddleware = async (c: Context, next: Next) => {
  // Set secure CORS headers
  c.header("Access-Control-Allow-Origin", appConfig.cors.origin);
  c.header(
    "Access-Control-Allow-Methods",
    appConfig.cors.allowMethods.join(", ")
  );
  c.header(
    "Access-Control-Allow-Headers",
    appConfig.cors.allowHeaders.join(", ")
  );
  c.header("Access-Control-Allow-Credentials", "true");
  c.header("Access-Control-Max-Age", "86400");

  if (c.req.method === "OPTIONS") {
    return c.text("", 200);
  }

  await next();
};

export const securityHeadersMiddleware = async (c: Context, next: Next) => {
  // Set security headers
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("X-XSS-Protection", "1; mode=block");
  c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Content-Security-Policy", "default-src 'self'");

  await next();
};

export const loggerMiddleware = async (c: Context, next: Next) => {
  const start = Date.now();
  const method = c.req.method;
  const url = c.req.url;
  const userAgent = c.req.header("User-Agent") || "unknown";
  const ipAddress =
    c.req.header("X-Forwarded-For") || c.req.header("X-Real-IP") || "unknown";
  const userId = c.get("userId");

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  // Create detailed log entry
  const logEntry = {
    timestamp: new Date().toISOString(),
    method,
    url,
    status,
    duration: `${duration}ms`,
    ipAddress,
    userAgent,
    userId: userId || null,
  };

  // Log to console (in production, use proper logging service)
  const logString = await stringifyAsync(logEntry);
  console.log(logString);

  // Log to Redis for analytics (optional)
  if (redisManager.isRedisConnected()) {
    try {
      const logKey = `logs:${new Date().toISOString().split("T")[0]}`;
      const client = redisManager.getClient();
      await client.lpush(logKey, logString);
      await client.expire(logKey, 7 * 24 * 60 * 60); // Keep logs for 7 days
    } catch (error) {
      console.error("Failed to log to Redis:", error);
    }
  }
};

export const globalErrorHandler = async (
  err: Error,
  c: Context
): Promise<Response> => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }

  await logger.error("Unhandled error:", err);

  // Avoid leaking error details in production
  const errorMessage =
    appConfig.env === "production" ? "Internal Server Error" : err.message;

  return c.json({ error: errorMessage }, 500);
};
