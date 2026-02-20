# Frontend Integration Guide - Login Flow

## Quick Start

This guide helps frontend developers integrate the new email-verification-based login system with your application.

---

## Installation & Setup

### Prerequisites

- Node.js/JavaScript knowledge
- HTTP client library (fetch, axios, etc.)
- State management (optional but recommended)
- Local storage or cookie management

### Environment Configuration

Add to your `.env.local` or `.env`:

```env
REACT_APP_API_URL=http://localhost:3000
REACT_APP_API_BASE=http://localhost:3000/user
```

---

## Login Flow Overview

```
User enters email/password
          ↓
[1] POST /user/login
          ↓
Show "Check your email" message
          ↓
User receives email with code
          ↓
User enters verification code
          ↓
[2] POST /user/verify-login-token
          ↓
Receive JWT token + user data
          ↓
Store token, redirect to dashboard
```

---

## Implementation Examples

### 1. React Hooks Implementation

```typescript
// hooks/useLogin.ts
import { useState } from 'react';

export interface LoginState {
  step: 'login' | 'verify';
  email: string;
  loading: boolean;
  error: string | null;
  message: string | null;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  phoneNumber?: string;
  isEmailVerified: boolean;
  profilePics?: string;
  address?: any;
  createdAt: string;
  updatedAt: string;
}

export function useLogin() {
  const [state, setState] = useState<LoginState>({
    step: 'login',
    email: '',
    loading: false,
    error: null,
    message: null,
  });

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Step 1: Login with email and password
  const login = async (email: string, password: string) => {
    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
      message: null,
    }));

    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      setState((prev) => ({
        ...prev,
        step: 'verify',
        email,
        message: data.message,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  };

  // Step 2: Verify token
  const verify = async (verificationToken: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_BASE}/verify-login-token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: state.email,
            verificationToken,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Verification failed');
      }

      // Store credentials
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      setUser(data.user);
      setToken(data.token);

      setState((prev) => ({
        ...prev,
        message: 'Login successful! Redirecting...',
      }));

      // Redirect after short delay
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  };

  const reset = () => {
    setState({
      step: 'login',
      email: '',
      loading: false,
      error: null,
      message: null,
    });
  };

  return { state, user, token, login, verify, reset };
}
```

### 2. React Login Component

```typescript
// components/LoginPage.tsx
import { useState } from 'react';
import { useLogin } from '../hooks/useLogin';
import './LoginPage.css';

export function LoginPage() {
  const { state, login, verify, reset } = useLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, password);
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verify(verificationCode.toUpperCase());
  };

  const handleBackToLogin = () => {
    reset();
    setEmail('');
    setPassword('');
    setVerificationCode('');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Welcome Back</h1>

        {state.step === 'login' ? (
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={state.loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={state.loading}
                required
              />
            </div>

            {state.error && (
              <div className="alert alert-error">
                {state.error}
              </div>
            )}

            {state.message && (
              <div className="alert alert-info">
                {state.message}
              </div>
            )}

            <button
              type="submit"
              disabled={state.loading}
              className="btn btn-primary"
            >
              {state.loading ? 'Logging in...' : 'Sign In'}
            </button>

            <div className="form-footer">
              <p>Don't have an account?{' '}
                <a href="/signup">Sign up</a>
              </p>
              <p><a href="/forgot-password">Forgot password?</a></p>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifySubmit}>
            <div className="verify-message">
              <h2>Verify Your Login</h2>
              <p>We've sent a verification code to:</p>
              <p className="email-highlight">{state.email}</p>
            </div>

            <div className="form-group">
              <label htmlFor="code">Verification Code</label>
              <input
                id="code"
                type="text"
                value={verificationCode}
                onChange={e =>
                  setVerificationCode(e.target.value.toUpperCase().slice(0, 6))
                }
                placeholder="A1B2C3"
                maxLength={6}
                disabled={state.loading}
                required
                className="code-input"
              />
              <p className="code-hint">Enter the 6-character code from your email</p>
            </div>

            {state.error && (
              <div className="alert alert-error">
                {state.error}
              </div>
            )}

            {state.message && (
              <div className="alert alert-success">
                {state.message}
              </div>
            )}

            <button
              type="submit"
              disabled={state.loading || verificationCode.length !== 6}
              className="btn btn-primary"
            >
              {state.loading ? 'Verifying...' : 'Verify Code'}
            </button>

            <button
              type="button"
              onClick={handleBackToLogin}
              disabled={state.loading}
              className="btn btn-secondary"
            >
              Back to Login
            </button>

            <p className="resend-hint">
              Didn't receive the code?{' '}
              <button
                type="button"
                onClick={handleBackToLogin}
                className="link-button"
              >
                Try again
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
```

### 3. CSS Styles

```css
/* LoginPage.css */

.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  padding: 40px;
  max-width: 400px;
  width: 100%;
}

.login-card h1 {
  font-size: 28px;
  margin-bottom: 30px;
  text-align: center;
  color: #111827;
}

.login-card h2 {
  font-size: 20px;
  margin-bottom: 10px;
  color: #111827;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #374151;
  font-size: 14px;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.3s;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-group input:disabled {
  background-color: #f3f4f6;
  cursor: not-allowed;
}

.code-input {
  text-transform: uppercase;
  letter-spacing: 2px;
  font-weight: bold;
  font-size: 18px;
}

.code-hint {
  margin-top: 6px;
  font-size: 12px;
  color: #6b7280;
}

.alert {
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 14px;
  animation: slideIn 0.3s ease-out;
}

.alert-error {
  background-color: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.alert-info {
  background-color: #dbeafe;
  color: #1e40af;
  border: 1px solid #93c5fd;
}

.alert-success {
  background-color: #dcfce7;
  color: #166534;
  border: 1px solid #86efac;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: 10px;
}

.btn-primary {
  background-color: #667eea;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #5568d3;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-primary:disabled {
  background-color: #d1d5db;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #e5e7eb;
  color: #374151;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #d1d5db;
}

.verify-message {
  text-align: center;
  margin-bottom: 30px;
}

.verify-message p {
  color: #6b7280;
  margin: 10px 0;
}

.email-highlight {
  background-color: #f0f9ff;
  padding: 8px 12px;
  border-radius: 6px;
  font-weight: 600;
  color: #1e40af;
}

.form-footer {
  margin-top: 20px;
  text-align: center;
  font-size: 14px;
}

.form-footer p {
  margin: 8px 0;
  color: #6b7280;
}

.form-footer a {
  color: #667eea;
  text-decoration: none;
  font-weight: 600;
}

.form-footer a:hover {
  text-decoration: underline;
}

.link-button {
  background: none;
  border: none;
  color: #667eea;
  cursor: pointer;
  text-decoration: none;
  font-weight: 600;
  padding: 0;
}

.link-button:hover {
  text-decoration: underline;
}

.resend-hint {
  margin-top: 15px;
  text-align: center;
  color: #6b7280;
  font-size: 14px;
}
```

---

## Authentication Context (Optional but Recommended)

```typescript
// context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  isEmailVerified: boolean;
  profilePics?: string;
  address?: any;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  verify: (email: string, code: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load from storage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }

    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch(`${process.env.REACT_APP_API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }
  };

  const verify = async (email: string, code: string) => {
    const response = await fetch(
      `${process.env.REACT_APP_API_BASE}/verify-login-token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          verificationToken: code,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Verification failed');
    }

    const data = await response.json();
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        verify,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

---

## Protected Route Component

```typescript
// components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

---

## Using with axios

```typescript
// api/client.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

// Add token to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// Usage
export async function login(email: string, password: string) {
  const response = await apiClient.post('/user/login', { email, password });
  return response.data;
}

export async function verifyToken(email: string, verificationToken: string) {
  const response = await apiClient.post('/user/verify-login-token', {
    email,
    verificationToken,
  });
  return response.data;
}
```

---

## Integration in App.tsx

```typescript
// App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { SignupPage } from './pages/SignupPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
```

---

## Testing Checklist

- [ ] Test login with valid credentials
- [ ] Test login with invalid credentials (show error)
- [ ] Test account lock (5+ failed attempts)
- [ ] Test token expiry (try after 15 minutes)
- [ ] Test wrong verification code
- [ ] Test storing token in localStorage
- [ ] Test redirecting to dashboard on success
- [ ] Test logout clearing tokens
- [ ] Test protected routes
- [ ] Test token in API requests
- [ ] Test auto-logout on 401 response
- [ ] Test mobile responsiveness

---

## Common Issues & Solutions

### Issue: CORS error

**Solution:**

- Ensure backend has CORS enabled
- Check that API_URL is correct
- Verify same-origin policy

### Issue: Token not persisting

**Solution:**

- Check if localStorage is enabled
- Verify token is being saved
- Check browser dev tools Storage tab

### Issue: "Verification code not received"

**Solution:**

- Check email service is configured
- Check spam folder
- Implement "resend code" feature
- Check backend mail logs

### Issue: Infinite loading

**Solution:**

- Check API endpoint URL
- Verify backend is running
- Check browser console for errors
- Add timeout to API calls

---

## Performance Tips

1. **Lazy load login component**

   ```typescript
   const LoginPage = lazy(() => import('./pages/LoginPage'));
   ```

2. **Debounce verification code input**

   ```typescript
   const [code, setCode] = useState('');
   const debouncedCode = useDebounce(code, 300);
   ```

3. **Cache user data**

   ```typescript
   localStorage.setItem('user', JSON.stringify(user));
   ```

4. **Implement request timeout**
   ```typescript
   const controller = new AbortController();
   const timeout = setTimeout(() => controller.abort(), 5000);
   ```

---

## Security Best Practices

- ✅ Use HTTPS only
- ✅ Store token in localStorage or secure cookie
- ✅ Don't expose token in URL
- ✅ Implement CSRF protection
- ✅ Add rate limiting to login endpoint
- ✅ Validate input before sending
- ✅ Clear data on logout
- ✅ Use Content Security Policy headers

---

**Created:** February 10, 2026
**Last Updated:** February 10, 2026
