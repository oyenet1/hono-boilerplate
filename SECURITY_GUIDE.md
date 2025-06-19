# Hono MVC Boilerplate - Security Enhanced

A bulletproof, secure Laravel-inspired MVC structure for Hono.js with TypeScript, built for Bun runtime with enterprise-grade security features.

## 🔒 Security Features

### Authentication & Session Management

- **Hono JWT** - Built-in JWT implementation
- **Redis Sessions** - Secure server-side session storage
- **BCrypt** - Industry-standard password hashing
- **Session Validation** - Real-time session verification
- **Secure Session IDs** - Cryptographically secure session identifiers
- **Session Refresh** - Seamless token renewal

### Protection Mechanisms

- **Rate Limiting** - Configurable per-route rate limits
- **Login Attempt Protection** - Anti-brute force mechanisms
- **IP-based Tracking** - Track attempts by IP and email
- **Security Headers** - OWASP recommended headers
- **CORS Protection** - Configurable cross-origin policies

### Industry Standards

- **Dependency Injection** - Inversify for clean architecture
- **Error Handling** - Centralized error management
- **Logging** - Comprehensive request/response logging
- **Graceful Shutdown** - Clean resource cleanup

## 🏗️ Architecture

```
src/
├── config/
│   ├── app.ts              # Application configuration
│   ├── database.ts         # Database connection
│   └── redis.ts            # Redis connection & session management
├── controllers/            # Request handlers
│   ├── AuthController.ts   # Authentication endpoints
│   ├── UserController.ts   # User management
│   └── PostController.ts   # Post management
├── services/               # Business logic layer
│   ├── SecureAuthService.ts # Bulletproof authentication
│   ├── UserService.ts      # User operations
│   └── PostService.ts      # Post operations
├── middleware/             # Security middleware
│   └── security.ts         # Auth, rate limiting, security headers
├── routes/                 # Route definitions with proper naming
│   ├── authRoute.ts        # Authentication routes
│   ├── userRoute.ts        # User routes
│   ├── postRoute.ts        # Post routes
│   └── index.ts            # Route aggregation
├── di/                     # Dependency injection
│   ├── container.ts        # IoC container setup
│   └── types.ts            # DI symbols
├── interfaces/             # TypeScript interfaces
├── database/               # Database layer
├── dtos/                   # Data transfer objects
└── utils/                  # Utility functions
```

## 🚀 Getting Started

### 1. Prerequisites

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install Redis (macOS)
brew install redis
brew services start redis

# Install Redis (Ubuntu)
sudo apt install redis-server
sudo systemctl start redis-server
```

### 2. Installation

```bash
# Clone and install dependencies
git clone <your-repo>
cd hono-boilerplate
bun install
```

### 3. Environment Configuration

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Application
PORT=3000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Database
DATABASE_URL=file:./local.db

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_KEY_PREFIX=hono:

# Security Configuration
SESSION_TTL=3600
MAX_LOGIN_ATTEMPTS=5
LOGIN_ATTEMPT_WINDOW=900
PASSWORD_RESET_TTL=900

# Rate Limiting
RATE_LIMIT_WINDOW=60
RATE_LIMIT_MAX=100
```

### 4. Database Setup

```bash
# Run migrations
bun run migrate

# Seed database
bun run seed
```

### 5. Start Application

```bash
# Development mode
bun run dev

# Production mode
bun run build
bun start
```

## 🔐 Security Implementation

### Rate Limiting Tiers

```typescript
// Authentication endpoints - Very restrictive
rateLimits.auth: 5 requests per 15 minutes

// API endpoints - Moderate
rateLimits.api: 60 requests per minute

// Public endpoints - Lenient
rateLimits.public: 100 requests per minute

// Sensitive operations - Ultra strict
rateLimits.sensitive: 3 requests per hour
```

### Authentication Flow

1. **Registration/Login** → Secure password hashing with BCrypt
2. **Session Creation** → Cryptographically secure session ID
3. **Redis Storage** → Session data stored server-side
4. **JWT Token** → Contains session ID and user info
5. **Request Validation** → Real-time session verification
6. **Activity Tracking** → IP, User-Agent, timestamp logging

### Protection Features

- **Brute Force Protection**: Blocks IPs/emails after failed attempts
- **Session Hijacking Prevention**: Session validation on every request
- **Token Expiration**: Configurable session timeouts
- **Security Headers**: OWASP recommended headers
- **Request Logging**: Comprehensive audit trail

## 📊 API Endpoints

### Authentication Routes

```
POST /api/auth/register    # User registration
POST /api/auth/login       # User login
POST /api/auth/logout      # Session termination
POST /api/auth/refresh     # Token refresh
```

### User Routes

```
GET    /api/users          # List users (public)
GET    /api/users/:id      # Get user (public)
PUT    /api/users/:id      # Update user (protected)
DELETE /api/users/:id      # Delete user (protected + sensitive)
```

### Post Routes

```
GET    /api/posts          # List posts (public)
GET    /api/posts/:id      # Get post (public)
POST   /api/posts          # Create post (protected)
PUT    /api/posts/:id      # Update post (protected)
DELETE /api/posts/:id      # Delete post (protected + sensitive)
GET    /api/posts/my-posts # User's posts (protected)
```

## 🧪 Testing

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run specific test
bun test test/services/auth.service.test.ts
```

### Test Coverage

- ✅ Service layer testing with dependency injection
- ✅ Controller integration testing
- ✅ Authentication flow testing
- ✅ Rate limiting testing
- ✅ Session management testing

## 🛠️ Development Scripts

```bash
bun run dev          # Start development server
bun run build        # Build for production
bun run start        # Start production server
bun run migrate      # Run database migrations
bun run seed         # Seed database with test data
bun test             # Run test suite
bun test --watch     # Watch mode testing
```

## 📋 Security Checklist

- [x] JWT token-based authentication
- [x] BCrypt password hashing
- [x] Redis session management
- [x] Rate limiting per route
- [x] Brute force protection
- [x] Security headers (OWASP)
- [x] CORS configuration
- [x] Request/response logging
- [x] Error handling & logging
- [x] Input validation (Zod)
- [x] Dependency injection
- [x] Graceful shutdown
- [x] Session expiration
- [x] IP tracking
- [x] Comprehensive testing

## 🌟 Key Improvements

1. **Bulletproof Authentication**: Multi-layer session validation
2. **Redis Integration**: High-performance session storage
3. **Smart Rate Limiting**: Route-specific, configurable limits
4. **Security Headers**: Complete OWASP protection
5. **Clean Architecture**: Dependency injection with Inversify
6. **Comprehensive Logging**: Audit trail for all operations
7. **Route Organization**: Proper naming convention (userRoute.ts, etc.)
8. **Testing Suite**: Full coverage with mocked dependencies

## 🔧 Configuration

All security settings are configurable via environment variables. See `.env.example` for all available options.

## 📈 Performance

- **Redis Caching**: Fast session lookups
- **Efficient Rate Limiting**: Redis-based sliding window
- **Connection Pooling**: Optimized database connections
- **Graceful Shutdown**: Clean resource management

This implementation follows industry best practices and is designed to be production-ready, secure, and scalable.
