# Database Setup Guide

This project uses **Drizzle ORM** with **PostgreSQL** and **CUID2** for unique identifiers.

## Features

- ✅ **PostgreSQL** database with Drizzle ORM
- ✅ **CUID2** for collision-resistant unique IDs
- ✅ **Indexes** for optimized queries (name, email)
- ✅ **Foreign key constraints** with cascade delete
- ✅ **Timestamps** with timezone support
- ✅ **Type-safe** database operations

## Prerequisites

1. **PostgreSQL** installed and running
2. Create a database named `hono_boilerplate`

```bash
# Install PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Create database
createdb hono_boilerplate

# Or using psql
psql postgres
CREATE DATABASE hono_boilerplate;
\q
```

## Environment Setup

Update your `.env` file with PostgreSQL connection details:

```env
# Database Configuration
DATABASE_URL=postgresql://localhost:5432/hono_boilerplate
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=hono_boilerplate
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
```

## Database Schema

### Users Table

- `id` - CUID2 string (primary key)
- `name` - varchar(255) with index
- `email` - varchar(255) with unique index
- `password` - text (hashed)
- `created_at` - timestamp with timezone
- `updated_at` - timestamp with timezone

### Posts Table

- `id` - CUID2 string (primary key)
- `title` - varchar(255) with index
- `content` - text
- `user_id` - varchar(128) foreign key to users.id
- `created_at` - timestamp with timezone
- `updated_at` - timestamp with timezone

## Database Commands

```bash
# Generate migration files
bun run db:generate

# Run migrations
bun run db:migrate

# Push schema changes directly (development only)
bun run db:push

# Open Drizzle Studio (database GUI)
bun run db:studio

# Run custom migrations
bun run migrate

# Seed database with sample data
bun run seed
```

## Migration Workflow

1. **Make schema changes** in `src/database/schema.ts`
2. **Generate migration**: `bun run db:generate`
3. **Review migration** in `src/database/migrations/`
4. **Apply migration**: `bun run db:migrate`

## Example Usage

```typescript
import { db } from "./src/database/connection";
import { users, posts } from "./src/database/schema";
import { eq } from "drizzle-orm";

// Create user
const newUser = await db
  .insert(users)
  .values({
    name: "John Doe",
    email: "john@example.com",
    password: "hashedpassword",
  })
  .returning();

// Find user by email
const user = await db
  .select()
  .from(users)
  .where(eq(users.email, "john@example.com"));

// Create post
const newPost = await db
  .insert(posts)
  .values({
    title: "My Post",
    content: "Post content",
    userId: user.id,
  })
  .returning();
```

## CUID2 Benefits

- **Collision-resistant**: Extremely low probability of duplicates
- **Sortable**: Lexicographically sortable by creation time
- **URL-safe**: Can be used in URLs without encoding
- **Shorter**: More compact than UUIDs
- **Secure**: Cryptographically strong random component

## Performance Optimizations

The schema includes several indexes for optimal query performance:

- `users_email_idx` - Unique index on email (login optimization)
- `users_name_idx` - Index on name (search optimization)
- `posts_user_id_idx` - Index on user_id (foreign key optimization)
- `posts_title_idx` - Index on title (search optimization)

## Development Tools

- **Drizzle Studio**: Visual database browser
- **Type Safety**: Full TypeScript support
- **Zod Integration**: Schema validation
- **Migration System**: Version-controlled schema changes

## Troubleshooting

### Connection Issues

```bash
# Check PostgreSQL status
brew services list | grep postgresql

# Restart PostgreSQL
brew services restart postgresql

# Check if database exists
psql postgres -c "\l" | grep hono_boilerplate
```

### Migration Issues

```bash
# Reset migrations (development only)
# 1. Drop all tables
# 2. Re-run migrations
bun run db:push --force
```

### Permission Issues

```bash
# Grant privileges
psql postgres
GRANT ALL PRIVILEGES ON DATABASE hono_boilerplate TO postgres;
\q
```
