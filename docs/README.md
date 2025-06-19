# Documentation Index

This directory contains comprehensive documentation for the Hono MVC Boilerplate project.

## 📖 **Table of Contents**

### **Architecture & Setup**
- [**Database Guide**](./DATABASE_GUIDE.md) - PostgreSQL, Drizzle ORM, migrations, and database setup
- [**Drizzle Setup Complete**](./DRIZZLE_SETUP_COMPLETE.md) - Complete Drizzle ORM configuration details
- [**Dependency Injection Guide**](./DI_GUIDE.md) - Inversify container setup and usage patterns

### **Security & Authentication**
- [**Security Guide**](./SECURITY_GUIDE.md) - CORS, headers, rate limiting, and security best practices
- [**Token Extractor Guide**](./TOKEN_EXTRACTOR_GUIDE.md) - JWT token extraction utilities and patterns

### **Error Handling & Validation**
- [**Error Handlers Guide**](./ERROR_HANDLERS_GUIDE.md) - Global error handling and custom error classes
- [**User-Friendly Errors Guide**](./USER_FRIENDLY_ERRORS_GUIDE.md) - Comprehensive error messages for better UX
- [**Validator Guide**](./VALIDATOR_GUIDE.md) - Zod validation, custom validators, and error formatting

### **Testing & Monitoring**
- [**Test Guide**](./TEST_GUIDE.md) - Testing strategies, setup, and best practices
- [**Console Logging Summary**](./CONSOLE_LOGGING_SUMMARY.md) - Logging patterns and health monitoring

## 🚀 **Quick Start**

For getting started quickly, read these guides in order:

1. **[Database Guide](./DATABASE_GUIDE.md)** - Set up your database
2. **[Dependency Injection Guide](./DI_GUIDE.md)** - Understand the DI container
3. **[Security Guide](./SECURITY_GUIDE.md)** - Configure security features
4. **[Error Handlers Guide](./ERROR_HANDLERS_GUIDE.md)** - Implement proper error handling
5. **[Test Guide](./TEST_GUIDE.md)** - Write and run tests

## 📋 **Feature Overview**

This boilerplate includes:

- ✅ **PostgreSQL** with Drizzle ORM
- ✅ **JWT Authentication** with secure session management
- ✅ **Redis** for caching and sessions
- ✅ **Rate Limiting** with Redis backend
- ✅ **Dependency Injection** with Inversify
- ✅ **Comprehensive Error Handling** with user-friendly messages
- ✅ **Input Validation** with Zod schemas
- ✅ **Security Headers** and CORS configuration
- ✅ **Health Monitoring** with database and Redis checks
- ✅ **Comprehensive Testing** with Bun test runner
- ✅ **Clean Architecture** with MVC pattern

## 🔗 **Related Files**

- **Main README**: [`../README.md`](../README.md) - Project overview and quick setup
- **Environment Config**: [`../.env.example`](../.env.example) - Environment variables reference
- **Package Config**: [`../package.json`](../package.json) - Dependencies and scripts
- **TypeScript Config**: [`../tsconfig.json`](../tsconfig.json) - TypeScript configuration

## 🤝 **Contributing**

When adding new features:

1. **Update relevant documentation** in this folder
2. **Add tests** following the [Test Guide](./TEST_GUIDE.md)
3. **Follow security practices** outlined in [Security Guide](./SECURITY_GUIDE.md)
4. **Use proper error handling** as described in [Error Handlers Guide](./ERROR_HANDLERS_GUIDE.md)

## 📝 **Documentation Standards**

All documentation in this folder follows these standards:

- **Clear section headers** with emoji indicators
- **Code examples** with syntax highlighting
- **Step-by-step instructions** for complex procedures
- **Cross-references** to related documentation
- **Troubleshooting sections** for common issues
- **Best practices** and recommendations

## 🔍 **Search & Navigation**

Use your IDE's search functionality to quickly find information across all documentation files. Each guide is self-contained but references related concepts when appropriate.
