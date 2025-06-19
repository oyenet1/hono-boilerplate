# Hono MVC Boilerplate

A Laravel-inspired MVC structure for Hono.js with TypeScript, built for Bun runtime.

## Features

- 🏗️ **MVC Architecture** - Laravel-inspired structure with controllers, services, and routes
- 🔐 **JWT Authentication** - Secure authentication with Redis-backed sessions
- �️ **PostgreSQL Database** - Production-ready database with Drizzle ORM
- 📊 **Redis Integration** - Caching, sessions, and rate limiting
- ✅ **Input Validation** - Zod schemas with user-friendly error messages
- 🛡️ **Security Features** - CORS, security headers, rate limiting, and authentication
- 🧪 **Comprehensive Testing** - Unit and integration tests with Bun
- ⚡ **Dependency Injection** - Inversify container for clean architecture
- 🚨 **Global Error Handling** - Consistent error responses and logging
- 📝 **Type Safety** - Full TypeScript support with DTOs and schemas
- 🌱 **Database Migrations** - Version-controlled schema changes
- 📁 **Clean Architecture** - Organized codebase with separation of concerns

## Project Structure

```
src/
├── config/           # Configuration files
│   ├── app.ts       # Application config
│   └── database.ts  # Database connection
├── controllers/      # Request handlers (Laravel-like controllers)
│   ├── AuthController.ts
│   ├── UserController.ts
│   └── PostController.ts
├── services/         # Business logic layer
│   ├── AuthService.ts
│   ├── UserService.ts
│   └── PostService.ts
├── middleware/       # Custom middleware
│   └── index.ts     # Auth, CORS, logging middleware
├── routes/          # Route definitions
│   ├── auth.ts
│   ├── users.ts
│   ├── posts.ts
│   └── index.ts
├── database/        # Database related files
│   ├── schema.ts    # Database schema definitions
│   ├── migrate.ts   # Migration runner
│   └── seed.ts      # Database seeder
├── dtos/            # Data Transfer Objects & Validation
│   └── index.ts     # Zod schemas for validation
├── utils/           # Utility functions
│   ├── validation.ts
│   └── response.ts
└── index.ts         # Application entry point
```

## Getting Started

### 1. Install Dependencies

```bash
bun install
```

### 2. Environment Setup

Copy the example environment file and configure:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
DATABASE_URL=file:./local.db
CORS_ORIGIN=*
```

### 3. Database Setup

Run migrations to create tables:

```bash
bun run migrate
```

Seed the database with sample data:

```bash
bun run seed
```

### 4. Start Development Server

```bash
bun run dev
```

The server will start on http://localhost:3000

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user

### Users

- `GET /api/users` - Get all users (paginated)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user (requires auth)
- `DELETE /api/users/:id` - Delete user (requires auth)

### Posts

- `GET /api/posts` - Get all posts (paginated)
- `GET /api/posts/:id` - Get post by ID
- `POST /api/posts` - Create post (requires auth)
- `PUT /api/posts/:id` - Update post (requires auth)
- `DELETE /api/posts/:id` - Delete post (requires auth)
- `GET /api/posts/my-posts` - Get current user's posts (requires auth)

### Other

- `GET /` - Welcome message
- `GET /api/health` - Health check

## Usage Examples

### Register User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### Create Post (with auth token)

```bash
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "My First Post",
    "content": "This is the content of my first post"
  }'
```

## Architecture Explanation

### Controllers

Handle HTTP requests and responses. Similar to Laravel controllers, they:

- Validate input using DTOs
- Call appropriate services
- Return JSON responses

### Services

Contain business logic and interact with the database. They:

- Handle complex business operations
- Interact with the database through Drizzle ORM
- Can be reused across multiple controllers

### DTOs (Data Transfer Objects)

Define the shape and validation rules for data:

- Built with Zod for type-safe validation
- Used for request body and query parameter validation
- Provide TypeScript types

### Middleware

Handle cross-cutting concerns:

- **Auth Middleware**: JWT token validation
- **CORS Middleware**: Cross-origin resource sharing
- **Logger Middleware**: Request logging
- **Error Handler**: Global error handling

### Database

- **Schema**: Drizzle ORM table definitions
- **Migrations**: Database schema setup
- **Seeding**: Sample data for development

## Development Scripts

- `bun run dev` - Start development server with hot reload
- `bun run build` - Build for production
- `bun run start` - Start production server
- `bun run migrate` - Run database migrations
- `bun run seed` - Seed database with sample data

## Technologies Used

- **[Hono.js](https://hono.dev/)** - Lightweight web framework
- **[Bun](https://bun.sh/)** - Fast JavaScript runtime
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- **[Drizzle ORM](https://orm.drizzle.team/)** - Type-safe database operations
- **[Zod](https://zod.dev/)** - Schema validation
- **[PostgreSQL](https://www.postgresql.org/)** - Database
- **[Redis](https://redis.io/)** - Caching and sessions
- **[JWT](https://jwt.io/)** - Authentication tokens
- **[bcrypt](https://www.npmjs.com/package/bcryptjs)** - Password hashing
- **[Inversify](https://inversify.io/)** - Dependency injection

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](./docs/) folder:

### **Quick Reference**

- [**📖 Documentation Index**](./docs/README.md) - Complete guide overview
- [**🗄️ Database Guide**](./docs/DATABASE_GUIDE.md) - PostgreSQL & Drizzle setup
- [**🔒 Security Guide**](./docs/SECURITY_GUIDE.md) - Authentication & security features
- [**🧪 Test Guide**](./docs/TEST_GUIDE.md) - Testing strategies & examples

### **Advanced Topics**

- [**⚡ Dependency Injection**](./docs/DI_GUIDE.md) - Inversify container patterns
- [**🚨 Error Handling**](./docs/ERROR_HANDLERS_GUIDE.md) - Global error management
- [**✅ Validation**](./docs/VALIDATOR_GUIDE.md) - Zod schemas & custom validators
- [**🛡️ Token Extraction**](./docs/TOKEN_EXTRACTOR_GUIDE.md) - JWT utilities

Visit the [**docs folder**](./docs/) for the complete documentation library.

## License

MIT
