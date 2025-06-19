# 🚨 Error Handlers Guide

This guide explains the comprehensive error handling system that provides consistent JSON responses across the entire application.

## ✅ **Consistent Response Format**

All responses follow this standardized format:

### **Success Responses**

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    /* actual data */
  }
}
```

### **Error Responses**

```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Specific error details"]
}
```

## 🔧 **Error Handler Components**

### **1. Global Error Handler Middleware**

```typescript
import { errorHandler } from "./utils/errorHandlers";

// Apply as middleware to catch all errors
app.use("*", errorHandler);
```

**Features:**

- Catches all unhandled errors automatically
- Converts various error types to consistent JSON responses
- Handles HTTPException, ZodError, and generic errors
- Logs errors for debugging
- Hides internal errors in production

### **2. Custom Error Classes**

#### **ValidationError**

```typescript
throw new ValidationError("Invalid input", [
  "Email is required",
  "Password too short",
]);
```

#### **NotFoundError**

```typescript
throw new NotFoundError("User"); // Returns "User not found"
```

#### **UnauthorizedError**

```typescript
throw new UnauthorizedError("Invalid credentials");
```

#### **ForbiddenError**

```typescript
throw new ForbiddenError("Access denied");
```

#### **ConflictError**

```typescript
throw new ConflictError("Email already exists");
```

#### **BadRequestError**

```typescript
throw new BadRequestError("Invalid data", ["Field is required"]);
```

### **3. Specialized Error Handlers**

#### **Database Error Handler**

```typescript
import { handleDatabaseError } from "./utils/errorHandlers";

try {
  await database.createUser(userData);
} catch (error) {
  throw handleDatabaseError(error);
}
```

**Handles:**

- PostgreSQL error codes (23505, 23503, 23514)
- Drizzle-specific errors
- Foreign key violations
- Unique constraint violations

#### **Redis Error Handler**

```typescript
import { handleRedisError } from "./utils/errorHandlers";

try {
  await redis.set(key, value);
} catch (error) {
  throw handleRedisError(error);
}
```

#### **JWT Error Handler**

```typescript
import { handleJWTError } from "./utils/errorHandlers";

try {
  const decoded = await jwt.verify(token);
} catch (error) {
  throw handleJWTError(error);
}
```

## 🎯 **Usage in Controllers**

### **Before (Inconsistent)**

```typescript
// ❌ Old way - inconsistent responses
async getUser(c: Context) {
  try {
    const user = await this.userService.findById(id);
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }
    return c.json({ user }, 200);
  } catch (error) {
    return c.json({ error: "Something went wrong" }, 500);
  }
}
```

### **After (Consistent)**

```typescript
// ✅ New way - consistent error handling
async getUser(c: Context) {
  try {
    const id = c.req.param("id");
    if (!id) {
      throw new BadRequestError("User ID is required");
    }

    const user = await this.userService.findById(id);
    if (!user) {
      throw new NotFoundError("User");
    }

    return ResponseHelper.success(c, user, "User retrieved successfully");
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof BadRequestError) {
      throw error; // Let global handler format the response
    }
    throw handleDatabaseError(error);
  }
}
```

## 🔄 **Validation Error Integration**

The zValidator wrapper automatically formats validation errors:

```typescript
import { zValidator } from "./utils/zValidator";

// Validation errors are automatically formatted
userRoute.post("/", zValidator("json", CreateUserDto), (c) =>
  userController.createUser(c)
);
```

**Validation Error Response:**

```json
{
  "success": false,
  "message": "Validation error",
  "errors": {
    "email": "Invalid email format",
    "password": "Password must be at least 8 characters"
  }
}
```

## 🎨 **Response Patterns**

### **Success Operations**

```typescript
// Create operations
return ResponseHelper.created(c, data, "Resource created successfully");

// Read operations
return ResponseHelper.success(c, data, "Data retrieved successfully");

// Update operations
return ResponseHelper.success(c, data, "Resource updated successfully");

// Delete operations
return ResponseHelper.success(c, null, "Resource deleted successfully");
```

### **Error Operations**

```typescript
// Not found
throw new NotFoundError("Resource");

// Bad request
throw new BadRequestError("Invalid input");

// Unauthorized
throw new UnauthorizedError("Login required");

// Conflict
throw new ConflictError("Resource already exists");

// Database errors
throw handleDatabaseError(error);
```

## 🧪 **Testing Error Responses**

```typescript
// Test error handling
test("should return 404 for non-existent user", async () => {
  const response = await request(app).get("/api/users/999").expect(404);

  expect(response.body).toEqual({
    success: false,
    message: "User not found",
    timestamp: expect.any(String),
  });
});

test("should return 422 for validation errors", async () => {
  const response = await request(app)
    .post("/api/users")
    .send({ email: "invalid" })
    .expect(422);

  expect(response.body).toEqual({
    success: false,
    message: "Validation error",
    errors: {
      email: expect.stringContaining("Invalid email"),
    },
  });
});
```

## 🔍 **Error Logging**

All errors are automatically logged with context:

```typescript
// Automatic error logging includes:
{
  error: "User not found",
  url: "/api/users/123",
  method: "GET",
  ipAddress: "192.168.1.1",
  userId: "user123",
  timestamp: "2025-06-19T20:00:00.000Z"
}
```

## 🛡️ **Security Features**

### **Production Error Hiding**

```typescript
// Development: Shows actual error
"Database connection failed: Connection refused";

// Production: Shows generic message
"Internal Server Error";
```

### **Error Rate Limiting**

- Prevents error spam attacks
- Logs suspicious error patterns
- Integrates with Redis rate limiting

## 📊 **Benefits**

1. **Consistency** - All responses follow the same format
2. **Developer Experience** - Clear error types and messages
3. **Client Integration** - Predictable response structure
4. **Debugging** - Comprehensive error logging
5. **Security** - Safe error exposure in production
6. **Maintenance** - Centralized error handling logic

## 🚀 **Migration Guide**

To migrate existing controllers:

1. **Import error classes:**

   ```typescript
   import {
     NotFoundError,
     BadRequestError,
     handleDatabaseError,
   } from "../utils/errorHandlers";
   ```

2. **Replace manual responses:**

   ```typescript
   // Before
   return c.json({ error: "Not found" }, 404);

   // After
   throw new NotFoundError("Resource");
   ```

3. **Use specialized handlers:**

   ```typescript
   // Before
   catch (error) {
     return c.json({ error: "Database error" }, 500);
   }

   // After
   catch (error) {
     throw handleDatabaseError(error);
   }
   ```

4. **Remove try-catch response logic:**

   ```typescript
   // Before
   try {
     // logic
     return ResponseHelper.success(c, data);
   } catch (error) {
     return ResponseHelper.error(c, error.message);
   }

   // After
   try {
     // logic
     return ResponseHelper.success(c, data);
   } catch (error) {
     throw handleDatabaseError(error); // Let global handler format
   }
   ```

The error handling system ensures consistent, secure, and maintainable error responses across your entire Hono application!
