import { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { config } from "../config/app";
import { redisManager } from "../config/redis";
import { container } from "../di/container";
import { TYPES } from "../di/types";
import { SecureAuthService } from "../services/SecureAuthService";
import { TokenExtractor } from "../utils/tokenExtractor";

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export const secureAuthMiddleware = async (c: Context, next: Next) => {
  const token = TokenExtractor.getToken(c);

  try {
    const authService = container.get<SecureAuthService>(TYPES.AuthService);
    const sessionData = await authService.verifySession(token);

    if (!sessionData) {
      throw new HTTPException(401, {
        message: "Your session has expired. Please login again",
      });
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
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error("Authentication error:", error);
    throw new HTTPException(401, {
      message: "Authentication failed. Please login to continue",
    });
  }
};

export const createRateLimitMiddleware = (rateLimitConfig: RateLimitConfig) => {
  return async (c: Context, next: Next) => {
    try {
      // Get identifier for rate limiting (IP + User ID if authenticated)
      const ipAddress =
        c.req.header("X-Forwarded-For") ||
        c.req.header("X-Real-IP") ||
        "unknown";
      const userId = c.get("userId");
      const identifier = userId ? `user:${userId}` : `ip:${ipAddress}`;

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
          rateLimitConfig.max
        );

      // Set rate limit headers
      c.header("X-RateLimit-Limit", rateLimitConfig.max.toString());
      c.header(
        "X-RateLimit-Remaining",
        Math.max(0, rateLimitConfig.max - count).toString()
      );
      c.header("X-RateLimit-Reset", new Date(resetTime).toISOString());

      if (!allowed) {
        const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
        c.header("Retry-After", retryAfter.toString());

        throw new HTTPException(429, {
          message:
            rateLimitConfig.message ||
            "Too many requests, please try again later",
        });
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

// Predefined rate limit configurations
export const rateLimits = {
  // Strict rate limiting for authentication endpoints
  auth: createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per 15 minutes
    message: "Too many authentication attempts, please try again later",
  }),

  // Moderate rate limiting for API endpoints
  api: createRateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: "Rate limit exceeded, please slow down",
  }),

  // Lenient rate limiting for public endpoints
  public: createRateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: "Rate limit exceeded",
  }),

  // Very strict for sensitive operations
  sensitive: createRateLimitMiddleware({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 attempts per hour
    message: "Too many sensitive operations, please try again later",
  }),
};

export const corsMiddleware = async (c: Context, next: Next) => {
  // Set secure CORS headers
  c.header("Access-Control-Allow-Origin", config.cors.origin);
  c.header("Access-Control-Allow-Methods", config.cors.allowMethods.join(", "));
  c.header("Access-Control-Allow-Headers", config.cors.allowHeaders.join(", "));
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
  console.log(JSON.stringify(logEntry));

  // Log to Redis for analytics (optional)
  if (redisManager.isRedisConnected()) {
    try {
      const logKey = `logs:${new Date().toISOString().split("T")[0]}`;
      await redisManager.getClient().lpush(logKey, JSON.stringify(logEntry));
      await redisManager.getClient().expire(logKey, 7 * 24 * 60 * 60); // Keep logs for 7 days
    } catch (error) {
      console.error("Failed to log to Redis:", error);
    }
  }
};

export const errorHandler = (err: Error, c: Context) => {
  const ipAddress =
    c.req.header("X-Forwarded-For") || c.req.header("X-Real-IP") || "unknown";
  const userId = c.get("userId");

  // Log error with context
  console.error("Error occurred:", {
    error: err.message,
    stack: err.stack,
    url: c.req.url,
    method: c.req.method,
    ipAddress,
    userId,
    timestamp: new Date().toISOString(),
  });

  if (err instanceof HTTPException) {
    return c.json(
      {
        success: false,
        message: err.message,
        timestamp: new Date().toISOString(),
      },
      err.status
    );
  }

  // Don't expose internal errors in production
  const message =
    config.NODE_ENV === "production" ? "Internal Server Error" : err.message;

  return c.json(
    {
      success: false,
      message: message,
      timestamp: new Date().toISOString(),
    },
    500
  );
};
