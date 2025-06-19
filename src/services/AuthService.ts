import { injectable, inject } from "inversify";
import { hash, compare } from "bcryptjs";
import { sign } from "jsonwebtoken";
import type { IAuthService } from "../interfaces/IAuthService";
import type { IUserService } from "../interfaces/IUserService";
import { TYPES } from "../di/types";
import type { CreateUserDto, LoginDto } from "../dtos";
import { config } from "../config/app";

@injectable()
export class AuthService implements IAuthService {
  constructor(
    @inject(TYPES.UserService) private userService: IUserService
  ) {}

  async register(userData: CreateUserDto) {
    const hashedPassword = await hash(userData.password, config.bcryptRounds);

    const user = await this.userService.createUser({
      ...userData,
      password: hashedPassword,
    });

    const token = this.generateToken(user.id);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  async login(loginData: LoginDto) {
    const user = await this.userService.findByEmail(loginData.email);

    if (!user) {
      throw new Error("Invalid credentials");
    }

    const isPasswordValid = await compare(loginData.password, user.password);

    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

    const token = this.generateToken(user.id);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  private generateToken(userId: number): string {
    return sign({ userId }, config.jwtSecret, { expiresIn: "7d" });
  }
}
