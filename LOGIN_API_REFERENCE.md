# Login API Quick Reference

## Endpoints Summary

| Method | Endpoint                   | Purpose                                 | Auth Required |
| ------ | -------------------------- | --------------------------------------- | ------------- |
| POST   | `/user/login`              | Initiate login, send verification email | ❌ No         |
| POST   | `/user/verify-login-token` | Verify token & complete login           | ❌ No         |

---

## API Contracts

### 1. POST /user/login

**Description:** Initiate login with email and password. Sends verification token to user's email.

**Request:**

```json
{
  "email": "john.doe@example.com",
  "password": "mySecurePassword123"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Verification code sent to your email. Please check your inbox.",
  "email": "john.doe@example.com",
  "expiresIn": "15 minutes"
}
```

**Error Responses:**

```json
// Invalid credentials (1-4 attempts)
{
  "statusCode": 401,
  "message": "Invalid email or password"
}

// Account locked (5+ failed attempts)
{
  "statusCode": 401,
  "message": "Account locked due to multiple failed login attempts. Please contact support."
}

// Account suspended
{
  "statusCode": 401,
  "message": "Your account has been suspended. Please contact support."
}
```

**Field Validation:**

- `email` - Must be valid email format (e.g., user@domain.com)
- `password` - Must be at least 6 characters

---

### 2. POST /user/verify-login-token

**Description:** Verify the 6-digit code sent to user's email and complete authentication.

**Request:**

```json
{
  "email": "john.doe@example.com",
  "verificationToken": "A1B2C3"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phoneNumber": "+1 (555) 123-4567",
    "profilePics": "https://s3-bucket.s3.amazonaws.com/user-profile-pics/...",
    "userType": "Customer",
    "name": "John Doe",
    "isEmailVerified": true,
    "loginAttempts": 0,
    "isSuspended": false,
    "address": {
      "id": "uuid",
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipcode": "10001",
      "country": "USA"
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-02-10T14:35:22.000Z"
  },
  "token": "jwt_placeholder_550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Responses:**

```json
// User not found
{
  "statusCode": 401,
  "message": "User not found"
}

// No token generated yet
{
  "statusCode": 401,
  "message": "No verification token found. Please login first."
}

// Token expired (>15 minutes)
{
  "statusCode": 401,
  "message": "Verification token has expired. Please login again."
}

// Wrong token
{
  "statusCode": 401,
  "message": "Invalid verification token"
}
```

**Field Validation:**

- `email` - Must be valid email format
- `verificationToken` - Must be exactly 6 characters (case-insensitive)

---

## Implementation Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    LOGIN FLOW SEQUENCE                          │
└─────────────────────────────────────────────────────────────────┘

Frontend                          Backend                    Database
   │                                │                           │
   │  1. POST /user/login           │                           │
   ├─────────────────────────────→  │                           │
   │  (email, password)              │                           │
   │                                 │  2. Find user by email    │
   │                                 ├──────────────────────────→│
   │                                 │←──────────────────────────┤
   │                                 │  User object              │
   │                                 │                           │
   │                                 │  3. Validate password     │
   │                                 │     (bcrypt compare)      │
   │                                 │                           │
   │                                 │  4. Generate token        │
   │                                 │  5. Set 15-min expiry     │
   │                                 │                           │
   │                                 │  6. Save token to DB      │
   │                                 ├──────────────────────────→│
   │                                 │←──────────────────────────┤
   │                                 │                           │
   │                                 │  7. Send Email            │
   │                                 │     (via Mail Service)    │
   │                                 │                           │
   │  8. Response: "Check email"    │                           │
   │←─────────────────────────────  │                           │
   │                                 │                           │
   │                                 │                           │
   │  9. User receives email         │                           │
   │     with code: A1B2C3          │                           │
   │                                 │                           │
   │  10. POST /user/verify-login-token                          │
   ├─────────────────────────────→  │                           │
   │  (email, verificationToken)     │                           │
   │                                 │                           │
   │                                 │  11. Find user            │
   │                                 ├──────────────────────────→│
   │                                 │←──────────────────────────┤
   │                                 │  User object              │
   │                                 │                           │
   │                                 │  12. Verify token        │
   │                                 │     (check expiry)       │
   │                                 │                           │
   │                                 │  13. Clear token         │
   │                                 │  14. Mark verified       │
   │                                 │  15. Reset attempts      │
   │                                 │                           │
   │                                 │  16. Save to DB          │
   │                                 ├──────────────────────────→│
   │                                 │←──────────────────────────┤
   │                                 │                           │
   │                                 │  17. Send success email   │
   │                                 │                           │
   │  18. Response: User data        │                           │
   │      + JWT token               │                           │
   │←─────────────────────────────  │                           │
   │                                 │                           │
   │  19. Store JWT token           │                           │
   │      (localStorage/cookie)      │                           │
   │                                 │                           │
   │  20. Redirect to dashboard     │                           │
   │                                 │                           │
```

---

## Security Features

### Password Protection

- ✅ Passwords hashed with bcrypt (10 salt rounds)
- ✅ Password never returned in responses
- ✅ Password validation before sending token

### Token Security

- ✅ Random 6-digit token generation
- ✅ 15-minute expiry time
- ✅ Single-use token (cleared after verification)
- ✅ Can't be reused after expiry

### Account Protection

- ✅ Login attempt tracking
- ✅ Account locks after 5 failed attempts
- ✅ Suspended account detection
- ✅ Prevents password enumeration attacks

### Email Security

- ✅ Token sent via email only
- ✅ Verification link includes expiry
- ✅ Security warning for suspicious activity
- ✅ No sensitive data in email body

---

## Code Examples

### JavaScript/TypeScript (Frontend)

```typescript
// Step 1: Login
const loginResponse = await fetch('/user/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
  }),
});

const loginData = await loginResponse.json();
console.log(loginData.message); // "Verification code sent to your email..."

// User receives email with code, e.g., "A1B2C3"

// Step 2: Verify Token
const verifyResponse = await fetch('/user/verify-login-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    verificationToken: 'A1B2C3',
  }),
});

const verifyData = await verifyResponse.json();

if (verifyData.success) {
  // Store JWT token
  localStorage.setItem('authToken', verifyData.token);

  // Store user data
  localStorage.setItem('user', JSON.stringify(verifyData.user));

  // Redirect to dashboard
  window.location.href = '/dashboard';
}
```

### Python (Backend Testing)

```python
import requests

BASE_URL = "http://localhost:3000"

# Step 1: Login
login_response = requests.post(f"{BASE_URL}/user/login", json={
    "email": "user@example.com",
    "password": "password123"
})

print(login_response.json())
# {
#   "success": true,
#   "message": "Verification code sent to your email. Please check your inbox.",
#   "email": "user@example.com",
#   "expiresIn": "15 minutes"
# }

# Check email for verification token
verification_token = "A1B2C3"  # From email

# Step 2: Verify Token
verify_response = requests.post(f"{BASE_URL}/user/verify-login-token", json={
    "email": "user@example.com",
    "verificationToken": verification_token
})

print(verify_response.json())
# Returns user data and JWT token

# Store token for authenticated requests
token = verify_response.json()["token"]
print(f"JWT Token: {token}")
```

### cURL Examples

```bash
# Step 1: Login
curl -X POST http://localhost:3000/user/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'

# Response
# {
#   "success": true,
#   "message": "Verification code sent to your email. Please check your inbox.",
#   "email": "user@example.com",
#   "expiresIn": "15 minutes"
# }

# Check email for code like "A1B2C3"

# Step 2: Verify Token
curl -X POST http://localhost:3000/user/verify-login-token \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "verificationToken": "A1B2C3"
  }'

# Response includes user data and JWT token
```

---

## Integration with Frontend

### React Example

```typescript
import { useState } from 'react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState('login'); // 'login' or 'verify'
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Step 1: Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/user/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.success) {
        setMessage(data.message);
        setStep('verify');
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      setMessage('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Handle Verification
  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/user/verify-login-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, verificationToken: token })
      });

      const data = await response.json();

      if (data.success) {
        // Save JWT token
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Redirect
        window.location.href = '/dashboard';
      } else {
        setMessage(data.message);
      }
    } catch (error) {
      setMessage('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {step === 'login' ? (
        <form onSubmit={handleLogin}>
          <h2>Login</h2>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
          {message && <p>{message}</p>}
        </form>
      ) : (
        <form onSubmit={handleVerify}>
          <h2>Verify Login</h2>
          <p>Enter the 6-digit code from your email</p>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value.toUpperCase())}
            placeholder="A1B2C3"
            maxLength="6"
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify'}
          </button>
          {message && <p>{message}</p>}
        </form>
      )}
    </div>
  );
}
```

---

## Database Schema

### User Table (Updated)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(180) UNIQUE NOT NULL,
  firstName VARCHAR(80) NOT NULL,
  lastName VARCHAR(80) NOT NULL,
  phoneNumber VARCHAR(30),
  password VARCHAR(255),
  profilePics VARCHAR(255),
  userType ENUM('Customer') DEFAULT 'Customer',
  name VARCHAR(255),

  -- Login Verification Fields
  loginVerificationToken VARCHAR(6),
  loginVerificationTokenExpiry TIMESTAMP,
  isEmailVerified BOOLEAN DEFAULT false,
  loginAttempts INTEGER DEFAULT 0,
  lastLoginAttempt TIMESTAMP,

  -- Account Status
  isSuspended BOOLEAN DEFAULT false,

  -- Timestamps
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deletedAt TIMESTAMP NULL,

  FOREIGN KEY (addressId) REFERENCES user_addresses(id)
);
```

---

## Troubleshooting

### Problem: "Invalid email or password" on correct credentials

**Solution:**

- Check if user exists in database
- Verify password was hashed correctly during signup
- Ensure bcrypt is properly installed

### Problem: Verification token not received in email

**Solution:**

- Check email service credentials in .env
- Verify `Frontend_Domain_Url` is correct
- Check spam folder
- Verify email is sent (check mail service logs)

### Problem: "Account locked" error

**Solution:**

- Wait for admin unlock or implement unlock endpoint
- Check `loginAttempts` in database
- Reset manually: `UPDATE users SET loginAttempts = 0 WHERE email = 'user@example.com'`

### Problem: Token expired error

**Solution:**

- Expiry is 15 minutes, re-login if expired
- Implement "resend code" feature if needed

---

## Performance Considerations

- Token generation: ~1ms (crypto random)
- Password validation: ~100ms (bcrypt with salt 10)
- Email sending: ~2-5 seconds (async, non-blocking)
- Database queries: ~10-50ms (indexed email field)

**Total login flow time: ~2-5 seconds** (not including email delivery)

---

## Version History

| Version | Date         | Changes                |
| ------- | ------------ | ---------------------- |
| 1.0     | Feb 10, 2026 | Initial implementation |

---

**Last Updated:** February 10, 2026
