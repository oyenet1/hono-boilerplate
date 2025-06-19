import { User } from "../interfaces/IDatabase";
import { CreateUserDto, UpdateUserDto } from "../dtos";

export interface IUserService {
  createUser(userData: CreateUserDto): Promise<User>;
  findById(id: string): Promise<User | undefined>;
  findByEmail(email: string): Promise<User | undefined>;
  updateUser(id: string, userData: UpdateUserDto): Promise<User | undefined>;
  updatePassword(id: string, password: string): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getAllUsers(page?: number, limit?: number): Promise<User[]>;
}
