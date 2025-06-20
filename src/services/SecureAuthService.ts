import { randomUUID } from "crypto";
import { inject, injectable } from "inversify";
import { hash, compare } from "bcryptjs";
import { sign, verify } from "hono/jwt";
import type { IAuthService, UserSession } from "../interfaces/IAuthService";
import type { IUserService } from "../interfaces/IUserService";
import { TYPES } from "../di/types";
import { CreateUserDto, LoginDto } from "../dtos";
import { appConfig } from "../config/app";
import { redisManager } from "../config/redis";
import { stringifyAsync, parseAsync, safeParse } from "../utils/asyncJson";

interface SessionData {
  sessionId: string;
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
    const hashedPassword = await hash(
      userData.password,
      appConfig.security.bcryptRounds
    );

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
      const sessionKey = `session:${sessionId}`;
      const sessionDataString = await redisManager.get(sessionKey);

      if (sessionDataString) {
        const sessionData: SessionData = await parseAsync(sessionDataString);
        const userSessionsKey = `user_sessions:${sessionData.userId}`;

        // Remove from user's session list
        await redisManager.srem(userSessionsKey, sessionId);
      }

      // Remove session data
      await redisManager.del(sessionKey);
    } catch (error) {
      console.error("Error during logout:", error);
      throw error;
    }
  }

  async verifySession(token: string) {
    try {
      const payload = (await verify(token, appConfig.jwt.secret)) as any;
      const sessionKey = `session:${payload.sessionId}`;
      const sessionData = await redisManager.get(sessionKey);
      return sessionData ? await safeParse(sessionData) : null;
    } catch (error) {
      return null;
    }
  }

  async refreshSession(sessionId: string) {
    const sessionKey = `session:${sessionId}`;
    const sessionDataString = await redisManager.get(sessionKey);
    if (!sessionDataString) {
      return null;
    }

    const sessionData: SessionData = JSON.parse(sessionDataString);
    const { token } = await this.createSecureSession(
      { id: sessionData.userId, email: sessionData.email },
      sessionData.ipAddress,
      sessionData.userAgent
    );

    return { token };
  }

  async invalidateAllUserSessions(userId: string): Promise<void> {
    const keys = await redisManager.keys(`session:*:${userId}`);
    if (keys.length > 0) {
      await redisManager.del(keys);
    }
  }

  private async createSecureSession(
    user: { id: string; email: string },
    ipAddress?: string,
    userAgent?: string
  ) {
    const sessionId = randomUUID();
    const sessionKey = `session:${sessionId}`;
    const now = Math.floor(Date.now() / 1000);

    const token = await sign(
      {
        userId: user.id,
        sessionId,
        email: user.email,
        exp: now + appConfig.security.sessionTTL,
      },
      appConfig.jwt.secret
    );

    const newSessionData: SessionData = {
      sessionId,
      userId: user.id,
      email: user.email,
      loginTime: Date.now(),
      ipAddress,
      userAgent,
      lastActivity: Date.now(),
    };

    await redisManager.setWithExpiry(
      sessionKey,
      JSON.stringify(newSessionData),
      appConfig.security.sessionTTL
    );

    // Also store session in user's session list for easy retrieval
    const userSessionsKey = `user_sessions:${user.id}`;
    await redisManager.sadd(userSessionsKey, sessionId);
    await redisManager.expire(userSessionsKey, appConfig.security.sessionTTL);

    return { token, sessionId };
  }

  async createPasswordResetToken(email: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      // To prevent user enumeration, don't reveal that the user doesn't exist
      return null;
    }

    const resetToken = randomUUID();
    const tokenKey = `password-reset:${resetToken}`;

    await redisManager.setWithExpiry(
      tokenKey,
      user.id,
      appConfig.security.passwordResetTTL
    );

    return resetToken;
  }

  async resetPassword(token: string, newPassword: string, ipAddress?: string) {
    const tokenKey = `password-reset:${token}`;
    const userId = await redisManager.get(tokenKey);

    if (!userId) {
      throw new Error("Invalid or expired password reset token");
    }

    const hashedPassword = await hash(
      newPassword,
      appConfig.security.bcryptRounds
    );
    await this.userService.updatePassword(userId, hashedPassword);

    // Invalidate all active sessions for the user
    await this.invalidateAllUserSessions(userId);

    // Log the password change for security auditing
    console.log(
      `Password reset for user ${userId} from IP ${ipAddress || "unknown"}`
    );

    await redisManager.del(tokenKey);
  }

  async invalidateSession(token: string) {
    try {
      const payload = (await verify(token, appConfig.jwt.secret)) as any;
      const sessionKey = `session:${payload.sessionId}`;
      await redisManager.del(sessionKey);
    } catch (error) {
      // Ignore errors if token is invalid
    }
  }

  async invalidateUserSessions(userId: string) {
    const sessionKeys = await redisManager.keys(`session:*:${userId}`);
    if (sessionKeys.length > 0) {
      await redisManager.del(sessionKeys);
    }
  }

  private async checkLoginAttempts(email: string, ipAddress?: string) {
    const key = `login-attempt:${email}:${ipAddress || ""}`;
    const attemptData = await redisManager.get(key);

    if (attemptData) {
      const attempt: LoginAttempt = JSON.parse(attemptData);

      if (attempt.blockedUntil && attempt.blockedUntil > Date.now()) {
        const remainingSeconds = Math.ceil(
          (attempt.blockedUntil - Date.now()) / 1000
        );
        throw new Error(
          `Too many login attempts. Please try again in ${remainingSeconds} seconds.`
        );
      }

      if (attempt.count >= appConfig.security.maxLoginAttempts) {
        const blockedUntil =
          Date.now() + appConfig.security.loginAttemptWindow * 1000;
        attempt.blockedUntil = blockedUntil;
        await redisManager.setWithExpiry(
          key,
          JSON.stringify(attempt),
          appConfig.security.loginAttemptWindow
        );
        throw new Error(
          `Account locked for ${
            appConfig.security.loginAttemptWindow / 60
          } minutes.`
        );
      }
    }
  }

  private async recordFailedLogin(email: string, ipAddress?: string) {
    const key = `login-attempt:${email}:${ipAddress || ""}`;
    const attemptData = await redisManager.get(key);

    let attempt: LoginAttempt = { count: 0, lastAttempt: 0 };
    if (attemptData) {
      attempt = JSON.parse(attemptData);
    }

    attempt.count++;
    attempt.lastAttempt = Date.now();

    await redisManager.setWithExpiry(
      key,
      JSON.stringify(attempt),
      appConfig.security.loginAttemptWindow
    );
  }

  private async resetFailedLogins(email: string, ipAddress?: string) {
    const key = `login-attempt:${email}:${ipAddress || ""}`;
    await redisManager.del(key);
  }

  async getProfile(userId: string): Promise<any | null> {
    // Use userService to fetch user profile
    return this.userService.findById(userId);
  }

  // New session management methods
  async getAllUserSessions(
    userId: string,
    currentSessionId?: string
  ): Promise<UserSession[]> {
    try {
      const userSessionsKey = `user_sessions:${userId}`;
      const sessionIds = await redisManager.smembers(userSessionsKey);

      const sessions: UserSession[] = [];

      for (const sessionId of sessionIds) {
        const sessionKey = `session:${sessionId}`;
        const sessionDataString = await redisManager.get(sessionKey);

        if (sessionDataString) {
          const sessionData: SessionData = JSON.parse(sessionDataString);
          sessions.push({
            sessionId: sessionData.sessionId,
            userId: sessionData.userId,
            email: sessionData.email,
            loginTime: sessionData.loginTime,
            lastActivity: sessionData.lastActivity,
            ipAddress: sessionData.ipAddress,
            userAgent: sessionData.userAgent,
            isCurrent: currentSessionId === sessionId,
          });
        } else {
          // Clean up stale session reference
          await redisManager.srem(userSessionsKey, sessionId);
        }
      }

      // Sort by login time (newest first)
      return sessions.sort((a, b) => b.loginTime - a.loginTime);
    } catch (error) {
      console.error("Error getting user sessions:", error);
      return [];
    }
  }

  async revokeSession(sessionId: string, userId: string): Promise<boolean> {
    try {
      const sessionKey = `session:${sessionId}`;
      const userSessionsKey = `user_sessions:${userId}`;

      // Remove session data
      await redisManager.del(sessionKey);

      // Remove from user's session list
      await redisManager.srem(userSessionsKey, sessionId);

      return true;
    } catch (error) {
      console.error("Error revoking session:", error);
      return false;
    }
  }

  async revokeAllOtherSessions(
    currentSessionId: string,
    userId: string
  ): Promise<number> {
    try {
      const userSessionsKey = `user_sessions:${userId}`;
      const sessionIds = await redisManager.smembers(userSessionsKey);

      let revokedCount = 0;

      for (const sessionId of sessionIds) {
        if (sessionId !== currentSessionId) {
          const sessionKey = `session:${sessionId}`;
          await redisManager.del(sessionKey);
          await redisManager.srem(userSessionsKey, sessionId);
          revokedCount++;
        }
      }

      return revokedCount;
    } catch (error) {
      console.error("Error revoking other sessions:", error);
      return 0;
    }
  }

  async getCurrentSession(token: string): Promise<UserSession | null> {
    try {
      const payload = (await verify(token, appConfig.jwt.secret)) as any;
      const sessionKey = `session:${payload.sessionId}`;
      const sessionDataString = await redisManager.get(sessionKey);

      if (!sessionDataString) {
        return null;
      }

      const sessionData: SessionData = JSON.parse(sessionDataString);

      return {
        sessionId: sessionData.sessionId,
        userId: sessionData.userId,
        email: sessionData.email,
        loginTime: sessionData.loginTime,
        lastActivity: sessionData.lastActivity,
        ipAddress: sessionData.ipAddress,
        userAgent: sessionData.userAgent,
        isCurrent: true,
      };
    } catch (error) {
      console.error("Error getting current session:", error);
      return null;
    }
  }
}
