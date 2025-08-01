import { BaseResource } from "./BaseResource";
import { User } from "../interfaces/IDatabase";

export interface UserResourceData {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  postsCount?: number;
}

export class UserResource extends BaseResource<User, UserResourceData> {
  transform(user: User): UserResourceData {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  // Transform with additional data (like posts count)
  transformWithMeta(
    user: User,
    meta?: { postsCount?: number }
  ): UserResourceData {
    const transformed = this.transform(user);

    if (meta?.postsCount !== undefined) {
      transformed.postsCount = meta.postsCount;
    }

    return transformed;
  }
}
