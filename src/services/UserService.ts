import { inject, injectable } from "inversify";
import type { User, QueryOptions } from "../interfaces/IDatabase";
import { DrizzleDatabase } from "../database/DrizzleDatabase";
import { CreateUserDto, UpdateUserDto } from "../dtos";
import { UniversalCacheService } from "./UniversalCacheService";
import { UserResource, UserResourceData } from "../resources/UserResource";
import { ResourceCollection } from "../resources/BaseResource";

@injectable()
export class UserService {
  private userResource = new UserResource();

  constructor(
    @inject(DrizzleDatabase) private database: DrizzleDatabase,
    @inject(UniversalCacheService) private cacheService: UniversalCacheService
  ) {}

  async createUser(userData: CreateUserDto): Promise<User> {
    const existingUser = await this.findByEmail(userData.email);
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    const user = await this.database.createUser(userData);

    // Cache the new user using universal cache service
    await this.cacheService.cacheUser(user, "CREATE");

    // Invalidate user collections cache
    await this.cacheService.invalidateAllUserCaches();

    console.log(`✅ User created and queued for caching: ${user.email}`);

    return user;
  }

  async findById(id: string): Promise<User | undefined> {
    const cacheKey = this.cacheService.generateUserCacheKey(id);

    return await this.cacheService.remember(
      cacheKey,
      async () => await this.database.findUserById(id),
      { ttl: 1800 } // 30 minutes
    );
  }

  async findByEmail(email: string): Promise<User | undefined> {
    // Try to get from cache first
    const cachedUser = await this.cacheService.getUserByEmail(email);
    if (cachedUser) {
      console.log(`👤 User found in cache: ${email}`);
      // Convert CachedUser back to User with Date objects
      const user: User = {
        ...cachedUser,
        createdAt: new Date(cachedUser.createdAt),
        updatedAt: new Date(cachedUser.updatedAt),
      } as User;
      return user;
    }

    // If not in cache, check database
    const user = await this.database.findUserByEmail(email);
    if (user) {
      // Cache the user for future lookups
      await this.cacheService.cacheUser(user, "CREATE");
      console.log(`👤 User found in database and cached: ${email}`);
    }

    return user;
  }

  async updateUser(
    id: string,
    userData: UpdateUserDto
  ): Promise<User | undefined> {
    const result = await this.database.updateUser(id, userData);

    if (result) {
      // Cache the updated user
      await this.cacheService.cacheUser(result, "UPDATE");

      // Invalidate user collections cache
      await this.cacheService.invalidateAllUserCaches();

      console.log(`� User updated and cached: ${result.email}`);
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
    // Get user data before deletion for cache cleanup
    const user = await this.database.findUserById(id);
    const result = await this.database.deleteUser(id);

    if (result && user) {
      // Remove user from cache using universal cache service
      await this.cacheService.removeUserFromCache(user);

      // Invalidate all user-related caches
      await this.cacheService.invalidateAllUserCaches(id);

      // Also invalidate user collections cache patterns for completeness
      await this.cacheService.invalidatePattern("*", "user");

      console.log(
        `🗑️ User deleted and cache completely invalidated for: ${user.email} (ID: ${id})`
      );
    }

    return result;
  }

  async getAllUsers(
    options: QueryOptions = {}
  ): Promise<ResourceCollection<UserResourceData>> {
    const { page = 1, limit = 10, search, sortBy } = options;

    // Generate cache key based on all query parameters
    const cacheKey = this.cacheService.generateUsersCacheKey(
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
