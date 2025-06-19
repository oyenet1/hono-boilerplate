import { inject, injectable } from "inversify";
import { hash, compare } from "bcryptjs";
import { sign } from "hono/jwt";
import type { IAuthService } from "../interfaces/IAuthService";
import type { IUserService } from "../interfaces/IUserService";
import { TYPES } from "../di/types";
import { CreateUserDto, LoginDto } from "../dtos";
import { appConfig } from "../config/app";
import { createId } from "@paralleldrive/cuid2";

@injectable()
export class AuthService implements IAuthService {
  constructor(@inject(TYPES.UserService) private userService: IUserService) {}

  async register(
    userData: CreateUserDto,
    ipAddress?: string
  ): Promise<{
    user: {
      id: string;
      name: string;
      email: string;
      createdAt: Date;
    };
    token: string;
    sessionId: string;
  }> {
    const hashedPassword = await hash(
      userData.password,
      appConfig.bcryptRounds
    );

    const user = await this.userService.createUser({
      ...userData,
      password: hashedPassword,
    });

    const sessionId = createId();
    const token = await this.generateToken(user.id, sessionId);

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

  async login(
    loginData: LoginDto,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    user: {
      id: string;
      name: string;
      email: string;
      createdAt: Date;
    };
    token: string;
    sessionId: string;
  }> {
    const user = await this.userService.findByEmail(loginData.email);

    if (!user) {
      throw new Error("Invalid credentials");
    }

    const isPasswordValid = await compare(loginData.password, user.password);

    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

    const sessionId = createId();
    const token = await this.generateToken(user.id, sessionId);

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
    // Implementation for basic auth service - sessions not persisted
    // This is a placeholder for interface compliance
  }

  async verifySession(token: string): Promise<any | null> {
    // Basic implementation - should be enhanced with proper session verification
    try {
      const payload = await this.verifyToken(token);
      return payload;
    } catch {
      return null;
    }
  }

  async refreshSession(sessionId: string): Promise<{ token: string } | null> {
    // Basic implementation - should be enhanced with proper session management
    // For basic auth service, we don't persist sessions
    return null;
  }

  async invalidateAllUserSessions(userId: string): Promise<void> {
    // Implementation for basic auth service - sessions not persisted
    // This is a placeholder for interface compliance
  }

  private async generateToken(
    userId: string,
    sessionId: string
  ): Promise<string> {
    return await sign({ userId, sessionId }, appConfig.jwtSecret);
  }

  private async verifyToken(token: string): Promise<any> {
    const { sign, verify } = await import("hono/jwt");
    return await verify(token, appConfig.jwtSecret);
  }
}
