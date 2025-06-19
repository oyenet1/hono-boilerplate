import { inject, injectable } from "inversify";
import type { IUserService } from "../interfaces/IUserService";
import type { IDatabase, User } from "../interfaces/IDatabase";
import { TYPES } from "../di/types";
import { CreateUserDto, UpdateUserDto } from "../dtos";

@injectable()
export class UserService implements IUserService {
  constructor(@inject(TYPES.Database) private database: IDatabase) {}

  async createUser(userData: CreateUserDto): Promise<User> {
    const existingUser = await this.findByEmail(userData.email);
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    const user = await this.database.createUser(userData);
    return user;
  }

  async findById(id: string): Promise<User | undefined> {
    return await this.database.findUserById(id);
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return await this.database.findUserByEmail(email);
  }

  async updateUser(
    id: string,
    userData: UpdateUserDto
  ): Promise<User | undefined> {
    return await this.database.updateUser(id, userData);
  }

  async deleteUser(id: string): Promise<boolean> {
    return await this.database.deleteUser(id);
  }

  async getAllUsers(page: number = 1, limit: number = 10): Promise<User[]> {
    return await this.database.getAllUsers(page, limit);
  }
}
