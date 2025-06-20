import { Context } from "hono";
import { ApiResponse, ApiResponseData } from "./response";

/**
 * Comprehensive pagination metadata interface
 */
export interface PaginationMeta {
  // Basic pagination info
  currentPage: number;
  perPage: number;
  total: number;
  totalPages: number;
  
  // Navigation indicators
  isFirstPage: boolean;
  isLastPage: boolean;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  
  // Navigation page numbers
  nextPage: number | null;
  prevPage: number | null;
  
  // Slice info for the current page
  startIndex: number;
  endIndex: number;
}

/**
 * Interface for paginated results
 */
export interface PaginationResult<T> {
  items: T[];
  meta: PaginationMeta;
}

/**
 * Creates a paginated result from an array of items
 * 
 * @param items The complete array of items to paginate
 * @param page The requested page number (1-based)
 * @param perPage Number of items per page
 * @param total Optional total count (useful when items is already sliced)
 * @returns A PaginationResult object with items and metadata
 */
export function paginate<T>(
  items: T[],
  page: number = 1,
  perPage: number = 10,
  total?: number
): PaginationResult<T> {
  // Ensure valid page numbers
  page = Math.max(1, page);
  perPage = Math.max(1, perPage);
  
  // Calculate total if not provided
  const itemTotal = total ?? items.length;
  
  // Calculate total pages
  const totalPages = Math.ceil(itemTotal / perPage);
  
  // Adjust page if it exceeds total pages
  page = Math.min(page, Math.max(1, totalPages));
  
  // Calculate start and end indices
  const startIndex = (page - 1) * perPage;
  const endIndex = Math.min(startIndex + perPage, itemTotal);
  
  // Slice the items array if total wasn't provided (meaning we have the full array)
  const pageItems = total ? items : items.slice(startIndex, endIndex);
  
  // Create metadata
  const meta: PaginationMeta = {
    currentPage: page,
    perPage,
    total: itemTotal,
    totalPages,
    
    isFirstPage: page === 1,
    isLastPage: page === totalPages || totalPages === 0,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    
    nextPage: page < totalPages ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null,
    
    startIndex,
    endIndex: endIndex - 1
  };
  
  return {
    items: pageItems,
    meta
  };
}

/**
 * Extension to ApiResponse for enhanced pagination responses
 */
export class PaginationResponse {
  /**
   * Send a paginated API response with comprehensive metadata
   * 
   * @param c Hono Context
   * @param items The data items for the current page
   * @param page Current page number
   * @param perPage Items per page
   * @param total Total number of items
   * @param message Success message
   * @returns JSON response with pagination metadata
   */
  static send<T>(
    c: Context,
    items: T[],
    page: number = 1,
    perPage: number = 10,
    total: number,
    message: string = "Data retrieved successfully"
  ) {
    const result = paginate(items, page, perPage, total);
    
    // Convert to the format expected by ApiResponse
    return ApiResponse.success(c, result.items, message, 200, {
      page: result.meta.currentPage,
      limit: result.meta.perPage,
      total: result.meta.total,
      totalPages: result.meta.totalPages,
      isFirstPage: result.meta.isFirstPage,
      isLastPage: result.meta.isLastPage,
      hasNextPage: result.meta.hasNextPage,
      hasPrevPage: result.meta.hasPrevPage,
      nextPage: result.meta.nextPage,
      prevPage: result.meta.prevPage,
      startIndex: result.meta.startIndex,
      endIndex: result.meta.endIndex
    });
  }
  
  /**
   * Process and paginate a data array directly
   * 
   * @param c Hono Context
   * @param allItems Complete array of items to paginate
   * @param page Current page number
   * @param perPage Items per page
   * @param message Success message
   * @returns JSON response with pagination metadata
   */
  static fromArray<T>(
    c: Context,
    allItems: T[],
    page: number = 1,
    perPage: number = 10,
    message: string = "Data retrieved successfully"
  ) {
    const result = paginate(allItems, page, perPage);
    
    return ApiResponse.success(c, result.items, message, 200, {
      page: result.meta.currentPage,
      limit: result.meta.perPage,
      total: result.meta.total,
      totalPages: result.meta.totalPages,
      isFirstPage: result.meta.isFirstPage,
      isLastPage: result.meta.isLastPage,
      hasNextPage: result.meta.hasNextPage,
      hasPrevPage: result.meta.hasPrevPage,
      nextPage: result.meta.nextPage,
      prevPage: result.meta.prevPage,
      startIndex: result.meta.startIndex,
      endIndex: result.meta.endIndex
    });
  }
}
