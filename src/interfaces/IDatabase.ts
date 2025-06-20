// Updated types for Drizzle with CUID2
export interface User {
  id: string;
  name: string;
  email: string;
  // password?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SortField {
  column: string;
  order: "asc" | "desc";
}

export interface QueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: SortField[];
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface IDatabase {
  // User methods
  createUser(
    userData: Omit<User, "id" | "createdAt" | "updatedAt">
  ): Promise<User>;
  findUserById(id: string): Promise<User | undefined>;
  findUserByEmail(email: string): Promise<User | undefined>;
  updateUser(
    id: string,
    userData: Partial<Omit<User, "id" | "createdAt">>
  ): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getAllUsers(options?: QueryOptions): Promise<PaginatedResult<User>>;
  getUsersCount(search?: string): Promise<number>;

  // Post methods
  createPost(
    postData: Omit<Post, "id" | "createdAt" | "updatedAt">
  ): Promise<Post>;
  findPostById(id: string): Promise<Post | undefined>;
  updatePost(
    id: string,
    postData: Partial<Omit<Post, "id" | "createdAt" | "userId">>,
    userId: string
  ): Promise<Post | undefined>;
  deletePost(id: string, userId: string): Promise<boolean>;
  getAllPosts(options?: QueryOptions): Promise<PaginatedResult<Post>>;
  getPostsByUser(
    userId: string,
    options?: QueryOptions
  ): Promise<PaginatedResult<Post>>;
  getPostsCount(search?: string, userId?: string): Promise<number>;

  // Test helper methods
  clear(): Promise<void>;
  seedTestData(): Promise<void>;
}
