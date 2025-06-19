# Token Extractor Utility Guide

This guide documents the centralized token extraction utility implemented throughout the application.

## Overview

The `TokenExtractor` utility provides a consistent and secure way to extract Bearer tokens from HTTP requests. It eliminates code duplication and ensures uniform error handling across all authentication points in the application.

## Implementation

### Location

`src/utils/tokenExtractor.ts`

### Features

- ✅ **Centralized Logic** - Single source of truth for token extraction
- ✅ **Consistent Error Messages** - User-friendly, standardized error responses
- ✅ **Type Safety** - Full TypeScript support with interfaces
- ✅ **Flexible Usage** - Multiple methods for different use cases
- ✅ **Security** - Proper validation and error handling

## API Reference

### Interfaces

```typescript
export interface TokenExtractionResult {
  token: string;
  authHeader: string;
}
```

### Methods

#### `extractBearerToken(c: Context, throwOnMissing: boolean = true)`

Main extraction method with flexible error handling.

**Parameters:**

- `c` - Hono context object
- `throwOnMissing` - Whether to throw exception if token is missing (default: true)

**Returns:** `TokenExtractionResult | null`

**Throws:** `HTTPException(401)` if token is invalid/missing and `throwOnMissing` is true

#### `getToken(c: Context)`

Convenience method that always throws on missing token.

**Parameters:**

- `c` - Hono context object

**Returns:** `string` - The extracted token

**Throws:** `HTTPException(401)` if token is invalid or missing

#### `getTokenSafe(c: Context)`

Safe extraction method that never throws.

**Parameters:**

- `c` - Hono context object

**Returns:** `string | null` - The token or null if not found

#### `hasValidBearerToken(c: Context)`

Check if request has a valid Bearer token format.

**Parameters:**

- `c` - Hono context object

**Returns:** `boolean` - True if valid Bearer token exists

#### `extractAndValidateToken(c: Context, minLength: number = 10)`

Extract token with additional length validation.

**Parameters:**

- `c` - Hono context object
- `minLength` - Minimum token length (default: 10)

**Returns:** `TokenExtractionResult`

**Throws:** `HTTPException(401)` if token is invalid, missing, or too short

## Error Messages

All error messages are user-friendly and actionable:

- **Missing Authorization header**: "Authentication required. Please login to continue"
- **Invalid format**: "Invalid authentication format. Please use Bearer token"
- **Empty token**: "Authentication token is empty. Please provide a valid token"
- **Token too short**: "Authentication token is too short. Please provide a valid token"

## Usage Examples

### Basic Token Extraction

```typescript
import { TokenExtractor } from "../utils/tokenExtractor";

// In middleware - throws on missing token
export const authMiddleware = async (c: Context, next: Next) => {
  const token = TokenExtractor.getToken(c);
  // Use token for verification...
};
```

### Safe Token Extraction

```typescript
// In optional authentication scenarios
export const optionalAuthMiddleware = async (c: Context, next: Next) => {
  const token = TokenExtractor.getTokenSafe(c);
  if (token) {
    // User is authenticated
    // Verify token and set user context
  }
  // Continue regardless of token presence
  await next();
};
```

### Token Presence Check

```typescript
// Check if user is authenticated without extracting
export const checkAuthStatus = (c: Context) => {
  const isAuthenticated = TokenExtractor.hasValidBearerToken(c);
  return { authenticated: isAuthenticated };
};
```

### Advanced Token Validation

```typescript
// Extract with custom validation
export const strictAuthMiddleware = async (c: Context, next: Next) => {
  const { token, authHeader } = TokenExtractor.extractAndValidateToken(c, 32);
  // Token is guaranteed to be at least 32 characters
  // Use token for verification...
};
```

## Integration Points

The `TokenExtractor` is currently integrated in:

### 1. Security Middleware (`src/middleware/security.ts`)

```typescript
export const secureAuthMiddleware = async (c: Context, next: Next) => {
  const token = TokenExtractor.getToken(c);
  // Session verification logic...
};
```

### 2. Basic Auth Middleware (`src/middleware/index.ts`)

```typescript
export const authMiddleware = async (c: Context, next: Next) => {
  const token = TokenExtractor.getToken(c);
  // JWT verification logic...
};
```

### 3. Auth Controller (`src/controllers/AuthController.ts`)

```typescript
async logout(c: Context) {
  const token = TokenExtractor.getTokenSafe(c);
  // Logout logic...
}
```

## Migration from Manual Extraction

### Before (Manual Pattern)

```typescript
// ❌ Old manual pattern - repeated across multiple files
const authHeader = c.req.header("Authorization");
if (!authHeader || !authHeader.startsWith("Bearer ")) {
  throw new HTTPException(401, { message: "Unauthorized" });
}
const token = authHeader.substring(7);
```

### After (TokenExtractor)

```typescript
// ✅ New centralized pattern - consistent everywhere
const token = TokenExtractor.getToken(c);
```

## Benefits

### 1. **Code Consistency**

- Same logic used everywhere
- Uniform error messages
- Standardized validation

### 2. **Maintainability**

- Single place to update extraction logic
- Easy to add new validation rules
- Centralized error message management

### 3. **Security**

- Consistent validation across all endpoints
- No forgotten edge cases
- Proper error handling

### 4. **Developer Experience**

- Simple, intuitive API
- TypeScript support
- Clear method names

### 5. **Testing**

- Easy to unit test extraction logic
- Consistent behavior in tests
- Mockable for different scenarios

## Testing

```typescript
// Example test cases
describe("TokenExtractor", () => {
  it("should extract valid Bearer token", () => {
    const mockContext = createMockContext({
      headers: { Authorization: "Bearer valid-token-123" },
    });

    const token = TokenExtractor.getToken(mockContext);
    expect(token).toBe("valid-token-123");
  });

  it("should return null for missing token in safe mode", () => {
    const mockContext = createMockContext({ headers: {} });

    const token = TokenExtractor.getTokenSafe(mockContext);
    expect(token).toBeNull();
  });

  it("should throw for invalid format", () => {
    const mockContext = createMockContext({
      headers: { Authorization: "Basic invalid-format" },
    });

    expect(() => TokenExtractor.getToken(mockContext)).toThrow(
      "Invalid authentication format"
    );
  });
});
```

## Best Practices

### 1. **Use Appropriate Method**

- `getToken()` for required authentication
- `getTokenSafe()` for optional authentication
- `hasValidBearerToken()` for presence checks

### 2. **Handle Errors Properly**

- Let TokenExtractor handle format validation
- Focus your code on business logic
- Use consistent error responses

### 3. **Don't Duplicate Logic**

- Always use TokenExtractor instead of manual extraction
- Don't implement custom token parsing
- Trust the centralized validation

### 4. **Documentation**

- Document when and why you're using specific methods
- Include error handling in your endpoint documentation
- Update API docs with consistent error responses

## Future Enhancements

Potential improvements to consider:

1. **Multiple Token Types** - Support for different authentication schemes
2. **Token Caching** - Cache validated tokens for performance
3. **Rate Limiting Integration** - Track failed extractions for security
4. **Audit Logging** - Log all token extraction attempts
5. **Custom Validators** - Allow custom token format validation

This centralized approach ensures your authentication system is robust, maintainable, and consistent across your entire application.
