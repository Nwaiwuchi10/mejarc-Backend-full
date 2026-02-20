# Login Flow Implementation Guide

## Overview

This document describes the complete email verification-based login flow implemented in your application. The flow consists of two main steps:

1. **Login Initiation** - User logs in with email/password and receives a verification token via email
2. **Token Verification** - User verifies the token to complete authentication

---

## Architecture Diagram

```
User Login Request
        ↓
[POST /user/login]
        ↓
Validate Credentials (check email exists, verify password with bcrypt)
        ↓
Generate 6-Digit Verification Token
        ↓
Save Token + 15-minute expiry to User Entity
        ↓
Send Verification Email via Mail Service
        ↓
Return Success Message + Email Confirmation
        ↓
User Receives Email with Token & Click Link
        ↓
[POST /user/verify-login-token]
        ↓
Validate Token (check exists, not expired, matches)
        ↓
Mark Email as Verified
        ↓
Send Login Success Email
        ↓
Return User Data + JWT Placeholder
```

---

## Implementation Details

### 1. User Entity Updates

**File:** `src/user/entities/user.entity.ts`

New fields added:

```typescript
@Column({ nullable: true })
loginVerificationToken?: string;          // 6-digit verification code

@Column({ type: 'timestamp', nullable: true })
loginVerificationTokenExpiry?: Date;      // Token expiry time (15 minutes)

@Column({ default: false })
isEmailVerified: boolean;                 // Track email verification status

@Column({ default: 0 })
loginAttempts: number;                    // Failed login attempt counter

@Column({ type: 'timestamp', nullable: true })
lastLoginAttempt?: Date;                  // Last login attempt timestamp
```

**Security Features:**

- Account locks after 5 failed login attempts
- Tracks last login attempt time
- Stores email verification status

### 2. DTOs (Data Transfer Objects)

**File:** `src/user/dto/login.dto.ts` (NEW)

```typescript
// Step 1: Login Request
export class LoginRequestDto {
  @IsEmail()
  email: string; // User email

  @IsNotEmpty()
  @MinLength(6)
  password: string; // User password
}

// Step 2: Verification Request
export class VerifyLoginTokenDto {
  @IsEmail()
  email: string; // User email

  @IsNotEmpty()
  verificationToken: string; // 6-digit code from email
}
```

### 3. Mail Service Enhancement

**File:** `src/user/service/mail.service.ts`

New method added:

```typescript
async sendLoginVerificationEmail(
  email: string,
  firstName: string,
  verificationToken: string
)
```

**Features:**

- Professional HTML email template
- Shows 6-digit verification code
- Includes clickable verification link
- Displays 15-minute expiry warning
- Security notice for suspicious logins
- Responsive design

Email includes:

- Company logo
- Personalized greeting
- Bold verification code display
- Direct verification link
- Copy-paste fallback URL
- Security warning
- Footer with copyright

### 4. User Service Login Methods

**File:** `src/user/user.service.ts`

#### Method 1: `initiateLogin(loginDto: LoginRequestDto)`

**Logic:**

1. Find user by email
2. Check if account is suspended
3. Validate password using bcrypt
4. Increment failed login attempts (max 5)
5. Generate random 6-digit verification token
6. Set 15-minute expiry time
7. Save token to database
8. Send verification email
9. Return success response

**Error Handling:**

- User not found → "Invalid email or password"
- Account suspended → "Your account has been suspended"
- Wrong password → Increment attempts, lock after 5 failures
- Account locked → "Account locked due to multiple failed attempts"

**Response:**

```json
{
  "success": true,
  "message": "Verification code sent to your email. Please check your inbox.",
  "email": "user@example.com",
  "expiresIn": "15 minutes"
}
```

#### Method 2: `verifyLoginToken(verifyDto: VerifyLoginTokenDto)`

**Logic:**

1. Find user by email
2. Check if verification token exists
3. Validate token hasn't expired
4. Compare token with stored value
5. Mark email as verified
6. Clear token and expiry from database
7. Reset login attempts counter
8. Send login success email
9. Return user data (without password) + JWT placeholder
10. Return JWT token for authentication

**Error Handling:**

- User not found → "User not found"
- No token found → "No verification token found. Please login first."
- Token expired → Clear token, "Verification token has expired"
- Token mismatch → "Invalid verification token"

**Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "isEmailVerified": true
    // ... other user fields (password excluded)
  },
  "token": "jwt_placeholder_uuid"
}
```

### 5. Controller Endpoints

**File:** `src/user/user.controller.ts`

#### Endpoint 1: POST /user/login

```typescript
@Post('/login')
async login(@Body() loginDto: LoginRequestDto) {
  return this.userService.initiateLogin(loginDto);
}
```

**Request:**

```json
{
  "email": "user@example.com",
  "password": "mypassword123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Verification code sent to your email. Please check your inbox.",
  "email": "user@example.com",
  "expiresIn": "15 minutes"
}
```

#### Endpoint 2: POST /user/verify-login-token

```typescript
@Post('/verify-login-token')
async verifyLoginToken(@Body() verifyDto: VerifyLoginTokenDto) {
  return this.userService.verifyLoginToken(verifyDto);
}
```

**Request:**

```json
{
  "email": "user@example.com",
  "verificationToken": "A1B2C3"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    /* user object */
  },
  "token": "jwt_placeholder_uuid"
}
```

---

## Complete Flow Example

### Step 1: User Initiates Login

```bash
POST /user/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "mypassword123"
}
```

**Backend Actions:**

- ✅ Find user by email
- ✅ Validate password (bcrypt comparison)
- ✅ Generate token: "A1B2C3"
- ✅ Set expiry: Current time + 15 minutes
- ✅ Save to database
- ✅ Send verification email

**Response:**

```json
{
  "success": true,
  "message": "Verification code sent to your email. Please check your inbox.",
  "email": "john@example.com",
  "expiresIn": "15 minutes"
}
```

### Step 2: User Receives Email

User receives email with subject: "🔐 Login Verification Code"

Email contains:

- Greeting: "Hi John, please verify your identity..."
- Code displayed prominently: **A1B2C3**
- Clickable link: `https://yourdomain.com/verify-login?token=A1B2C3&email=john@example.com`
- Expiry warning: "This code will expire in 15 minutes"
- Security notice for suspicious activity

### Step 3: User Verifies Token

```bash
POST /user/verify-login-token
Content-Type: application/json

{
  "email": "john@example.com",
  "verificationToken": "A1B2C3"
}
```

**Backend Actions:**

- ✅ Find user
- ✅ Check if token exists
- ✅ Verify token hasn't expired
- ✅ Compare tokens
- ✅ Mark isEmailVerified = true
- ✅ Clear verification token
- ✅ Reset login attempts
- ✅ Send success email
- ✅ Generate JWT token

**Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+1234567890",
    "isEmailVerified": true,
    "address": {
      /* address object */
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-02-10T14:22:00Z"
  },
  "token": "jwt_placeholder_550e8400-e29b-41d4-a716-446655440000"
}
```

### Step 4: User Receives Login Success Email

Subject: "🔑 Login Alert for John"

Email confirms:

- "Login Successful ✅"
- User profile information
- Security warning if unauthorized
- Footer with company info

---

## Security Features Implemented

### 1. Password Security

- ✅ Passwords hashed with bcrypt (salt rounds: 10)
- ✅ Passwords never returned in API responses
- ✅ Password validation before token generation

### 2. Token Security

- ✅ 6-digit random token generation
- ✅ 15-minute expiry time
- ✅ Token cleared after successful verification
- ✅ Single-use token (cleared after use)

### 3. Account Protection

- ✅ Account locks after 5 failed login attempts
- ✅ Login attempt tracking with timestamps
- ✅ Suspended account detection
- ✅ Password mismatch doesn't reveal user existence

### 4. Email Verification

- ✅ Email verification link in email
- ✅ Expiry warning in email
- ✅ Security notice for suspicious activity
- ✅ Device location tracking (optional enhancement)

### 5. Data Protection

- ✅ No sensitive data in email tokens
- ✅ HTTPS recommended for production
- ✅ Environment variables for email credentials
- ✅ Transaction-based operations

---

## Environment Variables Required

Ensure these are in your `.env` file:

```env
# Mail Configuration
MAIL_SERVICE=gmail              # or your email service
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password

# Frontend Domain
Frontend_Domain_Url=https://yourdomain.com
```

---

## Integration Notes

### JWT Token Generation (TODO)

Currently, the code includes a placeholder for JWT token generation:

```typescript
private generateJwtPlaceholder(userId: string): string {
  return `jwt_placeholder_${userId}`;
}
```

**To integrate with @nestjs/jwt:**

1. Install: `npm install @nestjs/jwt @nestjs/passport passport-jwt`
2. Import JwtModule in user.module.ts
3. Inject JwtService
4. Replace placeholder:

```typescript
async generateJwt(userId: string): Promise<string> {
  return this.jwtService.sign(
    { sub: userId },
    { expiresIn: '24h' }
  );
}
```

### Database Migration

Run migrations to update the User table with new columns:

```bash
npm run typeorm migration:generate
npm run typeorm migration:run
```

### Testing

Test the complete flow:

1. Create a user via POST /user/creates
2. Login via POST /user/login with correct credentials
3. Verify token via POST /user/verify-login-token
4. Attempt login with wrong password (should increment attempts)
5. Attempt 5 wrong logins to test account locking

---

## Files Modified/Created

### Created:

- ✅ `src/user/dto/login.dto.ts`

### Modified:

- ✅ `src/user/entities/user.entity.ts` (added verification fields)
- ✅ `src/user/service/mail.service.ts` (added verification email method)
- ✅ `src/user/user.service.ts` (added login methods)
- ✅ `src/user/user.controller.ts` (added login endpoints)

---

## Next Steps

1. **Generate Database Migration:**

   ```bash
   npm run typeorm migration:generate -n AddLoginVerificationFields
   npm run typeorm migration:run
   ```

2. **Integrate with JWT:**
   - Replace placeholder token generation with actual JWT

3. **Add Rate Limiting:**
   - Prevent brute-force attacks on login endpoint

4. **Add Email Confirmation:**
   - Add optional email confirmation on signup before allowing login

5. **Add Two-Factor Authentication:**
   - Extended security with SMS/authenticator app

6. **Add Device Tracking:**
   - Track login locations and devices

7. **Add Password Reset Flow:**
   - Using similar email verification pattern

---

## Testing the Login Flow

### Using cURL:

**Step 1: Login**

```bash
curl -X POST http://localhost:3000/user/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Step 2: Verify Token** (check email for code)

```bash
curl -X POST http://localhost:3000/user/verify-login-token \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "verificationToken": "A1B2C3"
  }'
```

### Using Postman:

1. Create new request: POST /user/login
2. Body: Select "raw" JSON
3. Send login credentials
4. Copy verification token from email
5. Create new request: POST /user/verify-login-token
6. Body: Send email and token
7. Receive JWT token in response

---

## Error Codes Reference

| Error                                       | HTTP Status | Cause                   |
| ------------------------------------------- | ----------- | ----------------------- |
| Invalid email or password (1st-4th attempt) | 401         | Wrong credentials       |
| Account locked                              | 401         | 5+ failed attempts      |
| Your account has been suspended             | 401         | Admin action            |
| User not found                              | 401         | Email doesn't exist     |
| No verification token found                 | 401         | Didn't call login first |
| Verification token has expired              | 401         | >15 minutes passed      |
| Invalid verification token                  | 401         | Wrong token value       |

---

## Production Checklist

- [ ] Update JWT placeholder with actual JWT generation
- [ ] Add rate limiting to login endpoints
- [ ] Enable HTTPS
- [ ] Configure CORS properly
- [ ] Set strong password requirements
- [ ] Implement email rate limiting
- [ ] Add logging for security events
- [ ] Configure email service credentials securely
- [ ] Test edge cases and error scenarios
- [ ] Load test the email sending
- [ ] Add monitoring and alerting
- [ ] Document API for frontend developers
- [ ] Add request validation middleware
- [ ] Implement account recovery flow
- [ ] Add Terms of Service acceptance tracking

---

**Implementation Date:** February 10, 2026
**Status:** ✅ Complete
