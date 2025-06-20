import { inject, injectable } from "inversify";
import type { IUserService } from "../interfaces/IUserService";
import type { IDatabase, User, QueryOptions } from "../interfaces/IDatabase";
import { TYPES } from "../di/types";
import { CreateUserDto, UpdateUserDto } from "../dtos";
import { CacheService } from "./CacheService";
import { UserResource, UserResourceData } from "../resources/UserResource";
import { ResourceCollection } from "../resources/BaseResource";

@injectable()
export class UserService implements IUserService {
  private userResource = new UserResource();

  constructor(
    @inject(TYPES.Database) private database: IDatabase,
    @inject(CacheService) private cacheService: CacheService
  ) {}

  async createUser(userData: CreateUserDto): Promise<User> {
    const existingUser = await this.findByEmail(userData.email);
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    const user = await this.database.createUser(userData);

    // Invalidate all user-related caches after creating a new user
    await this.cacheService.invalidateUserCache();
    
    console.log(`✅ User created and cache invalidated for: ${user.email}`);

    return user;
  }

  async findById(id: string): Promise<User | undefined> {
    const cacheKey = this.userResource.generateUserCacheKey(id);

    return await this.cacheService.remember(
      cacheKey,
      async () => await this.database.findUserById(id),
      { ttl: 1800 } // 30 minutes
    );
  }

  async findByEmail(email: string): Promise<User | undefined> {
    // For email lookups, we'll cache based on email
    const cacheKey = `user:email:${email}`;

    return await this.cacheService.remember(
      cacheKey,
      async () => await this.database.findUserByEmail(email),
      { ttl: 1800 } // 30 minutes
    );
  }

  async updateUser(
    id: string,
    userData: UpdateUserDto
  ): Promise<User | undefined> {
    const result = await this.database.updateUser(id, userData);

    if (result) {
      // Invalidate user-specific caches and email cache if email was updated
      await this.cacheService.invalidateUserCache(id);
      
      console.log(`🔄 User updated and cache invalidated for ID: ${id}`);
    }

    return result;
  }

  async updatePassword(
    id: string,
    password: string
  ): Promise<User | undefined> {
    // Password handling would be implemented based on your auth system
    // For now, we'll just return the user without updating password
    // since password is not part of the User interface in this implementation
    return await this.findById(id);
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await this.database.deleteUser(id);

    if (result) {
      // Invalidate all user-related caches
      await this.cacheService.invalidateUserCache(id);
      
      console.log(`🗑️ User deleted and cache invalidated for ID: ${id}`);
    }

    return result;
  }

  async getAllUsers(
    options: QueryOptions = {}
  ): Promise<ResourceCollection<UserResourceData>> {
    const { page = 1, limit = 10, search, sortBy } = options;

    // Generate cache key based on all query parameters
    const cacheKey = this.userResource.generateUsersCacheKey(
      page,
      limit,
      search,
      sortBy
    );

    return await this.cacheService.remember(
      cacheKey,
      async () => {
        const result = await this.database.getAllUsers(options);
        return this.userResource.createCollection(
          result.data,
          result.page,
          result.limit,
          result.total
        );
      },
      { ttl: 900 } // 15 minutes for collections
    );
  }
}
