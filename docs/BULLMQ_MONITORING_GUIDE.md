# BullMQ User Cache Queue Management Guide

## Overview

This guide explains how to monitor and manage the Redis-based user caching queue system using BullMQ dashboard and built-in monitoring endpoints.

## System Architecture

```
User Registration/Login
        ↓
   Queue User Cache Job
        ↓
   BullMQ Processing
        ↓
   Redis Cache Storage
        ↓
   Fast Authentication
```

## Queue Operations

### Supported Job Types

1. **Cache User** (`cacheUser`)

   - Triggered: User creation/update
   - Action: Store user data in Redis with email and ID keys
   - Duration: ~50ms

2. **Validate Email** (`validateEmail`)

   - Triggered: Email existence checks
   - Action: Check database and cache result
   - Duration: ~100ms

3. **Invalidate Cache** (`invalidateCache`)

   - Triggered: User deletion/data changes
   - Action: Remove specific cache entries
   - Duration: ~30ms

4. **Warm Cache** (`warmCache`)
   - Triggered: Batch operations/startup
   - Action: Pre-load frequently accessed users
   - Duration: ~500ms (batch of 10)

## Monitoring Endpoints

### 1. Queue Statistics

```bash
GET /api/v1/monitoring/queue/stats
```

**Response:**

```json
{
  "success": true,
  "data": {
    "userCache": {
      "waiting": 5,
      "active": 2,
      "completed": 1248,
      "failed": 3,
      "total": 1258
    }
  }
}
```

### 2. Cache Statistics

```bash
GET /api/v1/monitoring/cache/stats
```

**Response:**

```json
{
  "success": true,
  "data": {
    "totalUsers": 156,
    "emailMappings": 156,
    "userIdMappings": 156
  }
}
```

### 3. User Cache Check

```bash
GET /api/v1/monitoring/cache/user/john@example.com
```

**Response:**

```json
{
  "success": true,
  "data": {
    "email": "john@example.com",
    "isCached": true,
    "cachedData": {
      "id": "user_123",
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    },
    "cacheStatus": "HIT"
  }
}
```

### 4. Health Check

```bash
GET /api/v1/monitoring/health
```

**Response:**

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "queue": {
      "userCache": {
        "waiting": 2,
        "active": 1,
        "completed": 1248,
        "failed": 0,
        "total": 1251
      }
    },
    "cache": {
      "totalUsers": 156,
      "emailMappings": 156,
      "userIdMappings": 156
    },
    "timestamp": "2024-01-15T15:45:30Z"
  }
}
```

### 5. Dashboard Configuration

```bash
GET /api/v1/monitoring/dashboard/config
```

## Setting Up BullMQ Dashboard

### Method 1: Bull Board (Recommended)

1. **Create Dashboard Server**

```bash
mkdir bull-dashboard
cd bull-dashboard
npm init -y
npm install @bull-board/api @bull-board/express bull
```

2. **Create Dashboard Script** (`dashboard.js`)

```javascript
const express = require("express");
const { createBullBoard } = require("@bull-board/api");
const { BullAdapter } = require("@bull-board/api/bullAdapter");
const { ExpressAdapter } = require("@bull-board/express");
const Queue = require("bull");

// Create queue instance (must match your app's queue)
const userCacheQueue = new Queue("user-cache", {
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
});

// Setup Bull Board
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
  queues: [new BullAdapter(userCacheQueue)],
  serverAdapter: serverAdapter,
});

const app = express();

app.use("/admin/queues", serverAdapter.getRouter());

// Health endpoint for dashboard
app.get("/health", (req, res) => {
  res.json({
    status: "Dashboard running",
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.DASHBOARD_PORT || 3001;
app.listen(PORT, () => {
  console.log(
    `🎛️  BullMQ Dashboard running on http://localhost:${PORT}/admin/queues`
  );
  console.log(`📊 Queue: user-cache`);
});
```

3. **Run Dashboard**

```bash
node dashboard.js
```

4. **Access Dashboard**

- URL: `http://localhost:3001/admin/queues`
- Features: Job monitoring, retry failed jobs, view job data

### Method 2: Redis Commander (Alternative)

1. **Install Redis Commander**

```bash
npm install -g redis-commander
```

2. **Run Redis Commander**

```bash
redis-commander --redis-host localhost --redis-port 6379
```

3. **Access Interface**

- URL: `http://localhost:8081`
- View: Raw Redis keys and queue data

## Queue Performance Monitoring

### Key Metrics to Watch

1. **Queue Health Indicators**

   - ✅ Waiting jobs < 100 (healthy)
   - ⚠️ Waiting jobs 100-500 (monitor)
   - ❌ Waiting jobs > 500 (investigate)

2. **Failure Rate**

   - ✅ Failed jobs < 1% (healthy)
   - ⚠️ Failed jobs 1-5% (monitor)
   - ❌ Failed jobs > 5% (investigate)

3. **Processing Speed**
   - Cache operations: < 100ms
   - Email validation: < 200ms
   - Batch warming: < 1s per 10 users

### Performance Optimization

1. **Scaling Workers**

```bash
# Run multiple worker processes
node src/jobs/user-cache-processor.js &
node src/jobs/user-cache-processor.js &
node src/jobs/user-cache-processor.js &
```

2. **Redis Configuration**

```bash
# Optimize Redis for caching
redis-cli CONFIG SET maxmemory-policy allkeys-lru
redis-cli CONFIG SET maxmemory 2gb
```

3. **Queue Settings** (adjust in `user-cache-queue.ts`)

```typescript
const queueOptions = {
  defaultJobOptions: {
    removeOnComplete: 100, // Keep last 100 completed
    removeOnFail: 50, // Keep last 50 failed
    attempts: 3, // Retry failed jobs
    backoff: "exponential", // Backoff strategy
  },
  settings: {
    stalledInterval: 30000, // Check for stalled jobs
    maxStalledCount: 1, // Max stalled before failed
  },
};
```

## Common Issues & Solutions

### 1. Queue Stuck

```bash
# Check active jobs
curl http://localhost:3000/api/v1/monitoring/queue/stats

# Clear stalled jobs via dashboard
# Or restart worker process
```

### 2. High Memory Usage

```bash
# Check cache size
curl http://localhost:3000/api/v1/monitoring/cache/stats

# Clean old cache entries
redis-cli EVAL "return redis.call('del', unpack(redis.call('keys', 'cache:user:*')))" 0
```

### 3. Slow Processing

```bash
# Monitor job processing time in dashboard
# Scale workers horizontally
# Optimize Redis connection pooling
```

## Integration with Authentication

### UserService Integration

```typescript
// In UserService - trigger caching after user creation
async createUser(userData: CreateUserRequest): Promise<User> {
  const user = await this.database.createUser(userData);

  // Queue user caching
  const userCacheService = container.get(UserCacheService);
  await userCacheService.cacheUser(user, 'CREATE');

  return user;
}
```

### Authentication Flow

```typescript
// In SecureAuthService - use cached data for faster auth
async login(email: string, password: string): Promise<AuthResult> {
  const userCacheService = container.get(UserCacheService);

  // Try cache first
  let user = await userCacheService.getUserByEmail(email);

  if (!user) {
    // Fallback to database
    user = await this.userService.getUserByEmail(email);
    if (user) {
      // Cache for next time
      await userCacheService.cacheUser(user, 'UPDATE');
    }
  }

  // Continue with authentication...
}
```

## Security Considerations

1. **Access Control**

   - Monitoring endpoints should be protected
   - Dashboard should require authentication
   - Redis should use AUTH if exposed

2. **Data Sensitivity**

   - Cache only necessary user data
   - Set appropriate TTL for cache entries
   - Use encryption for sensitive data

3. **Rate Limiting**
   - Apply rate limits to monitoring endpoints
   - Prevent queue flooding attacks
   - Monitor for unusual job patterns

## Maintenance Tasks

### Daily

- Check queue health status
- Monitor failure rates
- Verify cache hit ratios

### Weekly

- Review job processing times
- Clean up old completed jobs
- Analyze cache usage patterns

### Monthly

- Optimize queue configuration
- Review Redis memory usage
- Update monitoring dashboards

## Troubleshooting Commands

```bash
# Check Redis connection
redis-cli ping

# View queue keys
redis-cli KEYS "bull:user-cache:*"

# Monitor queue activity
redis-cli MONITOR

# Check worker processes
ps aux | grep node

# View application logs
tail -f logs/app.log | grep -E "(queue|cache)"
```

This comprehensive guide provides everything needed to monitor and manage your user cache queue system effectively using BullMQ dashboard and built-in monitoring tools.
