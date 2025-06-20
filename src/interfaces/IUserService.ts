import { User, QueryOptions } from "../interfaces/IDatabase";
import { CreateUserDto, UpdateUserDto } from "../dtos";
import { ResourceCollection } from "../resources/BaseResource";
import { UserResourceData } from "../resources/UserResource";

export interface IUserService {
  createUser(userData: CreateUserDto): Promise<User>;
  findById(id: string): Promise<User | undefined>;
  findByEmail(email: string): Promise<User | undefined>;
  updateUser(id: string, userData: UpdateUserDto): Promise<User | undefined>;
  updatePassword(id: string, password: string): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getAllUsers(
    options?: QueryOptions
  ): Promise<ResourceCollection<UserResourceData>>;
}
