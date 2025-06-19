import { inject, injectable } from "inversify";
import { Context } from "hono";
import type { IPostService } from "../interfaces/IPostService";
import { TYPES } from "../di/types";
import { ResponseHelper } from "../utils/response";
import {
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
  handleDatabaseError,
} from "../utils/errorHandlers";

@injectable()
export class PostController {
  constructor(@inject(TYPES.PostService) private postService: IPostService) {}

  async getPosts(c: Context) {
    try {
      const { page = 1, limit = 10 } = c.req.query();
      const posts = await this.postService.getAllPosts(
        Number(page),
        Number(limit)
      );
      return ResponseHelper.success(c, posts, "Posts retrieved successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to get posts";
      return ResponseHelper.error(c, message, 500);
    }
  }

  async getPost(c: Context) {
    try {
      const id = c.req.param("id");
      if (!id) {
        return ResponseHelper.error(c, "Post ID is required", 400);
      }
      const post = await this.postService.findById(id);
      if (!post) {
        return ResponseHelper.error(c, "Post not found", 404);
      }
      return ResponseHelper.success(c, post, "Post retrieved successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to get post";
      return ResponseHelper.error(c, message, 500);
    }
  }

  async createPost(c: Context) {
    try {
      const userId = c.get("userId");
      const postData = await c.req.json();
      if (!userId) {
        return ResponseHelper.unauthorized(c, "User authentication required");
      }
      const post = await this.postService.createPost(postData, userId);
      return ResponseHelper.created(c, post, "Post created successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create post";
      return ResponseHelper.error(c, message, 500);
    }
  }

  async updatePost(c: Context) {
    try {
      const id = c.req.param("id");
      const userId = c.get("userId");
      const postData = await c.req.json();
      if (!userId) {
        return ResponseHelper.unauthorized(c, "User authentication required");
      }
      const post = await this.postService.updatePost(id, postData, userId);
      if (!post) {
        return ResponseHelper.notFound(c, "Post not found or unauthorized");
      }
      return ResponseHelper.success(c, post, "Post updated successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update post";
      return ResponseHelper.error(c, message, 500);
    }
  }

  async deletePost(c: Context) {
    try {
      const id = c.req.param("id");
      const userId = c.get("userId");
      if (!userId) {
        return ResponseHelper.unauthorized(c, "User authentication required");
      }
      const deleted = await this.postService.deletePost(id, userId);
      if (!deleted) {
        return ResponseHelper.notFound(c, "Post not found or unauthorized");
      }
      return ResponseHelper.success(c, null, "Post deleted successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete post";
      return ResponseHelper.error(c, message, 500);
    }
  }

  async getUserPosts(c: Context) {
    try {
      const userId = c.get("userId");
      const { page = 1, limit = 10 } = c.req.query();
      if (!userId) {
        return ResponseHelper.unauthorized(c, "User authentication required");
      }
      const posts = await this.postService.getPostsByUser(
        userId,
        Number(page),
        Number(limit)
      );
      return ResponseHelper.success(
        c,
        posts,
        "User posts retrieved successfully"
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to retrieve user posts";
      return ResponseHelper.error(c, message, 500);
    }
  }
}
