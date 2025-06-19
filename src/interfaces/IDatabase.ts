// Updated types for Drizzle with CUID2
export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
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
  getAllUsers(page?: number, limit?: number): Promise<User[]>;

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
  getAllPosts(page?: number, limit?: number): Promise<Post[]>;
  getPostsByUser(
    userId: string,
    page?: number,
    limit?: number
  ): Promise<Post[]>;
}
