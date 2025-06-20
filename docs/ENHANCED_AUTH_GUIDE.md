# Enhanced Authentication & Session Management Guide

## Overview

Your authentication system has been enhanced with comprehensive session management features. Users can now view all their active sessions, see which session they're currently using, and manage their sessions with fine-grained control.

## New Features

### 1. **View All Sessions**

- **Endpoint**: `GET /api/auth/sessions`
- **Authentication**: Required (Bearer token)
- **Description**: Returns all active sessions for the authenticated user
- **Response**:

```json
{
  "success": true,
  "message": "Sessions retrieved successfully",
  "data": {
    "sessions": [
      {
        "sessionId": "uuid-here",
        "userId": "user-id",
        "email": "user@example.com",
        "loginTime": 1640995200000,
        "lastActivity": 1640995800000,
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "isCurrent": true
      }
    ]
  }
}
```

### 2. **Get Current Session**

- **Endpoint**: `GET /api/auth/sessions/current`
- **Authentication**: Required (Bearer token)
- **Description**: Returns details about the current session
- **Response**: Single session object with `isCurrent: true`

### 3. **Revoke Specific Session**

- **Endpoint**: `DELETE /api/auth/sessions/revoke`
- **Authentication**: Required (Bearer token)
- **Body**:

```json
{
  "sessionId": "session-uuid-to-revoke"
}
```

- **Description**: Revokes a specific session (can be used to log out from a specific device)

### 4. **Revoke All Other Sessions**

- **Endpoint**: `DELETE /api/auth/sessions/revoke-others`
- **Authentication**: Required (Bearer token)
- **Description**: Revokes all sessions except the current one (useful for "Log out from all other devices")
- **Response**:

```json
{
  "success": true,
  "message": "Successfully revoked 3 other session(s)",
  "data": {
    "revokedCount": 3
  }
}
```

## Technical Implementation

### Session Storage Architecture

1. **Individual Sessions**: Stored as `session:{sessionId}` in Redis
2. **User Session Lists**: Stored as `user_sessions:{userId}` (Redis Set) for quick retrieval
3. **Automatic Cleanup**: Stale session references are automatically removed during queries

### Session Data Structure

Each session contains:

- `sessionId`: Unique identifier
- `userId`: User ID
- `email`: User email
- `loginTime`: When the session was created
- `lastActivity`: Last time the session was used
- `ipAddress`: IP address of the login (if available)
- `userAgent`: Browser/device information (if available)

### Security Features

- **Rate Limiting**: All auth endpoints have strict rate limiting
- **Session Tracking**: Track login location and device information
- **Automatic Cleanup**: Invalid sessions are automatically cleaned up
- **JWT + Redis**: Combines JWT tokens with Redis session storage for security and performance

## Usage Examples

### Frontend Integration

```javascript
// Get all user sessions
const response = await fetch("/api/auth/sessions", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
const { data } = await response.json();
console.log("All sessions:", data.sessions);

// Revoke a specific session
await fetch("/api/auth/sessions/revoke", {
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    sessionId: "session-to-revoke",
  }),
});

// Log out from all other devices
await fetch("/api/auth/sessions/revoke-others", {
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

### Mobile App Integration

```javascript
// Show active sessions in settings
const sessions = await getActiveSessions();
sessions.forEach((session) => {
  console.log(
    `${session.isCurrent ? "(Current)" : ""} ${session.userAgent} - ${new Date(
      session.loginTime
    ).toLocaleDateString()}`
  );
});
```

## Database Changes

### Redis Schema Updates

1. **Enhanced Session Storage**:

   - `session:{sessionId}` - Individual session data
   - `user_sessions:{userId}` - Set of session IDs for each user

2. **New Methods Added to RedisManager**:
   - `sadd()` - Add to set
   - `smembers()` - Get set members
   - `srem()` - Remove from set
   - `expire()` - Set expiration

## Security Considerations

1. **Session Validation**: All operations validate that users can only manage their own sessions
2. **Current Session Protection**: Users cannot accidentally revoke their current session when using "revoke others"
3. **Automatic Cleanup**: Expired sessions are automatically cleaned up
4. **Audit Trail**: All session operations are logged for security monitoring

## Error Handling

All endpoints return consistent error responses:

- `401`: Authentication required or invalid token
- `400`: Bad request (missing required fields)
- `404`: Session not found
- `500`: Internal server error

## Rate Limiting

Session management endpoints use the same strict rate limiting as other auth endpoints:

- 10 requests per 5 minutes for auth operations
- Enhanced limits for authenticated users vs IP-based limits

This enhanced authentication system provides enterprise-grade session management while maintaining security and usability.
