import "dotenv/config";

const parsedBcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || "12");

export const appConfig = {
  port: Number(process.env.PORT) || 3000,
  env: process.env.NODE_ENV || "development",
  database: {
    url: process.env.DATABASE_URL || "sqlite://./dev.db",
  },
  jwt: {
    secret: process.env.JWT_SECRET || "your-secret-key",
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  },
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  },
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || "0"),
    keyPrefix: process.env.REDIS_KEY_PREFIX || "hono:",
  },
  security: {
    sessionTTL: parseInt(process.env.SESSION_TTL || "3600"),
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || "5"),
    loginAttemptWindow: parseInt(process.env.LOGIN_ATTEMPT_WINDOW || "900"),
    passwordResetTTL: parseInt(process.env.PASSWORD_RESET_TTL || "900"),
    bcryptRounds: Number.isNaN(parsedBcryptRounds) ? 10 : parsedBcryptRounds,
  },
  rateLimit: {
    window: parseInt(process.env.RATE_LIMIT_WINDOW || "60"),
    max: parseInt(process.env.RATE_LIMIT_MAX || "100"),
  },
};

// Export as 'config' for backward compatibility
export const config = appConfig;
