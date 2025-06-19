import { CreateUserDto, LoginDto } from "../dtos";

export interface IAuthService {
  register(
    userData: CreateUserDto,
    ipAddress?: string
  ): Promise<{
    user: {
      id: number;
      name: string;
      email: string;
      createdAt: Date;
    };
    token: string;
    sessionId: string;
  }>;

  login(
    loginData: LoginDto,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    user: {
      id: number;
      name: string;
      email: string;
      createdAt: Date;
    };
    token: string;
    sessionId: string;
  }>;

  logout(sessionId: string): Promise<void>;

  verifySession(token: string): Promise<any | null>;

  refreshSession(sessionId: string): Promise<{ token: string } | null>;

  invalidateAllUserSessions(userId: number): Promise<void>;
}
