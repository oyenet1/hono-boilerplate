// Resource transformation interfaces and types

export interface PaginationMeta {
  currentPage: number;
  perPage: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  firstPage: number;
  lastPage: number;
  nextPage: number | null;
  previousPage: number | null;
  from: number;
  to: number;
}

export interface ResourceCollection<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface SortField {
  column: string;
  order: "asc" | "desc";
}

export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: SortField[];
}

export interface CacheKey {
  prefix: string;
  params: QueryParams;
  additionalParams?: Record<string, any>;
}

export abstract class BaseResource<T, R> {
  abstract transform(item: T): R;

  transformCollection(items: T[]): R[] {
    return items.map((item) => this.transform(item));
  }

  createPaginationMeta(
    page: number,
    limit: number,
    total: number
  ): PaginationMeta {
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;
    const from = (page - 1) * limit + 1;
    const to = Math.min(page * limit, total);

    return {
      currentPage: page,
      perPage: limit,
      total,
      totalPages,
      hasNextPage,
      hasPreviousPage,
      firstPage: 1,
      lastPage: totalPages,
      nextPage: hasNextPage ? page + 1 : null,
      previousPage: hasPreviousPage ? page - 1 : null,
      from: total > 0 ? from : 0,
      to: total > 0 ? to : 0,
    };
  }

  createCollection(
    items: T[],
    page: number,
    limit: number,
    total: number
  ): ResourceCollection<R> {
    return {
      data: this.transformCollection(items),
      meta: this.createPaginationMeta(page, limit, total),
    };
  }

  generateCacheKey(cacheKey: CacheKey): string {
    const { prefix, params, additionalParams = {} } = cacheKey;

    const sortBy = params.sortBy
      ? params.sortBy.map((s) => `${s.column}:${s.order}`).join(",")
      : "";

    const keyParts = [
      prefix,
      `page:${params.page || 1}`,
      `limit:${params.limit || 10}`,
      `search:${params.search || ""}`,
      `sort:${sortBy}`,
    ];

    // Add additional parameters
    Object.entries(additionalParams).forEach(([key, value]) => {
      keyParts.push(`${key}:${value || ""}`);
    });

    return keyParts.join(":");
  }
}
