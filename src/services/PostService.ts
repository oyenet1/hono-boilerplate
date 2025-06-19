import { inject, injectable } from "inversify";
import type { IPostService } from "../interfaces/IPostService";
import type { IDatabase, Post } from "../interfaces/IDatabase";
import { TYPES } from "../di/types";
import { CreatePostDto, UpdatePostDto } from "../dtos";

@injectable()
export class PostService implements IPostService {
  constructor(@inject(TYPES.Database) private database: IDatabase) {}

  async createPost(postData: CreatePostDto, userId: string): Promise<Post> {
    const post = await this.database.createPost({
      ...postData,
      userId,
    });
    return post;
  }

  async findById(id: string): Promise<Post | undefined> {
    return await this.database.findPostById(id);
  }

  async updatePost(
    id: string,
    postData: UpdatePostDto,
    userId: string
  ): Promise<Post | undefined> {
    return await this.database.updatePost(id, postData, userId);
  }

  async deletePost(id: string, userId: string): Promise<boolean> {
    return await this.database.deletePost(id, userId);
  }

  async getAllPosts(page: number = 1, limit: number = 10): Promise<Post[]> {
    return await this.database.getAllPosts(page, limit);
  }

  async getPostsByUser(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<Post[]> {
    return await this.database.getPostsByUser(userId, page, limit);
  }
}
