# Testing Guide

This project uses **Bun Test** for testing with **Inversify** dependency injection to ensure clean, testable code.

## Test Structure

```
test/
├── test-setup.ts           # Test container and utilities
├── services/               # Service layer tests
│   ├── user.service.test.ts
│   ├── auth.service.test.ts
│   └── post.service.test.ts
├── controllers/            # Controller integration tests
│   └── auth.controller.test.ts
└── integration/           # Full integration tests
    └── database.test.ts
```

## Running Tests

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run specific test file
bun test test/services/user.service.test.ts

# Run tests with coverage (if configured)
bun test --coverage
```

## Test Features

### 1. Dependency Injection Testing

- Each test creates its own container instance
- Services are properly injected and isolated
- Easy to mock dependencies when needed

### 2. Database Testing

- Uses in-memory SimpleDatabase for fast tests
- Each test gets a clean database state
- No external database dependencies

### 3. Test Categories

#### Service Tests

- Test business logic in isolation
- Verify service methods work correctly
- Test error handling and edge cases

#### Controller Integration Tests

- Test the interaction between controllers and services
- Verify the dependency injection works correctly
- Focus on business logic rather than HTTP specifics

#### Integration Tests

- Test complete workflows
- Verify data relationships
- Test database consistency

## Writing Tests

### Service Test Example

```typescript
import { expect, test, describe, beforeEach } from "bun:test";
import { createTestContainer, setupTestDatabase } from "../test-setup";
import { TYPES } from "../../src/di/types";
import type { IUserService } from "../../src/interfaces/IUserService";

describe("UserService", () => {
  let container: any;
  let userService: IUserService;

  beforeEach(() => {
    container = createTestContainer();
    userService = container.get(TYPES.UserService);
    setupTestDatabase(container);
  });

  test("should create user", async () => {
    const userData = {
      name: "John Doe",
      email: "john@example.com",
      password: "password123",
    };

    const user = await userService.createUser(userData);
    expect(user.id).toBe(1);
    expect(user.email).toBe(userData.email);
  });
});
```

### Integration Test Example

```typescript
describe("Complete User Flow", () => {
  test("should register, login, and create post", async () => {
    // Register user
    const userData = {
      name: "John Doe",
      email: "john@example.com",
      password: "password123",
    };

    const authResult = await authService.register(userData);
    expect(authResult.user).toBeDefined();

    // Login
    const loginResult = await authService.login({
      email: userData.email,
      password: userData.password,
    });
    expect(loginResult.token).toBeDefined();

    // Create post
    const post = await postService.createPost(
      {
        title: "My Post",
        content: "Post content",
      },
      authResult.user.id
    );
    expect(post.userId).toBe(authResult.user.id);
  });
});
```

## Test Data Management

### Clean State

Each test starts with a clean database state:

```typescript
beforeEach(() => {
  container = createTestContainer();
  setupTestDatabase(container); // Clears and resets DB
});
```

### Minimal Test Data

Tests use minimal, focused data to keep them fast and readable:

```typescript
// Good: Minimal, focused data
const userData = {
  name: "Test User",
  email: "test@example.com",
  password: "password123",
};

// Avoid: Excessive, unnecessary data
const userData = {
  name: "John Michael Smith Jr.",
  email: "john.michael.smith.junior@very-long-domain-name.example.com",
  password: "very-complex-password-with-special-chars-123!@#",
  // ... many other fields
};
```

## Best Practices

### 1. Test Isolation

- Each test should be independent
- Use `beforeEach` to reset state
- Don't rely on test execution order

### 2. Clear Test Names

```typescript
// Good
test("should create user with valid data");
test("should throw error when email already exists");

// Avoid
test("user creation");
test("error handling");
```

### 3. Test One Thing

```typescript
// Good: Tests one specific behavior
test("should hash password during registration", async () => {
  const result = await authService.register(userData);
  const user = await userService.findById(result.user.id);
  expect(user.password).not.toBe(userData.password); // Password is hashed
});

// Avoid: Tests multiple behaviors
test("should register user and login and create post", async () => {
  // Too many concerns in one test
});
```

### 4. Error Testing

Always test both success and error cases:

```typescript
describe("createUser", () => {
  test("should create user successfully", async () => {
    // Test success case
  });

  test("should throw error when email already exists", async () => {
    // Test error case
  });
});
```

## Debugging Tests

### 1. Run Single Test

```bash
bun test test/services/user.service.test.ts
```

### 2. Add Debug Logs

```typescript
test("debug test", async () => {
  console.log("Debug info:", userData);
  const result = await userService.createUser(userData);
  console.log("Result:", result);
});
```

### 3. Test Database State

```typescript
test("check database state", async () => {
  const db = container.get(TYPES.Database);
  const users = await db.getAllUsers();
  console.log("All users:", users);
});
```

## Continuous Integration

Tests run automatically in CI/CD with:

```yaml
# Example GitHub Actions
- name: Run tests
  run: bun test
```

All tests must pass before code can be merged to main branch.
