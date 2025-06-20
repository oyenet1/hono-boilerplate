# Resource System Usage Guide

## Quick Start

### 1. Creating a New Resource

```typescript
// src/resources/CategoryResource.ts
import { BaseResource } from "./BaseResource";
import { Category } from "../interfaces/IDatabase";

export interface CategoryResourceData {
  id: string;
  name: string;
  description: string;
  postCount?: number;
  createdAt: string;
  updatedAt: string;
}

export class CategoryResource extends BaseResource<
  Category,
  CategoryResourceData
> {
  transform(category: Category): CategoryResourceData {
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    };
  }

  // Transform with computed fields
  transformWithPostCount(
    category: Category,
    postCount: number
  ): CategoryResourceData {
    const transformed = this.transform(category);
    transformed.postCount = postCount;
    return transformed;
  }
}
```

### 2. Using Resources in Services

```typescript
// src/services/CategoryService.ts
import { CategoryResource } from "../resources/CategoryResource";
import { CacheService } from "./CacheService";

export class CategoryService {
  private categoryResource = new CategoryResource();

  constructor(
    @inject(TYPES.Database) private database: IDatabase,
    @inject(CacheService) private cacheService: CacheService
  ) {}

  async getAllCategories(
    options: QueryOptions = {}
  ): Promise<ResourceCollection<CategoryResourceData>> {
    const { page = 1, limit = 10, search, sortBy } = options;

    // Generate cache key
    const cacheKey = this.categoryResource.generateCacheKey({
      prefix: "categories",
      params: { page, limit, search, sortBy },
    });

    return await this.cacheService.remember(
      cacheKey,
      async () => {
        const result = await this.database.getAllCategories(options);
        return this.categoryResource.createCollection(
          result.data,
          result.page,
          result.limit,
          result.total
        );
      },
      { ttl: 900 } // 15 minutes
    );
  }
}
```

### 3. Controller Implementation

```typescript
// src/controllers/CategoryController.ts
export class CategoryController {
  private categoryResource = new CategoryResource();

  async getCategories(c: Context) {
    try {
      const query = c.req.query();
      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 10;
      const search = query.search || undefined;

      // Parse sortBy: ?sortBy=name:asc,createdAt:desc
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

      const result = await this.categoryService.getAllCategories({
        page,
        limit,
        search,
        sortBy,
      });

      return ApiResponse.success(
        c,
        result,
        "Categories retrieved successfully"
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to get categories";
      return ApiResponse.error(c, message, 500);
    }
  }
}
```

## Advanced Usage

### 1. Complex Resource Transformations

```typescript
export class PostResource extends BaseResource<Post, PostResourceData> {
  // Transform with author and category data
  transformWithRelations(
    post: Post,
    author?: UserResourceData,
    category?: CategoryResourceData
  ): PostResourceData {
    const transformed = this.transform(post);

    if (author) {
      transformed.author = author;
    }

    if (category) {
      transformed.category = category;
    }

    return transformed;
  }

  // Transform collection with batch-loaded relations
  transformCollectionWithRelations(
    posts: Post[],
    authors: Map<string, UserResourceData>,
    categories: Map<string, CategoryResourceData>
  ): PostResourceData[] {
    return posts.map((post) =>
      this.transformWithRelations(
        post,
        authors.get(post.userId),
        categories.get(post.categoryId)
      )
    );
  }
}
```

### 2. Custom Cache Strategies

```typescript
export class PostService {
  // Cache with user-specific invalidation
  async getUserPosts(
    userId: string,
    options: QueryOptions = {}
  ): Promise<ResourceCollection<PostResourceData>> {
    const cacheKey = this.postResource.generateCacheKey({
      prefix: `posts:user:${userId}`,
      params: options,
    });

    return await this.cacheService.remember(
      cacheKey,
      async () => {
        const result = await this.database.getPostsByUser(userId, options);
        return this.postResource.createCollection(
          result.data,
          result.page,
          result.limit,
          result.total
        );
      },
      { ttl: 600 } // 10 minutes for user-specific data
    );
  }

  // Invalidate specific user caches
  async createPost(postData: CreatePostDto, userId: string): Promise<Post> {
    const post = await this.database.createPost({ ...postData, userId });

    // Invalidate both global and user-specific caches
    await this.cacheService.deletePattern("posts:*");
    await this.cacheService.deletePattern(`posts:user:${userId}:*`);

    return post;
  }
}
```

### 3. Search and Filter Patterns

```typescript
// Advanced search with multiple fields
const searchUsers = await userService.getAllUsers({
  search: "john developer", // Searches in name and email
  sortBy: [
    { column: "name", order: "asc" },
    { column: "createdAt", order: "desc" },
  ],
  page: 1,
  limit: 20,
});

// Category-specific post search
const categoryPosts = await postService.getPostsByCategory(categoryId, {
  search: "tutorial",
  sortBy: [{ column: "title", order: "asc" }],
  page: 1,
  limit: 10,
});
```

## Query Parameter Examples

### Basic Pagination

```
GET /api/v1/users?page=2&limit=5
```

### Search with Sorting

```
GET /api/v1/posts?search=javascript&sortBy=title:asc,createdAt:desc
```

### Complex Query

```
GET /api/v1/users?page=1&limit=10&search=developer&sortBy=name:asc
```

## Response Structure

All resource collections return the same structure:

```json
{
  "success": true,
  "data": {
    "data": [...], // Array of transformed resources
    "meta": {
      "currentPage": 1,
      "perPage": 10,
      "total": 100,
      "totalPages": 10,
      "hasNextPage": true,
      "hasPreviousPage": false,
      "firstPage": 1,
      "lastPage": 10,
      "nextPage": 2,
      "previousPage": null,
      "from": 1,
      "to": 10
    }
  }
}
```

## Database Integration

### Adding Search Fields

```typescript
// In DrizzleDatabase.ts
private buildUserSearchClause(search: string) {
  return sql`${users.name} ILIKE ${`%${search}%`}
    OR ${users.email} ILIKE ${`%${search}%`}
    OR ${users.bio} ILIKE ${`%${search}%`}`;
}
```

### Custom Sort Columns

```typescript
private buildUserSortClause(sortBy?: SortField[]) {
  // Map API column names to database columns
  const columnMap = {
    'name': users.name,
    'email': users.email,
    'created': users.createdAt,
    'updated': users.updatedAt
  };

  return sortBy?.map(sort => {
    const column = columnMap[sort.column] || users.createdAt;
    return sort.order === 'desc' ? desc(column) : asc(column);
  }) || [desc(users.createdAt)];
}
```

## Performance Tips

1. **Cache Strategy**: Use shorter TTLs for frequently changing data
2. **Search Optimization**: Add database indexes for searchable fields
3. **Pagination**: Consider cursor-based pagination for large datasets
4. **Preloading**: Batch load related data to avoid N+1 queries
5. **Cache Warming**: Implement background cache warming for popular queries

## Error Handling

```typescript
async getAllUsers(options: QueryOptions = {}): Promise<ResourceCollection<UserResourceData>> {
  try {
    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    // Fallback to database
    const result = await this.database.getAllUsers(options);
    const collection = this.userResource.createCollection(
      result.data,
      result.page,
      result.limit,
      result.total
    );

    // Cache the result (ignore cache errors)
    await this.cacheService.set(cacheKey, collection, { ttl: 900 }).catch(() => {});

    return collection;
  } catch (error) {
    // Log error and potentially return cached stale data
    console.error('Error in getAllUsers:', error);
    throw error;
  }
}
```
