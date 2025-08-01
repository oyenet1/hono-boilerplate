# Nuxt.js Authentication Integration

## Installation

```bash
npm install @nuxtjs/axios @pinia/nuxt
```

## 1. Nuxt Configuration (`nuxt.config.ts`)

```typescript
export default defineNuxtConfig({
  modules: [
    '@pinia/nuxt'
  ],
  runtimeConfig: {
    public: {
      apiBase: process.env.API_BASE_URL || 'http://localhost:3002/v1'
    }
  },
  ssr: false, // For SPA mode, adjust based on your needs
})
```

## 2. API Plugin (`plugins/api.client.ts`)

```typescript
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  
  const $api = $fetch.create({
    baseURL: config.public.apiBase,
    onRequest({ request, options }) {
      // Add auth token to requests
      const token = useCookie('auth-token').value
      if (token) {
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${token}`
        }
      }
    },
    onResponseError({ response }) {
      // Handle auth errors globally
      if (response.status === 401 || response.status === 419) {
        // Session expired
        const authStore = useAuthStore()
        authStore.logout()
        navigateTo('/login')
      }
    }
  })

  return {
    provide: {
      api: $api
    }
  }
})
```

## 3. Auth Store (`stores/auth.ts`)

```typescript
import { defineStore } from 'pinia'

interface User {
  id: string
  name: string
  email: string
  createdAt: string
}

interface UserSession {
  sessionId: string
  userId: string
  email: string
  loginTime: number
  lastActivity: number
  ipAddress?: string
  userAgent?: string
  isCurrent?: boolean
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  sessions: UserSession[]
  currentSession: UserSession | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    token: null,
    isAuthenticated: false,
    sessions: [],
    currentSession: null
  }),

  actions: {
    // Initialize auth state from cookies
    async initAuth() {
      const token = useCookie('auth-token').value
      const user = useCookie('auth-user').value

      if (token && user) {
        this.token = token
        this.user = typeof user === 'string' ? JSON.parse(user) : user
        this.isAuthenticated = true
        
        // Verify token is still valid
        try {
          await this.fetchProfile()
        } catch (error) {
          this.logout()
        }
      }
    },

    // Login
    async login(email: string, password: string) {
      try {
        const { $api } = useNuxtApp()
        const response = await $api('/auth/login', {
          method: 'POST',
          body: { email, password }
        })

        if (response.success) {
          const { user, token, sessionId } = response.data
          
          // Store in state
          this.user = user
          this.token = token
          this.isAuthenticated = true
          
          // Store in cookies (secure, httpOnly in production)
          const tokenCookie = useCookie('auth-token', {
            maxAge: 60 * 60 * 24 * 7, // 7 days
            secure: true,
            sameSite: 'strict'
          })
          const userCookie = useCookie('auth-user', {
            maxAge: 60 * 60 * 24 * 7,
            secure: true,
            sameSite: 'strict'
          })
          
          tokenCookie.value = token
          userCookie.value = JSON.stringify(user)
          
          return { success: true, user }
        }
      } catch (error: any) {
        throw new Error(error.data?.message || 'Login failed')
      }
    },

    // Register
    async register(userData: { name: string; email: string; password: string }) {
      try {
        const { $api } = useNuxtApp()
        const response = await $api('/auth/register', {
          method: 'POST',
          body: userData
        })

        if (response.success) {
          const { user, token } = response.data
          
          this.user = user
          this.token = token
          this.isAuthenticated = true
          
          const tokenCookie = useCookie('auth-token', {
            maxAge: 60 * 60 * 24 * 7,
            secure: true,
            sameSite: 'strict'
          })
          const userCookie = useCookie('auth-user', {
            maxAge: 60 * 60 * 24 * 7,
            secure: true,
            sameSite: 'strict'
          })
          
          tokenCookie.value = token
          userCookie.value = JSON.stringify(user)
          
          return { success: true, user }
        }
      } catch (error: any) {
        throw new Error(error.data?.message || 'Registration failed')
      }
    },

    // Logout
    async logout() {
      try {
        const { $api } = useNuxtApp()
        await $api('/auth/logout', { method: 'POST' })
      } catch (error) {
        // Continue with logout even if API call fails
        console.warn('Logout API call failed:', error)
      } finally {
        // Clear state
        this.user = null
        this.token = null
        this.isAuthenticated = false
        this.sessions = []
        this.currentSession = null
        
        // Clear cookies
        const tokenCookie = useCookie('auth-token')
        const userCookie = useCookie('auth-user')
        tokenCookie.value = null
        userCookie.value = null
        
        // Redirect to login
        await navigateTo('/login')
      }
    },

    // Fetch user profile
    async fetchProfile() {
      const { $api } = useNuxtApp()
      const response = await $api('/auth/profile')
      
      if (response.success) {
        this.user = response.data
        return response.data
      }
    },

    // Get all user sessions
    async fetchSessions() {
      const { $api } = useNuxtApp()
      const response = await $api('/auth/sessions')
      
      if (response.success) {
        this.sessions = response.data.sessions
        return response.data.sessions
      }
    },

    // Get current session
    async fetchCurrentSession() {
      const { $api } = useNuxtApp()
      const response = await $api('/auth/sessions/current')
      
      if (response.success) {
        this.currentSession = response.data.session
        return response.data.session
      }
    },

    // Revoke specific session
    async revokeSession(sessionId: string) {
      const { $api } = useNuxtApp()
      const response = await $api('/auth/sessions/revoke', {
        method: 'DELETE',
        body: { sessionId }
      })
      
      if (response.success) {
        // Remove from sessions array
        this.sessions = this.sessions.filter(s => s.sessionId !== sessionId)
        return true
      }
      return false
    },

    // Revoke all other sessions
    async revokeAllOtherSessions() {
      const { $api } = useNuxtApp()
      const response = await $api('/auth/sessions/revoke-others', {
        method: 'DELETE'
      })
      
      if (response.success) {
        // Keep only current session
        this.sessions = this.sessions.filter(s => s.isCurrent)
        return response.data.revokedCount
      }
      return 0
    },

    // Refresh session token
    async refreshToken() {
      try {
        const { $api } = useNuxtApp()
        const response = await $api('/auth/refresh', {
          method: 'POST',
          body: { sessionId: this.currentSession?.sessionId }
        })
        
        if (response.success) {
          this.token = response.data.token
          const tokenCookie = useCookie('auth-token')
          tokenCookie.value = response.data.token
          return true
        }
      } catch (error) {
        console.error('Token refresh failed:', error)
        this.logout()
        return false
      }
    }
  }
})
```

## 4. Auth Middleware (`middleware/auth.ts`)

```typescript
export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore()
  
  if (!authStore.isAuthenticated) {
    return navigateTo('/login')
  }
})
```

## 5. Guest Middleware (`middleware/guest.ts`)

```typescript
export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore()
  
  if (authStore.isAuthenticated) {
    return navigateTo('/dashboard')
  }
})
```

## 6. Auth Composable (`composables/useAuth.ts`)

```typescript
export const useAuth = () => {
  const authStore = useAuthStore()
  
  return {
    user: computed(() => authStore.user),
    isAuthenticated: computed(() => authStore.isAuthenticated),
    sessions: computed(() => authStore.sessions),
    currentSession: computed(() => authStore.currentSession),
    
    login: authStore.login,
    register: authStore.register,
    logout: authStore.logout,
    fetchProfile: authStore.fetchProfile,
    fetchSessions: authStore.fetchSessions,
    fetchCurrentSession: authStore.fetchCurrentSession,
    revokeSession: authStore.revokeSession,
    revokeAllOtherSessions: authStore.revokeAllOtherSessions,
    refreshToken: authStore.refreshToken
  }
}
```

## 7. Root App Setup (`app.vue`)

```vue
<template>
  <div>
    <NuxtPage />
  </div>
</template>

<script setup>
const authStore = useAuthStore()

// Initialize auth state on app load
onMounted(async () => {
  await authStore.initAuth()
})
</script>
```

## 8. Login Page (`pages/login.vue`)

```vue
<template>
  <div class="min-h-screen flex items-center justify-center">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="text-center text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
      </div>
      
      <form @submit.prevent="handleLogin" class="mt-8 space-y-6">
        <div>
          <label for="email" class="sr-only">Email address</label>
          <input
            id="email"
            v-model="form.email"
            name="email"
            type="email"
            required
            class="relative block w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Email address"
          />
        </div>
        
        <div>
          <label for="password" class="sr-only">Password</label>
          <input
            id="password"
            v-model="form.password"
            name="password"
            type="password"
            required
            class="relative block w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Password"
          />
        </div>

        <div v-if="error" class="text-red-600 text-sm">
          {{ error }}
        </div>

        <div>
          <button
            type="submit"
            :disabled="loading"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {{ loading ? 'Signing in...' : 'Sign in' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: 'guest'
})

const { login } = useAuth()

const form = reactive({
  email: '',
  password: ''
})

const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  loading.value = true
  error.value = ''
  
  try {
    await login(form.email, form.password)
    await navigateTo('/dashboard')
  } catch (err: any) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>
```

## 9. Session Management Page (`pages/sessions.vue`)

```vue
<template>
  <div class="max-w-4xl mx-auto py-8">
    <h1 class="text-2xl font-bold mb-6">Active Sessions</h1>
    
    <div class="space-y-4">
      <div
        v-for="session in sessions"
        :key="session.sessionId"
        class="border rounded-lg p-4 flex justify-between items-center"
        :class="{ 'bg-blue-50 border-blue-200': session.isCurrent }"
      >
        <div>
          <div class="font-medium">
            {{ session.userAgent || 'Unknown Device' }}
            <span v-if="session.isCurrent" class="text-blue-600 text-sm">
              (Current Session)
            </span>
          </div>
          <div class="text-sm text-gray-600">
            IP: {{ session.ipAddress || 'Unknown' }}
          </div>
          <div class="text-sm text-gray-600">
            Login: {{ formatDate(session.loginTime) }}
          </div>
          <div class="text-sm text-gray-600">
            Last Activity: {{ formatDate(session.lastActivity) }}
          </div>
        </div>
        
        <div class="space-x-2">
          <button
            v-if="!session.isCurrent"
            @click="revokeSession(session.sessionId)"
            class="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
          >
            Revoke
          </button>
        </div>
      </div>
    </div>
    
    <div class="mt-6">
      <button
        @click="revokeAllOthers"
        class="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
      >
        Revoke All Other Sessions
      </button>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  middleware: 'auth'
})

const { 
  sessions, 
  fetchSessions, 
  revokeSession: revokeSessionStore, 
  revokeAllOtherSessions 
} = useAuth()

// Fetch sessions on page load
onMounted(() => {
  fetchSessions()
})

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString()
}

const revokeSession = async (sessionId: string) => {
  if (confirm('Are you sure you want to revoke this session?')) {
    await revokeSessionStore(sessionId)
  }
}

const revokeAllOthers = async () => {
  if (confirm('Are you sure you want to revoke all other sessions?')) {
    const count = await revokeAllOtherSessions()
    alert(`Revoked ${count} sessions`)
  }
}
</script>
```

## 10. Token Refresh Logic

```typescript
// Auto-refresh token before expiration
export const useTokenRefresh = () => {
  const { refreshToken, isAuthenticated } = useAuth()
  
  onMounted(() => {
    if (isAuthenticated.value) {
      // Refresh token every 25 minutes (assuming 30min expiry)
      setInterval(async () => {
        await refreshToken()
      }, 25 * 60 * 1000)
    }
  })
}
```

## Usage Examples

### Protected Route
```vue
<script setup>
definePageMeta({
  middleware: 'auth'
})
</script>
```

### Using Auth in Components
```vue
<script setup>
const { user, logout, isAuthenticated } = useAuth()
</script>

<template>
  <div v-if="isAuthenticated">
    Welcome, {{ user?.name }}!
    <button @click="logout">Logout</button>
  </div>
</template>
```

## Security Considerations

1. **Cookies**: Use `httpOnly`, `secure`, and `sameSite` flags in production
2. **Token Expiry**: Implement automatic token refresh
3. **CSRF Protection**: Enable CSRF protection for state-changing operations
4. **HTTPS**: Always use HTTPS in production
5. **Session Management**: Allow users to view and revoke sessions
6. **Rate Limiting**: Frontend should handle rate limit errors gracefully

This implementation provides a complete authentication system for Nuxt.js that works seamlessly with your Hono backend!
