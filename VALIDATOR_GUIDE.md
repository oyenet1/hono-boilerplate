# 🛡️ Validator Wrapper & Response Standards

## ✅ **Consistent JSON Response Format**

All API responses now follow a standardized format with three possible structures:

### **Success Response**

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  }
}
```

### **Error Response**

```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Specific error message 1", "Specific error message 2"]
}
```

### **Validation Error Response**

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "email: Invalid email format",
    "password: Password must be at least 8 characters"
  ]
}
```

## 🔧 **zValidator Wrapper**

The custom `zValidator` wrapper provides automatic validation with consistent error responses.

### **Usage Examples**

```typescript
import {
  validateJson,
  validateQuery,
  validateParam,
} from "../utils/zValidator";
import { CreateUserDto, PaginationDto } from "../dtos";

// JSON body validation
app.post("/users", validateJson(CreateUserDto), (c) => {
  // Body is automatically validated
  const userData = c.req.valid("json");
  return c.json({ success: true, data: userData });
});

// Query parameter validation
app.get("/users", validateQuery(PaginationDto), (c) => {
  // Query params are automatically validated
  const { page, limit } = c.req.valid("query");
  return c.json({ success: true, data: { page, limit } });
});

// URL parameter validation
const PostIdSchema = z.object({
  id: z.string().min(1, "Post ID is required"),
});

app.get("/posts/:id", validateParam(PostIdSchema), (c) => {
  // URL params are automatically validated
  const { id } = c.req.valid("param");
  return c.json({ success: true, data: { id } });
});
```

### **Available Validator Functions**

```typescript
// JSON body validation
validateJson<T>(schema: T)

// Form data validation
validateBody<T>(schema: T)

// Query parameters validation
validateQuery<T>(schema: T)

// URL parameters validation
validateParam<T>(schema: T)

// HTTP headers validation
validateHeader<T>(schema: T)

// Generic validator
zValidator<T, Target>(target: Target, schema: T)
```

## 📝 **Route Implementation Examples**

### **Auth Routes**

```typescript
// Registration with validation
authRoute.post("/register", validateJson(CreateUserDto), (c) =>
  authController.register(c)
);

// Login with validation
authRoute.post("/login", validateJson(LoginDto), (c) =>
  authController.login(c)
);
```

### **User Routes**

```typescript
// Get users with pagination
userRoute.get("/", validateQuery(PaginationDto), (c) =>
  userController.getUsers(c)
);

// Update user with validation
userRoute.put(
  "/:id",
  secureAuthMiddleware,
  validateParam(UserIdSchema),
  validateJson(UpdateUserDto),
  (c) => userController.updateUser(c)
);
```

### **Post Routes**

```typescript
// Create post with validation
postRoute.post("/", secureAuthMiddleware, validateJson(CreatePostDto), (c) =>
  postController.createPost(c)
);

// Get posts with pagination
postRoute.get("/", validateQuery(PaginationDto), (c) =>
  postController.getPosts(c)
);
```

## 🎯 **Controller Response Standards**

All controllers now use `ResponseHelper` for consistent responses:

```typescript
import { ResponseHelper } from "../utils/response";

export class UserController {
  async getUsers(c: Context) {
    try {
      const users = await this.userService.getAllUsers();
      return ResponseHelper.success(c, users, "Users retrieved successfully");
    } catch (error) {
      return ResponseHelper.error(c, "Failed to retrieve users", 500);
    }
  }

  async createUser(c: Context) {
    try {
      const userData = c.req.valid("json");
      const user = await this.userService.createUser(userData);
      return ResponseHelper.created(c, user, "User created successfully");
    } catch (error) {
      if (error.message.includes("already exists")) {
        return ResponseHelper.badRequest(c, error.message);
      }
      return ResponseHelper.error(c, "Failed to create user", 500);
    }
  }
}
```

## 🛠️ **ResponseHelper Methods**

```typescript
// Success responses
ResponseHelper.success(c, data, message, status, meta);
ResponseHelper.created(c, data, message);

// Error responses
ResponseHelper.error(c, message, status, errors);
ResponseHelper.badRequest(c, message, errors);
ResponseHelper.unauthorized(c, message);
ResponseHelper.forbidden(c, message);
ResponseHelper.notFound(c, message);

// Paginated responses
ResponseHelper.paginated(c, data, page, limit, total, message);
```

## 🔍 **Error Handling Flow**

1. **Validation Errors**: Automatically caught by `zValidator` wrapper
2. **Business Logic Errors**: Handled in controllers with try/catch
3. **Authentication Errors**: Handled by middleware
4. **Rate Limiting Errors**: Handled by rate limiting middleware
5. **Database Errors**: Caught and transformed in services

## 📊 **Benefits**

✅ **Consistent API**: All responses follow the same format  
✅ **Type Safety**: Full TypeScript support with validation  
✅ **Error Clarity**: Detailed error messages for debugging  
✅ **Developer Experience**: Easy to use and understand  
✅ **Frontend Friendly**: Predictable response structure  
✅ **Testing**: Easier to test with consistent responses

## 🚀 **Testing Examples**

```typescript
// Test successful response
expect(response.body).toEqual({
  success: true,
  message: "User created successfully",
  data: expect.objectContaining({
    id: expect.any(String),
    email: "test@example.com",
  }),
});

// Test validation error
expect(response.body).toEqual({
  success: false,
  message: "Validation failed",
  errors: ["email: Invalid email format"],
});

// Test business logic error
expect(response.body).toEqual({
  success: false,
  message: "User not found",
  errors: [],
});
```

This standardized approach ensures that your API is consistent, predictable, and easy to work with for both developers and frontend applications!
