import { CreateUserDto, LoginDto } from "../dtos";

export interface UserSession {
  sessionId: string;
  userId: string;
  email: string;
  loginTime: number;
  lastActivity: number;
  ipAddress?: string;
  userAgent?: string;
  isCurrent?: boolean;
}

export interface IAuthService {
  register(
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
  }>;

  login(
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
  }>;

  logout(sessionId: string): Promise<void>;

  verifySession(token: string): Promise<any | null>;

  refreshSession(sessionId: string): Promise<{ token: string } | null>;

  invalidateAllUserSessions(userId: string): Promise<void>;

  getProfile(userId: string): Promise<any | null>;

  // New session management methods
  getAllUserSessions(
    userId: string,
    currentSessionId?: string
  ): Promise<UserSession[]>;

  revokeSession(sessionId: string, userId: string): Promise<boolean>;

  revokeAllOtherSessions(
    currentSessionId: string,
    userId: string
  ): Promise<number>;

  getCurrentSession(token: string): Promise<UserSession | null>;
}
