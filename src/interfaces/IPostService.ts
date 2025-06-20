import { Post, QueryOptions } from "../interfaces/IDatabase";
import { CreatePostDto, UpdatePostDto } from "../dtos";
import { ResourceCollection } from "../resources/BaseResource";
import { PostResourceData } from "../resources/PostResource";

export interface IPostService {
  createPost(postData: CreatePostDto, userId: string): Promise<Post>;
  findById(id: string): Promise<Post | undefined>;
  updatePost(
    id: string,
    postData: UpdatePostDto,
    userId: string
  ): Promise<Post | undefined>;
  deletePost(id: string, userId: string): Promise<boolean>;
  getAllPosts(
    options?: QueryOptions
  ): Promise<ResourceCollection<PostResourceData>>;
  getPostsByUser(
    userId: string,
    options?: QueryOptions
  ): Promise<ResourceCollection<PostResourceData>>;
}
