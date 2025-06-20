import { BaseResource } from "./BaseResource";
import { Post } from "../interfaces/IDatabase";

export interface PostResourceData {
  id: string;
  title: string;
  content: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    name: string;
    email: string;
  };
}

export class PostResource extends BaseResource<Post, PostResourceData> {
  transform(post: Post): PostResourceData {
    return {
      id: post.id,
      title: post.title,
      content: post.content,
      userId: post.userId,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  }

  // Transform with author information
  transformWithAuthor(
    post: Post,
    author?: { id: string; name: string; email: string }
  ): PostResourceData {
    const transformed = this.transform(post);

    if (author) {
      transformed.author = author;
    }

    return transformed;
  }

  // Generate cache key for post collections
  generatePostsCacheKey(
    page: number = 1,
    limit: number = 10,
    search?: string,
    sortBy?: Array<{ column: string; order: "asc" | "desc" }>,
    userId?: string
  ): string {
    const additionalParams = userId ? { userId } : {};

    return this.generateCacheKey({
      prefix: "posts",
      params: { page, limit, search, sortBy },
      additionalParams,
    });
  }

  // Generate cache key for user-specific posts
  generateUserPostsCacheKey(
    userId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
    sortBy?: Array<{ column: string; order: "asc" | "desc" }>
  ): string {
    return this.generateCacheKey({
      prefix: `posts:user:${userId}`,
      params: { page, limit, search, sortBy },
    });
  }

  // Generate cache key for a specific post
  generatePostCacheKey(postId: string): string {
    return `post:${postId}`;
  }
}
