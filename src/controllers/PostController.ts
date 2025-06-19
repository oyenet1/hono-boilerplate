import { injectable, inject } from "inversify";
import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { IPostController } from "../interfaces/IPostController";
import type { IPostService } from "../interfaces/IPostService";
import { TYPES } from "../di/types";

@injectable()
export class PostController implements IPostController {
  constructor(
    @inject(TYPES.PostService) private postService: IPostService
  ) {}

  async getPosts(c: Context) {
    try {
      const { page = 1, limit = 10 } = c.req.query();
      const posts = await this.postService.getAllPosts(
        Number(page),
        Number(limit)
      );

      return c.json({
        success: true,
        message: "Posts retrieved successfully",
        data: posts,
      });
    } catch (error) {
      throw new HTTPException(500, {
        message: "Failed to retrieve posts",
      });
    }
  }

  async getPost(c: Context) {
    try {
      const id = Number(c.req.param("id"));
      const post = await this.postService.findById(id);

      if (!post) {
        throw new HTTPException(404, { message: "Post not found" });
      }

      return c.json({
        success: true,
        message: "Post retrieved successfully",
        data: post,
      });
    } catch (error) {
      if (error instanceof HTTPException) throw error;
      throw new HTTPException(500, {
        message: "Failed to retrieve post",
      });
    }
  }

  async createPost(c: Context) {
    try {
      const userId = c.get("userId");
      const postData = await c.req.json();
      const post = await this.postService.createPost(postData, userId);

      return c.json(
        {
          success: true,
          message: "Post created successfully",
          data: post,
        },
        201
      );
    } catch (error) {
      throw new HTTPException(500, {
        message:
          error instanceof Error ? error.message : "Failed to create post",
      });
    }
  }

  async updatePost(c: Context) {
    try {
      const id = Number(c.req.param("id"));
      const userId = c.get("userId");
      const postData = await c.req.json();
      const post = await this.postService.updatePost(id, postData, userId);

      return c.json({
        success: true,
        message: "Post updated successfully",
        data: post,
      });
    } catch (error) {
      throw new HTTPException(500, {
        message:
          error instanceof Error ? error.message : "Failed to update post",
      });
    }
  }

  async deletePost(c: Context) {
    try {
      const id = Number(c.req.param("id"));
      const userId = c.get("userId");
      await this.postService.deletePost(id, userId);

      return c.json({
        success: true,
        message: "Post deleted successfully",
      });
    } catch (error) {
      throw new HTTPException(500, {
        message: "Failed to delete post",
      });
    }
  }

  async getUserPosts(c: Context) {
    try {
      const userId = c.get("userId");
      const { page = 1, limit = 10 } = c.req.query();
      const posts = await this.postService.getPostsByUser(
        userId,
        Number(page),
        Number(limit)
      );

      return c.json({
        success: true,
        message: "User posts retrieved successfully",
        data: posts,
      });
    } catch (error) {
      throw new HTTPException(500, {
        message: "Failed to retrieve user posts",
      });
    }
  }
}
