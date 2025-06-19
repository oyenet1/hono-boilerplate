import { User } from "../database/simple";
import { CreateUserDto, UpdateUserDto } from "../dtos";

export interface IUserService {
  createUser(userData: CreateUserDto): Promise<User>;
  findById(id: number): Promise<User | undefined>;
  findByEmail(email: string): Promise<User | undefined>;
  updateUser(id: number, userData: UpdateUserDto): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(page?: number, limit?: number): Promise<User[]>;
}
