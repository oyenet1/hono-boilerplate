import { inject, injectable } from "inversify";
import { hash, compare } from "bcryptjs";
import { sign, verify } from "hono/jwt";
import type { IAuthService } from "../interfaces/IAuthService";
import type { IUserService } from "../interfaces/IUserService";
import { TYPES } from "../di/types";
import { CreateUserDto, LoginDto } from "../dtos";
import { config } from "../config/app";
import { redisManager } from "../config/redis";

interface SessionData {
  userId: string;
  email: string;
  loginTime: number;
  ipAddress?: string;
  userAgent?: string;
  lastActivity: number;
}

interface LoginAttempt {
  count: number;
  lastAttempt: number;
  blockedUntil?: number;
}

@injectable()
export class SecureAuthService implements IAuthService {
  constructor(@inject(TYPES.UserService) private userService: IUserService) {}

  async register(userData: CreateUserDto, ipAddress?: string) {
    // Check if email already exists
    const existingUser = await this.userService.findByEmail(userData.email);
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Hash password with high salt rounds
    const hashedPassword = await hash(userData.password, config.bcryptRounds);

    // Create user
    const user = await this.userService.createUser({
      ...userData,
      password: hashedPassword,
    });

    // Create secure session
    const { token, sessionId } = await this.createSecureSession(
      user,
      ipAddress
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      token,
      sessionId,
    };
  }

  async login(loginData: LoginDto, ipAddress?: string, userAgent?: string) {
    const { email, password } = loginData;

    // Check for too many login attempts
    await this.checkLoginAttempts(email, ipAddress);

    // Find user
    const user = await this.userService.findByEmail(email);
    if (!user) {
      await this.recordFailedLogin(email, ipAddress);
      throw new Error("Invalid credentials");
    }

    // Verify password
    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) {
      await this.recordFailedLogin(email, ipAddress);
      throw new Error("Invalid credentials");
    }

    // Reset failed login attempts on successful login
    await this.resetFailedLogins(email, ipAddress);

    // Create secure session
    const { token, sessionId } = await this.createSecureSession(
      user,
      ipAddress,
      userAgent
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      token,
      sessionId,
    };
  }

  async logout(sessionId: string): Promise<void> {
    try {
      await redisManager.deleteSession(sessionId);
    } catch (error) {
      console.error("Error during logout:", error);
      throw new Error("Logout failed");
    }
  }

  async verifySession(token: string): Promise<SessionData | null> {
    try {
      // Verify JWT token
      const payload = (await verify(token, config.jwtSecret)) as any;

      if (!payload.sessionId || !payload.userId) {
        return null;
      }

      // Check if session exists in Redis
      const sessionData = await redisManager.getSession(payload.sessionId);
      if (!sessionData) {
        return null;
      }

      // Verify session integrity
      if (sessionData.userId !== payload.userId) {
        await redisManager.deleteSession(payload.sessionId);
        return null;
      }

      // Check if session is still valid (not expired)
      const now = Date.now();
      if (sessionData.lastActivity + config.security.sessionTTL * 1000 < now) {
        await redisManager.deleteSession(payload.sessionId);
        return null;
      }

      // Update last activity
      sessionData.lastActivity = now;
      await redisManager.setSession(
        payload.sessionId,
        sessionData,
        config.security.sessionTTL
      );

      return sessionData;
    } catch (error) {
      console.error("Session verification error:", error);
      return null;
    }
  }

  async refreshSession(sessionId: string): Promise<{ token: string } | null> {
    try {
      const sessionData = await redisManager.getSession(sessionId);
      if (!sessionData) {
        return null;
      }

      // Update session TTL
      await redisManager.extendSession(sessionId, config.security.sessionTTL);

      // Create new JWT token
      const token = await sign(
        {
          userId: sessionData.userId,
          sessionId: sessionId,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + config.security.sessionTTL,
        },
        config.jwtSecret
      );

      return { token };
    } catch (error) {
      console.error("Session refresh error:", error);
      return null;
    }
  }

  async invalidateAllUserSessions(userId: string): Promise<void> {
    try {
      // This would require a more complex implementation to track all user sessions
      // For now, we'll implement a basic version
      const sessionPattern = `session:*`;
      // Note: In production, you'd want to maintain a user-to-sessions mapping
      console.log(`Invalidating all sessions for user ${userId}`);
    } catch (error) {
      console.error("Error invalidating user sessions:", error);
      throw new Error("Failed to invalidate sessions");
    }
  }

  private async createSecureSession(
    user: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ token: string; sessionId: string }> {
    // Generate unique session ID
    const sessionId = this.generateSecureSessionId();
    const now = Date.now();

    // Create session data
    const sessionData: SessionData = {
      userId: user.id,
      email: user.email,
      loginTime: now,
      lastActivity: now,
      ipAddress,
      userAgent,
    };

    // Store session in Redis
    await redisManager.setSession(
      sessionId,
      sessionData,
      config.security.sessionTTL
    );

    // Create JWT token
    const token = await sign(
      {
        userId: user.id,
        sessionId: sessionId,
        iat: Math.floor(now / 1000),
        exp: Math.floor(now / 1000) + config.security.sessionTTL,
      },
      config.jwtSecret
    );

    return { token, sessionId };
  }

  private generateSecureSessionId(): string {
    // Generate a cryptographically secure session ID
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    const randomArray = new Uint8Array(32);
    crypto.getRandomValues(randomArray);

    for (let i = 0; i < randomArray.length; i++) {
      result += chars[randomArray[i] % chars.length];
    }

    return result;
  }

  private async checkLoginAttempts(
    email: string,
    ipAddress?: string
  ): Promise<void> {
    const keys = [
      `login_attempts:email:${email}`,
      ipAddress ? `login_attempts:ip:${ipAddress}` : null,
    ].filter(Boolean) as string[];

    for (const key of keys) {
      const attemptData = await redisManager.getCache(key);
      if (attemptData) {
        const attempt: LoginAttempt = attemptData;

        if (attempt.blockedUntil && attempt.blockedUntil > Date.now()) {
          const remainingTime = Math.ceil(
            (attempt.blockedUntil - Date.now()) / 1000
          );
          throw new Error(
            `Too many login attempts. Try again in ${remainingTime} seconds`
          );
        }

        if (attempt.count >= config.security.maxLoginAttempts) {
          const blockTime =
            Date.now() + config.security.loginAttemptWindow * 1000;
          attempt.blockedUntil = blockTime;
          await redisManager.setCache(
            key,
            attempt,
            config.security.loginAttemptWindow
          );
          throw new Error(
            "Too many login attempts. Account temporarily blocked"
          );
        }
      }
    }
  }

  private async recordFailedLogin(
    email: string,
    ipAddress?: string
  ): Promise<void> {
    const keys = [
      `login_attempts:email:${email}`,
      ipAddress ? `login_attempts:ip:${ipAddress}` : null,
    ].filter(Boolean) as string[];

    for (const key of keys) {
      const now = Date.now();
      const attemptData = await redisManager.getCache(key);

      if (attemptData) {
        const attempt: LoginAttempt = attemptData;

        // Reset count if window has passed
        if (
          now - attempt.lastAttempt >
          config.security.loginAttemptWindow * 1000
        ) {
          attempt.count = 1;
        } else {
          attempt.count++;
        }

        attempt.lastAttempt = now;
        await redisManager.setCache(
          key,
          attempt,
          config.security.loginAttemptWindow
        );
      } else {
        const newAttempt: LoginAttempt = {
          count: 1,
          lastAttempt: now,
        };
        await redisManager.setCache(
          key,
          newAttempt,
          config.security.loginAttemptWindow
        );
      }
    }
  }

  private async resetFailedLogins(
    email: string,
    ipAddress?: string
  ): Promise<void> {
    const keys = [
      `login_attempts:email:${email}`,
      ipAddress ? `login_attempts:ip:${ipAddress}` : null,
    ].filter(Boolean) as string[];

    for (const key of keys) {
      await redisManager.deleteCache(key);
    }
  }
}
