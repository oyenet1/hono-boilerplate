# NAT and Rate Limiting Guide

## 🌐 **The NAT Problem**

### **What is NAT?**

Network Address Translation (NAT) allows multiple devices to share a single public IP address. This is common in:

- **Corporate networks** (200+ employees, same IP)
- **University campuses** (thousands of students, same IP)
- **Public WiFi** (coffee shops, airports, hotels)
- **Home networks** (family devices)
- **Mobile carriers** (carrier-grade NAT)

### **Impact on Rate Limiting**

Without proper handling, NAT can cause:

- ❌ **False blocks**: Innocent users blocked due to others' activity
- ❌ **Denial of service**: Entire organizations unable to access your app
- ❌ **Poor user experience**: Legitimate users hitting limits

## 🛡️ **Our NAT-Aware Solution**

### **Multi-Layer Rate Limiting Strategy**

#### **1. Authenticated Users (Best)**

```typescript
// Uses user ID for precise limiting
identifier = `user:${userId}`;
```

- ✅ **Most accurate**: Each user gets their own limit
- ✅ **NAT-proof**: Works regardless of shared IP
- ✅ **Fair**: No interference between users

#### **2. Anonymous Users (IP + User Agent)**

```typescript
// Combines IP with browser fingerprint
const browserFingerprint = Buffer.from(userAgent)
  .toString("base64")
  .substring(0, 16);
identifier = `ip:${ipAddress}:ua:${browserFingerprint}`;
```

- ✅ **Better than IP-only**: Different browsers get separate limits
- ✅ **Reduces false positives**: Chrome vs Firefox vs Safari treated separately
- ✅ **Maintains security**: Still blocks obvious abuse

#### **3. Increased Limits for Shared Networks**

```typescript
// 50% higher limits for unauthenticated users
rateLimitMax = Math.floor(rateLimitConfig.max * 1.5);
```

### **Rate Limit Configurations**

| Endpoint Type | Authenticated | Anonymous (NAT-Adjusted) | Window |
| ------------- | ------------- | ------------------------ | ------ |
| **Auth**      | 10 attempts   | 15 attempts              | 15 min |
| **API**       | 120 requests  | 180 requests             | 1 min  |
| **Public**    | 200 requests  | 300 requests             | 1 min  |
| **Sensitive** | 5 attempts    | 8 attempts               | 1 hour |

## 🔍 **IP Address Detection**

### **Header Precedence**

```typescript
const ipAddress =
  c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() || // Load balancer
  c.req.header("X-Real-IP") || // Nginx
  c.req.header("CF-Connecting-IP") || // Cloudflare
  "unknown";
```

### **Proxy Headers Explained**

- **X-Forwarded-For**: `client, proxy1, proxy2` (comma-separated)
- **X-Real-IP**: Original client IP (single value)
- **CF-Connecting-IP**: Cloudflare's real client IP

## 🚨 **Common NAT Scenarios**

### **Scenario 1: Corporate Office**

```
200 employees → Corporate Router → Internet → Your App
All appear as: 203.0.113.50
```

**Solution**:

- Encourage user registration for individual limits
- Higher anonymous limits for corporate blocks
- Monitor for abuse patterns

### **Scenario 2: University Campus**

```
5000 students → University Network → Internet → Your App
All appear as: 198.51.100.25
```

**Solution**:

- Educational institution rate limit exceptions
- User-agent based differentiation
- Time-based limit adjustments (higher during class hours)

### **Scenario 3: Mobile Carrier NAT**

```
Thousands of mobile users → Carrier NAT → Internet → Your App
All appear as: 192.0.2.100
```

**Solution**:

- Detect mobile user agents
- Higher mobile-specific limits
- Shorter time windows for mobile traffic

## 📊 **Rate Limit Headers**

Your app now returns enhanced headers:

```http
X-RateLimit-Limit: 180
X-RateLimit-Remaining: 165
X-RateLimit-Reset: 2025-06-19T22:15:00.000Z
X-RateLimit-Strategy: ip-ua-based
```

### **Strategy Types**

- **user-based**: Authenticated user limits
- **ip-ua-based**: IP + User-Agent combination
- **ip-only**: Fallback for minimal fingerprinting

## 🔧 **Advanced Techniques**

### **1. Sliding Window Rate Limiting**

```typescript
// Implementation for smoother rate limiting
const slidingWindow = {
  windowMs: 60000,
  segments: 6, // 10-second segments
  maxPerSegment: 20,
};
```

### **2. Rate Limit Exemptions**

```typescript
// Whitelist known corporate/educational IPs
const whitelistedNetworks = [
  "203.0.113.0/24", // Corporate network
  "198.51.100.0/24", // University network
];
```

### **3. Adaptive Rate Limiting**

```typescript
// Adjust limits based on time of day, traffic patterns
const adaptiveLimit = baseLimit * trafficMultiplier;
```

## 🎯 **Best Practices**

### **For App Developers**

1. **Always prefer user-based limiting** over IP-based
2. **Use multiple identification factors** (IP + User-Agent + more)
3. **Monitor rate limit hit patterns** to identify NAT scenarios
4. **Provide clear error messages** explaining shared network issues

### **For Frontend Implementation**

1. **Encourage user registration** with rate limit benefits
2. **Display rate limit info** to users proactively
3. **Implement exponential backoff** for retries
4. **Cache requests** when possible to reduce API calls

### **For Production Deployment**

1. **Monitor rate limit metrics** by IP and user
2. **Set up alerts** for unusual patterns
3. **Implement IP geolocation** for context
4. **Use CDN** to reduce origin server load

## 📈 **Monitoring and Metrics**

### **Key Metrics to Track**

- Rate limit hit rate by IP
- Geographic distribution of blocked IPs
- User-Agent diversity per IP
- Authentication rate after rate limit hits

### **Alert Conditions**

- High rate limit hits from single IP
- Many different User-Agents from same IP (potential bot)
- Repeated auth failures from corporate IP blocks

## 🛠️ **Testing NAT Scenarios**

### **Simulate Shared IP Testing**

```bash
# Test with different User-Agents from same IP
curl -H "User-Agent: Mozilla/5.0 (Chrome)" http://localhost:3002/api/health
curl -H "User-Agent: Mozilla/5.0 (Firefox)" http://localhost:3002/api/health
curl -H "User-Agent: Mozilla/5.0 (Safari)" http://localhost:3002/api/health
```

### **Load Testing Corporate Scenario**

```bash
# Simulate 50 users from same corporate IP
for i in {1..50}; do
  curl -H "User-Agent: Browser-$i" http://localhost:3002/api/auth/login &
done
```

This NAT-aware rate limiting strategy ensures your app remains accessible to legitimate users while maintaining security against abuse, even in complex network scenarios.
