import { Post } from "../database/simple";
import { CreatePostDto, UpdatePostDto } from "../dtos";

export interface IPostService {
  createPost(postData: CreatePostDto, userId: number): Promise<Post>;
  findById(id: number): Promise<Post | undefined>;
  updatePost(
    id: number,
    postData: UpdatePostDto,
    userId: number
  ): Promise<Post | undefined>;
  deletePost(id: number, userId: number): Promise<boolean>;
  getAllPosts(page?: number, limit?: number): Promise<Post[]>;
  getPostsByUser(
    userId: number,
    page?: number,
    limit?: number
  ): Promise<Post[]>;
}
