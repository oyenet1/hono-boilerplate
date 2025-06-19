import { Post } from "../interfaces/IDatabase";
import { CreatePostDto, UpdatePostDto } from "../dtos";

export interface IPostService {
  createPost(postData: CreatePostDto, userId: string): Promise<Post>;
  findById(id: string): Promise<Post | undefined>;
  updatePost(
    id: string,
    postData: UpdatePostDto,
    userId: string
  ): Promise<Post | undefined>;
  deletePost(id: string, userId: string): Promise<boolean>;
  getAllPosts(page?: number, limit?: number): Promise<Post[]>;
  getPostsByUser(
    userId: string,
    page?: number,
    limit?: number
  ): Promise<Post[]>;
}
