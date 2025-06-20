import { inject, injectable } from "inversify";
import { Context } from "hono";
import type { IPostService } from "../interfaces/IPostService";
import { TYPES } from "../di/types";
import { ApiResponse } from "../utils/response";
import { PostResource } from "../resources/PostResource";
import { SortField } from "../interfaces/IDatabase";

@injectable()
export class PostController {
  private postResource = new PostResource();

  constructor(@inject(TYPES.PostService) private postService: IPostService) {}

  async getPosts(c: Context) {
    try {
      const query = c.req.query();
      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 10;
      const search = query.search || undefined;

      // Parse sortBy parameter: ?sortBy=title:asc,createdAt:desc
      let sortBy: SortField[] | undefined;
      if (query.sortBy) {
        sortBy = query.sortBy.split(",").map((sort) => {
          const [column, order] = sort.split(":");
          return {
            column,
            order: (order as "asc" | "desc") || "asc",
          };
        });
      }

      const result = await this.postService.getAllPosts({
        page,
        limit,
        search,
        sortBy,
      });

      return ApiResponse.success(c, result, "Posts retrieved successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to get posts";
      return ApiResponse.error(c, message, 500);
    }
  }

  async getPost(c: Context) {
    try {
      const id = c.req.param("id");
      if (!id) {
        return ApiResponse.error(c, "Post ID is required", 400);
      }

      const post = await this.postService.findById(id);
      if (!post) {
        return ApiResponse.error(c, "Post not found", 404);
      }

      // Transform the post using the resource
      const transformedPost = this.postResource.transform(post);
      return ApiResponse.success(
        c,
        transformedPost,
        "Post retrieved successfully"
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to get post";
      return ApiResponse.error(c, message, 500);
    }
  }

  async createPost(c: Context) {
    try {
      const userId = c.get("userId");
      const postData = await c.req.json();
      if (!userId) {
        return ApiResponse.unauthorized(c, "User authentication required");
      }

      const post = await this.postService.createPost(postData, userId);

      // Transform the created post using the resource
      const transformedPost = this.postResource.transform(post);
      return ApiResponse.created(
        c,
        transformedPost,
        "Post created successfully"
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create post";
      return ApiResponse.error(c, message, 500);
    }
  }

  async updatePost(c: Context) {
    try {
      const id = c.req.param("id");
      const userId = c.get("userId");
      const postData = await c.req.json();
      if (!userId) {
        return ApiResponse.unauthorized(c, "User authentication required");
      }

      const post = await this.postService.updatePost(id, postData, userId);
      if (!post) {
        return ApiResponse.notFound(c, "Post not found or unauthorized");
      }

      // Transform the updated post using the resource
      const transformedPost = this.postResource.transform(post);
      return ApiResponse.success(
        c,
        transformedPost,
        "Post updated successfully"
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update post";
      return ApiResponse.error(c, message, 500);
    }
  }

  async deletePost(c: Context) {
    try {
      const id = c.req.param("id");
      const userId = c.get("userId");
      if (!userId) {
        return ApiResponse.unauthorized(c, "User authentication required");
      }
      const deleted = await this.postService.deletePost(id, userId);
      if (!deleted) {
        return ApiResponse.notFound(c, "Post not found or unauthorized");
      }
      return ApiResponse.success(c, null, "Post deleted successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete post";
      return ApiResponse.error(c, message, 500);
    }
  }

  async getUserPosts(c: Context) {
    try {
      const userId = c.get("userId");
      const query = c.req.query();
      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 10;
      const search = query.search || undefined;

      if (!userId) {
        return ApiResponse.unauthorized(c, "User authentication required");
      }

      // Parse sortBy parameter
      let sortBy: SortField[] | undefined;
      if (query.sortBy) {
        sortBy = query.sortBy.split(",").map((sort) => {
          const [column, order] = sort.split(":");
          return {
            column,
            order: (order as "asc" | "desc") || "asc",
          };
        });
      }

      const result = await this.postService.getPostsByUser(userId, {
        page,
        limit,
        search,
        sortBy,
      });

      return ApiResponse.success(
        c,
        result,
        "User posts retrieved successfully"
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to retrieve user posts";
      return ApiResponse.error(c, message, 500);
    }
  }
}
