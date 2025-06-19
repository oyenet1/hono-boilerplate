# User-Friendly Error Messages Guide

This guide documents the user-friendly error messages implemented throughout the application.

## Overview

All error messages have been updated to be clear, actionable, and user-friendly. They avoid technical jargon and provide guidance on what users should do next.

## HTTP Status Codes and Messages

### 400 - Bad Request

- **Message**: "Invalid request. Please check your data and try again"
- **When**: Malformed requests, invalid data format
- **User Action**: Check the request data and correct any errors

### 401 - Unauthorized

- **Message**: "Invalid token: Authentication required"
- **When**: User is not authenticated
- **User Action**: Login with valid credentials

### 403 - Forbidden

- **Message**: "Permission denied. You don't have access to this resource"
- **When**: User lacks permission for the resource
- **User Action**: Contact administrator or use a different account

### 404 - Not Found

- **Message**: "The requested resource was not found"
- **When**: Resource doesn't exist
- **User Action**: Check the URL or resource identifier

### 409 - Conflict

- **Message**: "This resource already exists. Please use different values"
- **When**: Duplicate data (email, username, etc.)
- **User Action**: Use different unique values

### 422 - Validation Error

- **Message**: "Validation failed. Please check your input"
- **When**: Input validation fails
- **User Action**: Review the specific field errors and correct them

### 500 - Internal Server Error

- **Production**: "Something went wrong. Please try again later"
- **Development**: Actual error message for debugging
- **User Action**: Try again, contact support if persists

### 503 - Service Unavailable

- **Message**: "Our services are temporarily unavailable. Please try again in a few moments"
- **When**: External services (Redis, database) are down
- **User Action**: Wait and try again

## Error Response Format

All errors follow a consistent format:

```json
{
  "success": false,
  "message": "User-friendly error message",
  "errors": ["Specific field errors"] // Only for validation errors
}
```

## Validation Error Messages

### Request Body Validation

- **Message**: "Please check your request data and try again"
- **Context**: Invalid JSON body, missing required fields

### Query Parameter Validation

- **Message**: "Please check your query parameters and try again"
- **Context**: Invalid URL query parameters

### URL Parameter Validation

- **Message**: "Please check your URL parameters and try again"
- **Context**: Invalid path parameters (like user ID)

## Authentication Error Messages

### Session Expired

- **Message**: "Your session has expired. Please login again"
- **When**: JWT token has expired
- **User Action**: Login again to get a new token

### Invalid Token

- **Message**: "Invalid authentication token. Please login again"
- **When**: JWT token is malformed or invalid
- **User Action**: Login again

### Authentication Failed

- **Message**: "Authentication failed. Please login to continue"
- **When**: General authentication errors
- **User Action**: Provide valid credentials

## Database Error Messages

### Unique Constraint Violation

- **Message**: "This resource already exists. Please use different values"
- **When**: Duplicate email, username, etc.
- **User Action**: Use unique values

### Foreign Key Violation

- **Message**: "The referenced resource does not exist. Please check your data"
- **When**: Referencing non-existent related data
- **User Action**: Use valid reference IDs

### Check Constraint Violation

- **Message**: "The provided data is invalid. Please check the requirements"
- **When**: Data violates database constraints
- **User Action**: Review data requirements

### Generic Database Error

- **Production**: "We're having trouble saving your data. Please try again later"
- **Development**: Actual database error
- **User Action**: Try again, contact support if persists

## Redis Error Messages

### Connection Error

- **Message**: "Our services are temporarily unavailable. Please try again in a few moments"
- **When**: Redis connection issues
- **User Action**: Wait and retry

### Generic Redis Error

- **Production**: "We're experiencing technical difficulties. Please try again later"
- **Development**: Actual Redis error
- **User Action**: Try again later

## Implementation Details

### ResponseHelper Methods

- `success()` - Success responses with data
- `error()` - Generic error responses
- `unauthorized()` - 401 authentication errors
- `forbidden()` - 403 permission errors
- `notFound()` - 404 resource not found
- `badRequest()` - 400 bad request errors
- `validationError()` - 422 validation errors
- `sessionExpired()` - Session expired errors
- `created()` - 201 resource created
- `paginated()` - Paginated data responses

### Custom Error Classes

- `ValidationError` - For validation failures
- `NotFoundError` - For missing resources
- `UnauthorizedError` - For authentication failures
- `ForbiddenError` - For permission denials
- `SessionExpiredError` - For expired sessions
- `ConflictError` - For duplicate resources
- `BadRequestError` - For malformed requests

### Error Handlers

- `errorHandler` - Global middleware for catching all errors
- `handleDatabaseError` - Specific database error handling
- `handleRedisError` - Redis connection error handling
- `handleJWTError` - JWT authentication error handling

## Best Practices

1. **Always be helpful**: Tell users what went wrong and what they can do about it
2. **Avoid technical terms**: Use plain language that non-technical users understand
3. **Be specific**: Provide actionable guidance when possible
4. **Maintain security**: Don't expose sensitive system information in production
5. **Be consistent**: Use the same format and tone across all error messages
6. **Provide context**: Include relevant details about what the user was trying to do

## Example Usage

```typescript
// In controllers
throw new UnauthorizedError("Please login to access your profile");
throw new NotFoundError("User");
throw new ValidationError("Please check your input", ["Email is required"]);

// Using ResponseHelper
return ResponseHelper.unauthorized(c, "Please login to continue");
return ResponseHelper.validationError(c, "Invalid data", errors);
```

This approach ensures that all error messages throughout the application are consistent, user-friendly, and actionable.
