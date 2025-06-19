import { Context } from "hono";
import { HTTPException } from "hono/http-exception";

export interface TokenExtractionResult {
  token: string;
  authHeader: string;
}

export class TokenExtractor {
  /**
   * Extract Bearer token from Authorization header
   * @param c - Hono context
   * @param throwOnMissing - Whether to throw exception if token is missing
   * @returns Token extraction result or null if not found and throwOnMissing is false
   */
  static extractBearerToken(
    c: Context,
    throwOnMissing: boolean = true
  ): TokenExtractionResult | null {
    const authHeader = c.req.header("Authorization");

    if (!authHeader) {
      if (throwOnMissing) {
        throw new HTTPException(401, {
          message: "Invalid token: Authentication required",
        });
      }
      return null;
    }

    if (!authHeader.startsWith("Bearer ")) {
      if (throwOnMissing) {
        throw new HTTPException(401, {
          message: "Invalid authentication format. Please use Bearer token",
        });
      }
      return null;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    if (!token || token.trim() === "") {
      if (throwOnMissing) {
        throw new HTTPException(401, {
          message:
            "Authentication token is empty. Please provide a valid token",
        });
      }
      return null;
    }

    return {
      token: token.trim(),
      authHeader,
    };
  }

  /**
   * Extract token from Authorization header (convenience method)
   * @param c - Hono context
   * @returns Token string or throws exception
   */
  static getToken(c: Context): string {
    const result = this.extractBearerToken(c, true);
    return result!.token;
  }

  /**
   * Extract token from Authorization header without throwing
   * @param c - Hono context
   * @returns Token string or null if not found
   */
  static getTokenSafe(c: Context): string | null {
    const result = this.extractBearerToken(c, false);
    return result?.token || null;
  }

  /**
   * Check if request has valid Bearer token format
   * @param c - Hono context
   * @returns True if valid Bearer token exists
   */
  static hasValidBearerToken(c: Context): boolean {
    try {
      const result = this.extractBearerToken(c, false);
      return result !== null;
    } catch {
      return false;
    }
  }

  /**
   * Extract token and validate basic format
   * @param c - Hono context
   * @param minLength - Minimum token length (default: 10)
   * @returns Token extraction result
   */
  static extractAndValidateToken(
    c: Context,
    minLength: number = 10
  ): TokenExtractionResult {
    const result = this.extractBearerToken(c, true);

    if (result!.token.length < minLength) {
      throw new HTTPException(401, {
        message:
          "Authentication token is too short. Please provide a valid token",
      });
    }

    return result!;
  }
}
