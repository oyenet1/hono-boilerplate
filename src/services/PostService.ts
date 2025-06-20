import { inject, injectable } from "inversify";
import type { IPostService } from "../interfaces/IPostService";
import type { IDatabase, Post, QueryOptions } from "../interfaces/IDatabase";
import { TYPES } from "../di/types";
import { CreatePostDto, UpdatePostDto } from "../dtos";
import { CacheService } from "./CacheService";
import { PostResource, PostResourceData } from "../resources/PostResource";
import { ResourceCollection } from "../resources/BaseResource";

@injectable()
export class PostService implements IPostService {
  private postResource = new PostResource();

  constructor(
    @inject(TYPES.Database) private database: IDatabase,
    @inject(CacheService) private cacheService: CacheService
  ) {}

  async createPost(postData: CreatePostDto, userId: string): Promise<Post> {
    const post = await this.database.createPost({
      ...postData,
      userId,
    });

    // Invalidate post caches after creating a new post
    await this.cacheService.invalidatePostCache(userId);

    return post;
  }

  async findById(id: string): Promise<Post | undefined> {
    const cacheKey = this.postResource.generatePostCacheKey(id);

    return await this.cacheService.remember(
      cacheKey,
      async () => await this.database.findPostById(id),
      { ttl: 1800 } // 30 minutes
    );
  }

  async updatePost(
    id: string,
    postData: UpdatePostDto,
    userId: string
  ): Promise<Post | undefined> {
    const result = await this.database.updatePost(id, postData, userId);

    if (result) {
      // Invalidate post-specific caches
      await this.cacheService.invalidatePostCache(userId);
      await this.cacheService.delete(
        this.postResource.generatePostCacheKey(id)
      );
    }

    return result;
  }

  async deletePost(id: string, userId: string): Promise<boolean> {
    const result = await this.database.deletePost(id, userId);

    if (result) {
      // Invalidate all post-related caches
      await this.cacheService.invalidatePostCache(userId);
      await this.cacheService.delete(
        this.postResource.generatePostCacheKey(id)
      );
    }

    return result;
  }

  async getAllPosts(
    options: QueryOptions = {}
  ): Promise<ResourceCollection<PostResourceData>> {
    const { page = 1, limit = 10, search, sortBy } = options;

    // Generate cache key based on all query parameters
    const cacheKey = this.postResource.generatePostsCacheKey(
      page,
      limit,
      search,
      sortBy
    );

    return await this.cacheService.remember(
      cacheKey,
      async () => {
        const result = await this.database.getAllPosts(options);
        return this.postResource.createCollection(
          result.data,
          result.page,
          result.limit,
          result.total
        );
      },
      { ttl: 900 } // 15 minutes for collections
    );
  }

  async getPostsByUser(
    userId: string,
    options: QueryOptions = {}
  ): Promise<ResourceCollection<PostResourceData>> {
    const { page = 1, limit = 10, search, sortBy } = options;

    // Generate cache key based on all query parameters
    const cacheKey = this.postResource.generateUserPostsCacheKey(
      userId,
      page,
      limit,
      search,
      sortBy
    );

    return await this.cacheService.remember(
      cacheKey,
      async () => {
        const result = await this.database.getPostsByUser(userId, options);
        return this.postResource.createCollection(
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
