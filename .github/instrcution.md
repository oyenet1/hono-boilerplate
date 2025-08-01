# Complete Email Queue System Implementation Guide

## Table of Contents

1. [Overview & Architecture](#overview--architecture)
2. [System Components](#system-components)
3. [File Structure & Implementation](#file-structure--implementation)
4. [Configuration & Setup](#configuration--setup)
5. [Usage Examples & API](#usage-examples--api)
6. [Template System](#template-system)
7. [Error Handling & Monitoring](#error-handling--monitoring)
8. [Performance & Scalability](#performance--scalability)
9. [Security & Best Practices](#security--best-practices)
10. [Testing & Debugging](#testing--debugging)
11. [Troubleshooting Guide](#troubleshooting-guide)
12. [Implementation Checklist](#implementation-checklist)

---

## Overview & Architecture

### System Purpose

This email queue system provides **asynchronous, reliable email processing** for high-performance applications. It prevents blocking operations during user interactions (like booking requests) by queuing emails for background processing.

### Key Benefits

- ✅ **Non-blocking operations** - Fast API responses
- ✅ **Reliable delivery** - Retry logic with exponential backoff
- ✅ **Scalable processing** - Concurrent workers
- ✅ **Template-based emails** - Handlebars templating engine
- ✅ **Job persistence** - Redis-backed queue storage
- ✅ **Comprehensive monitoring** - Job status tracking

### Architecture Flow

```
Application Request → BullMQ Queue (Redis) → Email Worker → Template Engine → SMTP Transport
                           ↓
                    Job Persistence & Retry Logic
```

### Tech Stack Components

- **Queue Management**: BullMQ + Redis
- **Email Processing**: Nodemailer + SMTP
- **Template Engine**: Handlebars
- **Background Workers**: BullMQ Workers
- **Monitoring**: Event-based job tracking

---

## System Components

### 1. Email Queue (`email-queue.ts`)

**Purpose**: Central queue management with job definitions and queueing functions
**Responsibilities**:

- Define queue configuration and retry policies
- Provide job interfaces (TemplateEmailJob, SimpleEmailJob)
- Export queueing functions for different email types

### 2. Email Worker (`email-processor.ts`)

**Purpose**: Background processor that handles queued email jobs
**Responsibilities**:

- Process jobs concurrently (configurable concurrency)
- Route jobs to appropriate EmailService methods
- Handle job success/failure events
- Implement retry logic for failed jobs

### 3. Email Service (`EmailService.ts`)

**Purpose**: Core email sending logic with template processing
**Responsibilities**:

- Configure SMTP transport (Nodemailer)
- Load and compile Handlebars templates
- Send emails synchronously or queue asynchronously
- Provide convenience methods (welcome, password reset)

### 4. Template System (`templates/emails/`)

**Purpose**: Handlebars-based email templates
**Responsibilities**:

- Define reusable email layouts
- Support dynamic content injection
- Maintain consistent branding

### 5. Redis Configuration (`redis.ts`)

**Purpose**: Queue storage and job persistence
**Responsibilities**:

- Provide reliable job storage
- Enable job retry and failure tracking
- Support queue monitoring and cleanup

---

## File Structure & Implementation

```
src/
├── jobs/
│   ├── email-queue.ts           # Queue definition & job functions
│   └── email-processor.ts       # Worker that processes jobs
├── services/
│   └── EmailService.ts          # Core email sending logic
├── templates/
│   └── emails/
│       ├── welcome.hbs          # Welcome email template
│       ├── guestBooking.hbs     # Guest booking confirmation
│       ├── hotelBooking.hbs     # Hotel booking notification
│       └── password-reset.hbs   # Password reset email
├── config/
│   ├── redis.ts                 # Redis connection config
│   └── env.ts                   # Environment variables
├── utils/
│   └── ApiResponse.ts           # API response utilities
└── index.ts                     # Main app (import email-processor)
```

### Implementation Details

#### 1. Email Queue Implementation (`src/jobs/email-queue.ts`)

```typescript
import { Queue } from "bullmq";
import { redisConnection } from "../config/redis";

export const emailQueue = new Queue("emailQueue", {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 50, // Keep last 50 failed jobs
    attempts: 3, // Retry failed jobs up to 3 times
    backoff: {
      type: "exponential",
      delay: 5000, // Start with 5 second delay
    },
  },
});

// Job interface definitions
export interface TemplateEmailJob {
  to: string;
  subject: string;
  templateName: string;
  context: Record<string, any>;
}

export interface SimpleEmailJob {
  to: string;
  subject: string;
  body: string;
}

// Queue functions
export const queueTemplateEmail = async (data: TemplateEmailJob) => {
  await emailQueue.add("sendTemplateEmail", data);
  console.log(`📧 Template email queued for ${data.to}`);
};

export const queueSimpleEmail = async (data: SimpleEmailJob) => {
  await emailQueue.add("sendSimpleEmail", data);
  console.log(`📧 Simple email queued for ${data.to}`);
};

export const queueBookingEmails = async (
  guestEmail: TemplateEmailJob,
  hotelEmail?: TemplateEmailJob
) => {
  const jobs = [guestEmail];
  if (hotelEmail) jobs.push(hotelEmail);

  await Promise.all(
    jobs.map((job) => emailQueue.add("sendTemplateEmail", job))
  );

  console.log(`📧 ${jobs.length} booking emails queued`);
};
```

#### 2. Email Worker Implementation (`src/jobs/email-processor.ts`)

```typescript
import { Worker } from "bullmq";
import { redisConnection } from "../config/redis";
import { EmailService } from "../services/EmailService";
import { TemplateEmailJob, SimpleEmailJob } from "./email-queue";

// Initialize email service
const emailService = new EmailService();

// Create email worker
const emailWorker = new Worker(
  "emailQueue",
  async (job) => {
    const { name, data } = job;

    try {
      console.log(`Processing email job: ${name} for ${data.to}`);

      switch (name) {
        case "sendTemplateEmail":
          const templateData = data as TemplateEmailJob;
          await emailService.sendTemplateEmail({
            to: templateData.to,
            subject: templateData.subject,
            templateName: templateData.templateName,
            context: templateData.context,
          });
          console.log(
            `✅ Template email sent successfully to ${templateData.to}`
          );
          break;

        case "sendSimpleEmail":
          const simpleData = data as SimpleEmailJob;
          // Implement simple email sending logic
          console.log(`✅ Simple email sent successfully to ${simpleData.to}`);
          break;

        default:
          throw new Error(`Unknown email job type: ${name}`);
      }
    } catch (error) {
      console.error(`❌ Failed to send email to ${data.to}:`, error);
      throw error; // Re-throw to trigger retry mechanism
    }
  },
  {
    connection: redisConnection,
    concurrency: 5, // Process up to 5 emails concurrently
  }
);

// Handle worker events
emailWorker.on("completed", (job) => {
  console.log(`📧 Email job ${job.id} completed successfully`);
});

emailWorker.on("failed", (job, err) => {
  console.error(`📧 Email job ${job?.id} failed:`, err.message);
});

emailWorker.on("error", (err) => {
  console.error("📧 Email worker error:", err);
});

console.log("📧 Email worker started and ready to process jobs");

export { emailWorker };
```

#### 3. Email Service Implementation (`src/services/EmailService.ts`)

```typescript
import * as nodemailer from "nodemailer";
import { readFileSync } from "fs";
import * as path from "path";
import * as Handlebars from "handlebars";
import { env } from "../config/env";
import { queueTemplateEmail } from "../jobs/email-queue";

interface EmailOptions {
  to: string;
  subject: string;
  templateName: string;
  context: Record<string, any>;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private templatesDir: string;

  constructor() {
    // Initialize the email transporter
    this.transporter = nodemailer.createTransporter({
      pool: true,
      host: env("SMTP_HOST"),
      port: 465,
      secure: true, // Use TLS
      maxConnections: 5,
      maxMessages: 100,
      auth: {
        user: env("SMTP_USER"),
        pass: env("SMTP_PASSWORD"),
      },
      tls: { rejectUnauthorized: false },
    } as nodemailer.TransportOptions);

    // Set the templates directory path
    this.templatesDir = path.join(process.cwd(), "src/templates/emails");
  }

  /**
   * Sends an email using a template (synchronous)
   */
  async sendTemplateEmail(options: EmailOptions) {
    try {
      // Load the template file
      const templatePath = path.join(
        this.templatesDir,
        `${options.templateName}.hbs`
      );
      const templateSource = readFileSync(templatePath, "utf8");

      // Compile the template with Handlebars
      const template = Handlebars.compile(templateSource);

      // Always add current year to context
      let contextWithYear = {
        ...options.context,
        year: new Date().getFullYear(),
      };

      const html = template(contextWithYear);

      // Send the email
      const result = await this.transporter.sendMail({
        from: '"Your App" <noreply@yourapp.com>',
        to: options.to,
        subject: options.subject,
        html,
        envelope: {
          from: '"Your App" <noreply@yourapp.com>',
          to: options.to,
        },
      });

      return result;
    } catch (error) {
      console.error("Failed to send email:", error);
      throw new Error(
        `Failed to send email: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Queues an email to be sent asynchronously (recommended)
   */
  async queueTemplateEmail(options: EmailOptions) {
    await queueTemplateEmail(options);
    console.log(
      `📧 Email queued for ${options.to} with template ${options.templateName}`
    );
  }

  /**
   * Convenience method: Send welcome email
   */
  async sendWelcomeEmail(email: string, firstName: string) {
    return this.sendTemplateEmail({
      to: email,
      subject: "Welcome to Our App!",
      templateName: "welcome",
      context: {
        firstName,
        loginUrl: env("FRONTEND_URL", "https://example.com") + "/login",
      },
    });
  }

  /**
   * Convenience method: Send password reset email
   */
  async sendPasswordResetEmail(email: string, resetToken: string) {
    const resetUrl = `${env(
      "FRONTEND_URL",
      "https://example.com"
    )}/reset-password?token=${resetToken}`;

    return this.sendTemplateEmail({
      to: email,
      subject: "Reset Your Password",
      templateName: "password-reset",
      context: {
        resetUrl,
        expiryHours: 24,
      },
    });
  }
}
```

#### 4. Redis Configuration (`src/config/redis.ts`)

```typescript
import { Redis } from "ioredis";
import { env } from "./env";

// Redis configuration for BullMQ
export const redisConnection = {
  host: env("REDIS_HOST", "localhost"),
  port: Number(env("REDIS_PORT", "6379")),
  password: env("REDIS_PASSWORD", ""),
  db: Number(env("REDIS_DB", "0")),
  maxRetriesPerRequest: null, // BullMQ recommendation
  enableReadyCheck: false, // BullMQ recommendation
  maxmemoryPolicy: "noeviction", // BullMQ recommendation
};

// Regular Redis client (if needed for other operations)
export const redis = new Redis({
  host: env("REDIS_HOST", "localhost"),
  port: Number(env("REDIS_PORT", "6379")),
  password: env("REDIS_PASSWORD", ""),
  db: Number(env("REDIS_DB", "0")),
});

// Redis events
redis.on("connect", () => {
  console.log("✅ Connected to Redis server!");
});

redis.on("error", (err) => {
  console.error("🔴 Redis connection error:", err.message);
});
```

#### 5. Main Application Integration (`src/index.ts`)

```typescript
// Other imports...
import "./jobs/email-processor"; // This starts the email worker

const app = new Hono();

// Your app configuration...

// Example: Booking endpoint that queues emails
app.post("/bookings", async (c) => {
  try {
    // Process booking logic...

    // Queue confirmation emails (non-blocking)
    await queueBookingEmails(guestEmail, hotelEmail);

    // Return immediately to user
    return c.json({ success: true, booking: bookingData });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;
```

---

## Configuration & Setup

### Environment Variables

```bash
# SMTP Configuration (Required)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Redis Configuration (Required)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Application Configuration
FRONTEND_URL=https://your-app.com
NODE_ENV=development
```

### Dependencies Installation

```bash
npm install bullmq ioredis nodemailer handlebars
npm install --save-dev @types/nodemailer @types/node
```

### Queue Configuration Options

```typescript
// Adjustable settings in email-queue.ts
defaultJobOptions: {
  removeOnComplete: 100,        // Keep last N completed jobs
  removeOnFail: 50,            // Keep last N failed jobs
  attempts: 3,                 // Maximum retry attempts
  backoff: {
    type: "exponential",       // exponential | fixed
    delay: 5000,              // Initial delay in milliseconds
  },
  delay: 0,                   // Initial job delay
  priority: 0,                // Job priority (higher = more priority)
}
```

### Worker Configuration Options

```typescript
// Worker settings in email-processor.ts
{
  connection: redisConnection,
  concurrency: 5,              // Number of jobs processed simultaneously
  limiter: {
    max: 100,                 // Max jobs per duration
    duration: 60000,          // Duration in milliseconds
  },
  settings: {
    stalledInterval: 30000,   // Check for stalled jobs every 30s
    maxStalledCount: 1,       // Max times a job can be stalled
  }
}
```

---

## Usage Examples & API

### 1. Basic Email Queueing

```typescript
import { queueTemplateEmail } from "../jobs/email-queue";

// Queue a template email (recommended for performance)
await queueTemplateEmail({
  to: "user@example.com",
  subject: "Welcome to Our App!",
  templateName: "welcome",
  context: {
    firstName: "John",
    loginUrl: "https://app.com/login",
  },
});
```

### 2. Booking Confirmation Emails

```typescript
import { queueBookingEmails } from "../jobs/email-queue";

// Queue both guest and hotel emails
const guestEmail = {
  to: "guest@example.com",
  subject: "Booking Confirmation",
  templateName: "guestBooking",
  context: {
    hotelName: "Grand Hotel",
    customerName: "John Doe",
    bookingAmount: 25000,
    numberOfRooms: 2,
    roomCategory: "DELUXE",
    bookingReference: "BK-2024-001",
    checkIn: "2024-07-15",
    checkOut: "2024-07-20",
  },
};

const hotelEmail = {
  to: "hotel@example.com",
  subject: "New Booking Received",
  templateName: "hotelBooking",
  context: {
    ...guestEmail.context,
    guestEmail: "guest@example.com",
  },
};

await queueBookingEmails(guestEmail, hotelEmail);
```

### 3. Immediate Email Sending

```typescript
import { EmailService } from "../services/EmailService";

const emailService = new EmailService();

// Send immediately (blocking operation)
await emailService.sendTemplateEmail({
  to: "user@example.com",
  subject: "Urgent Notification",
  templateName: "urgent",
  context: { message: "Important update" },
});
```

### 4. Integration in Business Logic

```typescript
// In BookingService.ts
export class BookingService {
  async createBooking(bookingData: any) {
    try {
      // 1. Process booking logic
      const booking = await this.processBooking(bookingData);

      // 2. Queue confirmation emails (non-blocking)
      await this.queueBookingNotifications(booking);

      // 3. Return immediately
      return booking;
    } catch (error) {
      throw error;
    }
  }

  private async queueBookingNotifications(booking: any) {
    const guestEmail = {
      to: booking.customerEmail,
      subject: "Booking Confirmation",
      templateName: "guestBooking",
      context: {
        customerName: booking.customerName,
        hotelName: booking.hotelName,
        // ... other booking details
      },
    };

    await queueBookingEmails(guestEmail);
  }
}
```

---

## Template System

### Template Directory Structure

```
src/templates/emails/
├── welcome.hbs              # New user welcome
├── guestBooking.hbs         # Guest booking confirmation
├── hotelBooking.hbs         # Hotel booking notification
├── password-reset.hbs       # Password reset instructions
├── payment-confirmation.hbs # Payment confirmations
└── newsletter.hbs           # Newsletter template
```

### Template Structure

```handlebars
<html>
  <head>
    <meta charset="UTF-8" />
    <title>{{subject}}</title>
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333;
      max-width: 600px; margin: 0 auto; } .header { background-color: #f8f9fa;
      padding: 20px; text-align: center; } .content { padding: 20px; } .footer {
      background-color: #f8f9fa; padding: 15px; text-align: center; font-size:
      12px; color: #666; } .button { display: inline-block; padding: 10px 20px;
      background-color: #007bff; color: white; text-decoration: none;
      border-radius: 5px; }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>Your App Name</h1>
    </div>

    <div class="content">
      <h2>Hello {{customerName}}!</h2>

      <p>Your booking has been confirmed. Here are the details:</p>

      <ul>
        <li><strong>Hotel:</strong> {{hotelName}}</li>
        <li><strong>Reference:</strong> {{bookingReference}}</li>
        <li><strong>Check-in:</strong> {{checkIn}}</li>
        <li><strong>Check-out:</strong> {{checkOut}}</li>
        <li><strong>Rooms:</strong> {{numberOfRooms}}</li>
        <li><strong>Total Amount:</strong> ₦{{bookingAmount}}</li>
      </ul>

      {{#if actionUrl}}
        <p>
          <a href="{{actionUrl}}" class="button">View Booking</a>
        </p>
      {{/if}}
    </div>

    <div class="footer">
      <p>© {{year}} Your App Name. All rights reserved.</p>
      <p>Need help? Contact us at support@yourapp.com</p>
    </div>
  </body>
</html>
```

### Available Template Variables

#### Common Variables (automatically added)

```handlebars
{{year}}
<!-- Current year -->
{{subject}}
<!-- Email subject -->
```

#### Booking Templates

```handlebars
{{hotelName}}
<!-- Hotel name -->
{{customerName}}
<!-- Customer full name -->
{{bookingAmount}}
<!-- Total booking amount -->
{{numberOfRooms}}
<!-- Number of rooms -->
{{roomCategory}}
<!-- Room category -->
{{bookingReference}}
<!-- Booking reference code -->
{{checkIn}}
<!-- Check-in date -->
{{checkOut}}
<!-- Check-out date -->
{{guestEmail}}
<!-- Guest email (for hotel notifications) -->
```

#### Authentication Templates

```handlebars
{{firstName}}
<!-- User's first name -->
{{loginUrl}}
<!-- Login page URL -->
{{resetUrl}}
<!-- Password reset URL -->
{{expiryHours}}
<!-- Token expiry hours -->
```

### Creating New Templates

1. **Create Template File**

```bash
touch src/templates/emails/new-template.hbs
```

2. **Define Template Structure**

```handlebars
<html>
  <head>
    <meta charset="UTF-8" />
    <title>{{subject}}</title>
  </head>
  <body>
    <h1>{{title}}</h1>
    <p>{{message}}</p>
    <p>© {{year}} Your App</p>
  </body>
</html>
```

3. **Use Template**

```typescript
await queueTemplateEmail({
  to: "user@example.com",
  subject: "Custom Notification",
  templateName: "new-template",
  context: {
    title: "Important Update",
    message: "Your account has been updated.",
  },
});
```

---

## Error Handling & Monitoring

### Retry Logic Configuration

```typescript
// Exponential backoff retry schedule
attempts: 3,
backoff: {
  type: "exponential",
  delay: 5000,
}

// Retry schedule:
// Attempt 1: Immediate
// Attempt 2: 5 seconds delay
// Attempt 3: 25 seconds delay (5 * 5)
// Failed: Moved to failed queue
```

### Worker Event Monitoring

```typescript
// Success events
emailWorker.on("completed", (job) => {
  console.log(`✅ Email job ${job.id} completed`);
  // Optional: Log to external monitoring service
});

// Failure events
emailWorker.on("failed", (job, err) => {
  console.error(`❌ Email job ${job?.id} failed:`, err.message);
  // Optional: Alert monitoring service
});

// Progress events
emailWorker.on("progress", (job, progress) => {
  console.log(`📧 Job ${job.id} progress: ${progress}%`);
});

// Stalled events
emailWorker.on("stalled", (jobId) => {
  console.warn(`⚠️ Job ${jobId} stalled`);
});
```

### Queue Monitoring Functions

```typescript
import { emailQueue } from "../jobs/email-queue";

// Get queue statistics
export async function getQueueStats() {
  const waiting = await emailQueue.getWaiting();
  const active = await emailQueue.getActive();
  const completed = await emailQueue.getCompleted();
  const failed = await emailQueue.getFailed();

  return {
    waiting: waiting.length,
    active: active.length,
    completed: completed.length,
    failed: failed.length,
    total: waiting.length + active.length,
  };
}

// Get specific job details
export async function getJobDetails(jobId: string) {
  const job = await emailQueue.getJob(jobId);

  if (!job) return null;

  return {
    id: job.id,
    data: job.data,
    progress: job.progress,
    attemptsMade: job.attemptsMade,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
    failedReason: job.failedReason,
  };
}

// Clean up old jobs
export async function cleanupJobs() {
  await emailQueue.clean(24 * 60 * 60 * 1000, 100, "completed"); // Keep completed jobs for 24h
  await emailQueue.clean(7 * 24 * 60 * 60 * 1000, 50, "failed"); // Keep failed jobs for 7 days
}
```

### Error Types & Handling

```typescript
// Common error scenarios
try {
  await emailService.sendTemplateEmail(options);
} catch (error) {
  if (error.message.includes("ENOENT")) {
    // Template file not found
    console.error("Template not found:", options.templateName);
  } else if (error.message.includes("Authentication failed")) {
    // SMTP authentication issue
    console.error("SMTP auth failed - check credentials");
  } else if (error.message.includes("Invalid recipients")) {
    // Invalid email address
    console.error("Invalid email address:", options.to);
  } else {
    // Unknown error
    console.error("Email sending failed:", error.message);
  }

  throw error; // Re-throw to trigger retry
}
```

---

## Performance & Scalability

### Concurrency Settings

```typescript
// Worker concurrency (adjust based on SMTP limits)
{
  concurrency: 5,  // Start with 5, increase if SMTP can handle more
}

// SMTP connection pooling
{
  pool: true,
  maxConnections: 5,    // Max concurrent SMTP connections
  maxMessages: 100,     // Max messages per connection
}
```

### Queue Optimization

```typescript
// Job cleanup settings
{
  removeOnComplete: 100,  // Keep successful jobs for monitoring
  removeOnFail: 50,       // Keep failed jobs for debugging
}

// Rate limiting (if needed)
{
  limiter: {
    max: 100,             // Max 100 emails
    duration: 60000,      // Per minute
  }
}
```

### Performance Monitoring

```typescript
// Monitor queue performance
setInterval(async () => {
  const stats = await getQueueStats();

  if (stats.waiting > 1000) {
    console.warn("⚠️ High queue load - consider scaling");
  }

  if (stats.failed > stats.completed * 0.1) {
    console.warn("⚠️ High failure rate detected");
  }
}, 60000); // Check every minute
```

### Scaling Strategies

1. **Increase Worker Concurrency**: Adjust based on SMTP provider limits
2. **Multiple Worker Instances**: Deploy workers across multiple servers
3. **Queue Partitioning**: Use multiple queues for different email types
4. **Connection Pooling**: Optimize SMTP connection reuse
5. **Template Caching**: Cache compiled templates in memory

---

## Security & Best Practices

### Email Validation

```typescript
// Validate email addresses before queueing
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export const queueTemplateEmail = async (data: TemplateEmailJob) => {
  if (!isValidEmail(data.to)) {
    throw new Error(`Invalid email address: ${data.to}`);
  }

  await emailQueue.add("sendTemplateEmail", data);
};
```

### Context Data Sanitization

```typescript
// Sanitize template context
function sanitizeContext(context: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(context)) {
    if (typeof value === "string") {
      // Remove HTML tags and escape special characters
      sanitized[key] = value.replace(/<[^>]*>/g, "").trim();
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
```

### Rate Limiting Implementation

```typescript
// Per-user rate limiting
const userEmailCounts = new Map<string, number>();

export const queueTemplateEmailWithRateLimit = async (
  data: TemplateEmailJob,
  userId?: string
) => {
  if (userId) {
    const count = userEmailCounts.get(userId) || 0;
    if (count >= 10) {
      // Max 10 emails per user per hour
      throw new Error("Email rate limit exceeded");
    }
    userEmailCounts.set(userId, count + 1);
  }

  await queueTemplateEmail(data);
};

// Reset rate limits every hour
setInterval(() => {
  userEmailCounts.clear();
}, 60 * 60 * 1000);
```

### SMTP Security

```typescript
// Secure SMTP configuration
{
  host: env("SMTP_HOST"),
  port: 465,                    // Use secure port
  secure: true,                 // Enable TLS
  auth: {
    user: env("SMTP_USER"),
    pass: env("SMTP_PASSWORD"), // Use app-specific password
  },
  tls: {
    rejectUnauthorized: false,  // For development only
    ciphers: 'SSLv3'           // For some providers
  }
}
```

### Template Security

```typescript
// Safe Handlebars helpers
Handlebars.registerHelper("safe", function (value) {
  return new Handlebars.SafeString(value);
});

// Escape HTML by default
Handlebars.registerHelper("escape", function (value) {
  return Handlebars.Utils.escapeExpression(value);
});
```

---

## Testing & Debugging

### Test Script Implementation

```javascript
#!/usr/bin/env node
/**
 * Email Queue Test Script
 * Tests queue performance and email sending
 */

const { queueTemplateEmail, emailQueue } = require("./dist/jobs/email-queue");

async function testEmailQueue() {
  console.log("🧪 Testing Email Queue Performance...\n");

  const startTime = Date.now();
  const testEmails = [];

  // Queue multiple test emails
  for (let i = 1; i <= 10; i++) {
    testEmails.push(
      queueTemplateEmail({
        to: `test${i}@example.com`,
        subject: `Test Email ${i}`,
        templateName: "welcome",
        context: {
          firstName: `User${i}`,
          loginUrl: "https://app.com/login",
        },
      })
    );
  }

  await Promise.all(testEmails);
  const queueTime = Date.now() - startTime;

  console.log(`✅ Queued 10 emails in ${queueTime}ms`);

  // Monitor queue processing
  let processed = 0;
  const checkInterval = setInterval(async () => {
    const stats = await getQueueStats();
    console.log(
      `📊 Queue: ${stats.waiting} waiting, ${stats.active} active, ${stats.completed} completed`
    );

    if (stats.completed >= 10) {
      clearInterval(checkInterval);
      console.log("🎉 All emails processed successfully!");
      process.exit(0);
    }
  }, 1000);

  // Timeout after 30 seconds
  setTimeout(() => {
    clearInterval(checkInterval);
    console.log("⏰ Test timeout - some emails may still be processing");
    process.exit(1);
  }, 30000);
}

async function getQueueStats() {
  const waiting = await emailQueue.getWaiting();
  const active = await emailQueue.getActive();
  const completed = await emailQueue.getCompleted();

  return {
    waiting: waiting.length,
    active: active.length,
    completed: completed.length,
  };
}

testEmailQueue().catch(console.error);
```

### Debug Mode Configuration

```typescript
// Enable debug logging
process.env.DEBUG = "bull*";

// Add detailed logging to worker
const emailWorker = new Worker("emailQueue", processJob, {
  connection: redisConnection,
  concurrency: 1, // Reduce concurrency for debugging
});

// Log all events
emailWorker.on("ready", () => console.log("🟢 Worker ready"));
emailWorker.on("error", (err) => console.error("🔴 Worker error:", err));
emailWorker.on("waiting", (job) => console.log("⏳ Job waiting:", job.id));
emailWorker.on("active", (job) => console.log("🏃 Job active:", job.id));
emailWorker.on("completed", (job) => console.log("✅ Job completed:", job.id));
emailWorker.on("failed", (job, err) =>
  console.error("❌ Job failed:", job.id, err)
);
```

### Manual Testing Commands

```bash
# Start Redis (if not running)
redis-server

# Run the application
npm run dev

# Test email queueing (in another terminal)
node test-email-queue.js

# Monitor Redis queue
redis-cli
> KEYS *
> LLEN bull:emailQueue:waiting
> LLEN bull:emailQueue:active
> LLEN bull:emailQueue:completed
> LLEN bull:emailQueue:failed
```

---

## Troubleshooting Guide

### Common Issues & Solutions

#### 1. Template Not Found

**Error**: `ENOENT: no such file or directory 'src/templates/emails/templateName.hbs'`
**Solutions**:

- Check template file exists in correct directory
- Verify template name spelling
- Ensure template has `.hbs` extension
- Check file permissions

#### 2. SMTP Authentication Failed

**Error**: `Invalid login: 535-5.7.8 Username and Password not accepted`
**Solutions**:

- Use app-specific password for Gmail
- Enable "Less secure app access" (not recommended)
- Check SMTP credentials in environment variables
- Verify SMTP host and port settings

#### 3. Redis Connection Failed

**Error**: `connect ECONNREFUSED 127.0.0.1:6379`
**Solutions**:

- Ensure Redis server is running: `redis-server`
- Check Redis host and port in configuration
- Verify Redis authentication if enabled
- Check firewall/network connectivity

#### 4. Worker Not Processing Jobs

**Symptoms**: Jobs queue but don't get processed
**Solutions**:

- Check if email worker is imported in main app
- Verify Redis connection in worker
- Check worker concurrency settings
- Look for worker error logs

#### 5. High Memory Usage

**Symptoms**: Application memory keeps growing
**Solutions**:

- Implement proper job cleanup
- Reduce `removeOnComplete` and `removeOnFail` values
- Monitor for memory leaks in templates
- Consider worker process recycling

#### 6. Template Compilation Errors

**Error**: `Parse error on line X: Unexpected token`
**Solutions**:

- Check Handlebars syntax in template
- Verify all opening tags have closing tags
- Check for special characters in template
- Test template compilation separately

### Debugging Tools

#### Queue Inspector

```typescript
// Create queue monitoring endpoint
app.get("/admin/queue/stats", async (c) => {
  const stats = await getQueueStats();
  return c.json(stats);
});

app.get("/admin/queue/jobs/:status", async (c) => {
  const status = c.req.param("status");
  let jobs;

  switch (status) {
    case "waiting":
      jobs = await emailQueue.getWaiting();
      break;
    case "active":
      jobs = await emailQueue.getActive();
      break;
    case "completed":
      jobs = await emailQueue.getCompleted();
      break;
    case "failed":
      jobs = await emailQueue.getFailed();
      break;
    default:
      return c.json({ error: "Invalid status" }, 400);
  }

  return c.json(
    jobs.map((job) => ({
      id: job.id,
      data: job.data,
      progress: job.progress,
      attemptsMade: job.attemptsMade,
    }))
  );
});
```

#### Email Testing Endpoint

```typescript
app.post("/admin/test-email", async (c) => {
  const { to, templateName, context } = await c.req.json();

  try {
    await queueTemplateEmail({
      to,
      subject: "Test Email",
      templateName,
      context,
    });

    return c.json({ success: true, message: "Email queued successfully" });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});
```

### Performance Diagnostics

```typescript
// Monitor queue performance
async function monitorQueuePerformance() {
  const stats = await getQueueStats();
  const queueLength = stats.waiting + stats.active;

  if (queueLength > 1000) {
    console.warn("⚠️ Queue backlog detected:", queueLength);
  }

  if (stats.failed > stats.completed * 0.1) {
    console.warn(
      "⚠️ High failure rate:",
      ((stats.failed / (stats.completed + stats.failed)) * 100).toFixed(2) + "%"
    );
  }
}

setInterval(monitorQueuePerformance, 60000);
```

---

## Implementation Checklist

### Phase 1: Basic Setup

- [ ] Install dependencies (`bullmq`, `ioredis`, `nodemailer`, `handlebars`)
- [ ] Configure environment variables (SMTP, Redis)
- [ ] Create Redis connection configuration
- [ ] Set up basic email service with SMTP transport

### Phase 2: Queue Implementation

- [ ] Create email queue with BullMQ configuration
- [ ] Define job interfaces (`TemplateEmailJob`, `SimpleEmailJob`)
- [ ] Implement queue functions (`queueTemplateEmail`, `queueSimpleEmail`)
- [ ] Create email worker with job processing logic
- [ ] Add worker event handling (completed, failed, error)

### Phase 3: Template System

- [ ] Create templates directory structure
- [ ] Implement basic email templates (welcome, password-reset)
- [ ] Add template compilation logic in EmailService
- [ ] Test template rendering with sample data
- [ ] Add automatic year injection to template context

### Phase 4: Integration

- [ ] Import email worker in main application
- [ ] Replace synchronous email calls with queue functions
- [ ] Implement booking confirmation email flow
- [ ] Add error handling and logging
- [ ] Test end-to-end email flow

### Phase 5: Monitoring & Optimization

- [ ] Add queue monitoring functions
- [ ] Implement job cleanup policies
- [ ] Add performance monitoring
- [ ] Create debug/testing endpoints
- [ ] Optimize worker concurrency settings

### Phase 6: Production Readiness

- [ ] Implement rate limiting
- [ ] Add email validation and sanitization
- [ ] Set up proper error alerting
- [ ] Create deployment documentation
- [ ] Add health check endpoints
- [ ] Configure production SMTP settings

### Phase 7: Testing & Documentation

- [ ] Create comprehensive test scripts
- [ ] Write API documentation
- [ ] Add troubleshooting guides
- [ ] Set up monitoring dashboards
- [ ] Conduct load testing
- [ ] Document deployment procedures

---

## AI Coding Assistant Instructions

When implementing this email queue system in a new project, follow these guidelines:

### 1. Project Analysis

- Identify existing email sending patterns in the codebase
- Locate SMTP configuration and credentials
- Determine Redis availability or need for setup
- Assess current template system (if any)

### 2. Implementation Order

- Start with Redis configuration and basic queue setup
- Implement EmailService with template support
- Create email worker and job processing
- Replace existing email calls with queue functions
- Add monitoring and error handling

### 3. Testing Strategy

- Create test templates before implementing queue
- Test SMTP connection before queue integration
- Verify Redis connectivity and job persistence
- Test retry logic with intentional failures
- Monitor queue performance under load

### 4. Migration Approach

- Keep existing email system during transition
- Implement queue alongside current system
- Gradually migrate email types to queue
- Monitor performance and error rates
- Fully switch after validation

### 5. Customization Points

- Adjust retry policies based on email criticality
- Customize template structure for brand requirements
- Configure worker concurrency based on SMTP limits
- Implement specific rate limiting rules
- Add custom monitoring and alerting

This comprehensive guide provides everything needed to implement a robust, scalable email queue system in any Node.js/TypeScript application. The modular design allows for easy customization and extension based on specific project requirements.
