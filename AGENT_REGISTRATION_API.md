# Agent Registration API Documentation

## Overview

This API handles the complete agent registration flow with multi-step registration and admin approval workflow. The flow is integrated with the AgentSignupPage frontend component.

## BaseURL
```
/agent
```

---

## Registration Flow

### Step 1: Initialize Agent (After User Signup)

**Endpoint:** `POST /agent/initialize/:userId`

**Description:** Initializes agent registration after user creates account

**Parameters:**
- `userId` (path): User ID from signup response

**Request Body:** None

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "550e8400-e29b-41d4-a716-446655440001",
  "registrationStatus": "profile_pending",
  "kycStatus": "PENDING",
  "isApprovedByAdmin": false,
  "createdAt": "2026-02-18T10:30:00Z",
  "updatedAt": "2026-02-18T10:30:00Z"
}
```

**Expected Status:** 201 Created

**Error Responses:**
- `400 Bad Request` - userId is missing
- `404 Not Found` - User not found
- `409 Conflict` - Agent profile already exists for user

---

### Step 2: Submit Profile Information

**Endpoint:** `POST /agent/:userId/profile`

**Description:** Submit years of experience, title, specialization, and portfolio link

**Parameters:**
- `userId` (path): User ID

**Request Body:**
```json
{
  "yearsOfExperience": 8,
  "preferredTitle": "Architect",
  "specialization": ["Residential", "Commercial", "Landscape Design"],
  "portfolioLink": "https://myportfolio.com",
  "profilePicture": "https://s3.amazonaws.com/bucket/profile.jpg",
  "phoneNumber": "+1 234 567 8900"
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "550e8400-e29b-41d4-a716-446655440001",
  "registrationStatus": "bio_pending",
  "yearsOfExperience": 8,
  "preferredTitle": "Architect",
  "specialization": ["Residential", "Commercial", "Landscape Design"],
  "portfolioLink": "https://myportfolio.com",
  "profilePicture": "https://s3.amazonaws.com/bucket/profile.jpg",
  "createdAt": "2026-02-18T10:30:00Z",
  "updatedAt": "2026-02-18T10:45:00Z"
}
```

**Validation Rules:**
- `yearsOfExperience`: number, 0-70
- `preferredTitle`: non-empty string
- `specialization`: array of strings, non-empty
- `portfolioLink`: optional, valid URL format
- `profilePicture`: optional, S3 URL after upload

**Expected Status:** 200 OK

**Error Responses:**
- `400 Bad Request` - Missing required fields
- `404 Not Found` - User/Agent not found

---

### Step 3: Submit Bio

**Endpoint:** `PATCH /agent/:agentId/bio`

**Description:** Submit professional bio/description

**Parameters:**
- `agentId` (path): Agent ID from step 1

**Request Body:**
```json
{
  "bio": "Experienced architect with 8+ years in residential and commercial design. Passionate about sustainable architecture and innovative urban planning. Successfully completed 50+ projects across Nigeria."
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "registrationStatus": "kyc_pending",
  "bio": "Experienced architect with 8+ years in residential and commercial design...",
  "updatedAt": "2026-02-18T11:00:00Z"
}
```

**Validation Rules:**
- `bio`: string, 10-2000 characters

**Expected Status:** 200 OK

**Error Responses:**
- `400 Bad Request` - Invalid bio length
- `404 Not Found` - Agent not found

---

### Step 4: Submit KYC Information

**Endpoint:** `POST /agent/:agentId/kyc`

**Description:** Submit ID information, documents, and bank details

**Parameters:**
- `agentId` (path): Agent ID

**Request Body:**
```json
{
  "idType": "Nin",
  "idNumber": "12345678901",
  "idDocument": "https://s3.amazonaws.com/bucket/id-doc.pdf",
  "architectCert": "https://s3.amazonaws.com/bucket/cert.pdf",
  "bankName": "Zenith Bank",
  "accountNumber": "1234567890",
  "accountHolderName": "John Smith"
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "registrationStatus": "awaiting_approval",
  "kycStatus": "PENDING",
  "idType": "Nin",
  "idNumber": "12345678901",
  "idDocument": "https://s3.amazonaws.com/bucket/id-doc.pdf",
  "architectCert": "https://s3.amazonaws.com/bucket/cert.pdf",
  "bankName": "Zenith Bank",
  "accountNumber": "1234567890",
  "accountHolderName": "John Smith",
  "updatedAt": "2026-02-18T11:15:00Z"
}
```

**Validation Rules:**
- `idType`: one of "Nin", "Passport", "DriversLicense", "VotersCard"
- `idNumber`: non-empty string
- `bankName`: non-empty string
- `accountNumber`: non-empty string
- `accountHolderName`: non-empty string
- Documents: optional, S3 URLs after upload

**Expected Status:** 200 OK

**Actions on Success:**
- Email sent to agent: "Registration Submitted for Review"
- Email sent to all admins: "New KYC Submission"
- Automatic KYC verification attempted via provider (if available)

**Error Responses:**
- `400 Bad Request` - Missing required fields
- `404 Not Found` - Agent not found

---

## Admin Operations

### Approve Agent Registration

**Endpoint:** `POST /agent/:agentId/approve`

**Description:** Admin approves agent registration

**Parameters:**
- `agentId` (path): Agent ID

**Request Body:**
```json
{
  "adminId": "550e8400-e29b-41d4-a716-446655440099"
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "registrationStatus": "approved",
  "kycStatus": "VERIFIED",
  "isApprovedByAdmin": true,
  "approvedAt": "2026-02-18T12:00:00Z"
}
```

**Expected Status:** 200 OK

**Actions on Success:**
- Agent registration status updated to "approved"
- Email sent to agent: "Congratulations! Your Agent Account is Approved"

**Error Responses:**
- `400 Bad Request` - Missing adminId
- `404 Not Found` - Agent not found

---

### Reject Agent Registration

**Endpoint:** `POST /agent/:agentId/reject`

**Description:** Admin rejects agent registration with reason

**Parameters:**
- `agentId` (path): Agent ID

**Request Body:**
```json
{
  "adminId": "550e8400-e29b-41d4-a716-446655440099",
  "reason": "ID document is unclear. Please submit a clearer photo of your NIN. Bank statements must be recent (within last 3 months)."
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "registrationStatus": "rejected",
  "kycStatus": "REJECTED",
  "rejectionReason": "ID document is unclear..."
}
```

**Expected Status:** 200 OK

**Actions on Success:**
- Agent registration status updated to "rejected"
- Email sent to agent: "Application Requires Additional Information" with rejection reason
- Agent can resubmit after addressing issues

**Error Responses:**
- `400 Bad Request` - Missing adminId or reason
- `404 Not Found` - Agent not found

---

## Query Endpoints

### Get Agent Profile by User ID

**Endpoint:** `GET /agent/user/:userId`

**Description:** Retrieve complete agent profile for authenticated user

**Parameters:**
- `userId` (path): User ID

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "550e8400-e29b-41d4-a716-446655440001",
  "registrationStatus": "approved",
  "kycStatus": "VERIFIED",
  "isApprovedByAdmin": true,
  "yearsOfExperience": 8,
  "preferredTitle": "Architect",
  "specialization": ["Residential", "Commercial"],
  "portfolioLink": "https://myportfolio.com",
  "profilePicture": "https://s3.amazonaws.com/bucket/profile.jpg",
  "bio": "Experienced architect...",
  "idType": "Nin",
  "bankName": "Zenith Bank",
  "approvedAt": "2026-02-18T12:00:00Z",
  "createdAt": "2026-02-18T10:30:00Z",
  "updatedAt": "2026-02-18T12:00:00Z"
}
```

**Expected Status:** 200 OK

**Error Responses:**
- `404 Not Found` - Agent not found for user

---

### Get Agent Status

**Endpoint:** `GET /agent/status/:agentId`

**Description:** Get minimal status information about agent

**Parameters:**
- `agentId` (path): Agent ID

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "registrationStatus": "approved",
  "kycStatus": "VERIFIED",
  "isApproved": true,
  "approvedAt": "2026-02-18T12:00:00Z",
  "rejectionReason": null
}
```

**Expected Status:** 200 OK

**Error Responses:**
- `404 Not Found` - Agent not found

---

### Get All Agents

**Endpoint:** `GET /agent`

**Description:** Retrieve all agent profiles (admin use)

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "550e8400-e29b-41d4-a716-446655440001",
    "registrationStatus": "approved",
    "kycStatus": "VERIFIED",
    ...
  }
]
```

**Expected Status:** 200 OK

---

### Get Agent by ID

**Endpoint:** `GET /agent/:id`

**Description:** Retrieve specific agent profile by agent ID

**Parameters:**
- `id` (path): Agent ID

**Response:** Full agent profile object

**Expected Status:** 200 OK

**Error Responses:**
- `404 Not Found` - Agent not found

---

## Update Endpoints

### Update Agent Information

**Endpoint:** `PATCH /agent/:id`

**Description:** Update any agent fields (profile, bio, KYC, etc.)

**Parameters:**
- `id` (path): Agent ID

**Request Body:** (all fields optional)
```json
{
  "yearsOfExperience": 10,
  "preferredTitle": "Principal Architect",
  "specialization": ["Residential", "Commercial", "Urban Planning"],
  "bio": "Updated bio...",
  "bankName": "GT Bank",
  "accountNumber": "9876543210"
}
```

**Response:** Updated agent profile

**Expected Status:** 200 OK

---

## Registration Statuses

```
profile_pending    -> Agent initialized, waiting for profile submission
bio_pending        -> Profile submitted, waiting for bio
kyc_pending        -> Bio submitted, waiting for KYC submission
awaiting_approval  -> KYC submitted, awaiting admin review
approved           -> Admin approved, agent is active
rejected           -> Admin rejected, agent needs to resubmit
```

## KYC Statuses

```
PENDING    -> KYC documents received, verification in progress
VERIFIED   -> KYC documents verified successfully
REJECTED   -> KYC documents rejected by admin
```

---

## Email Notifications

### Agent Receives:
1. **Registration Submitted** - When KYC is submitted
2. **Application Approved** - When admin approves
3. **Application Rejected** - When admin rejects (includes reason)

### Admin Receives:
1. **New KYC Submission** - When agent submits KYC documents

---

## File Upload Handling

All file uploads should be done to AWS S3 before submitting to the API.

### Fields that accept file URLs:
- `profilePicture` (profile step)
- `idDocument` (KYC step)
- `architectCert` (KYC step)

### S3 Upload Response Format:
```json
{
  "url": "https://s3.amazonaws.com/bucket-name/file-path.ext"
}
```

---

## Frontend Integration Guide

### 1. After User Signup

```typescript
// User signs up successfully
const userResponse = await Api.post('/user', signupData);
const userId = userResponse.data.id;

// Initialize agent registration
const agentResponse = await Api.post(`/agent/initialize/${userId}`);
const agentId = agentResponse.data.id;

// Store agentId in state/localStorage for next steps
```

### 2. Profile Submission

```typescript
// Upload profile picture to S3 first
const formData = new FormData();
formData.append('file', profilePictureFile);
const s3Response = await uploadToS3(formData);

// Submit profile
const profileResponse = await Api.post(`/agent/${userId}/profile`, {
  yearsOfExperience: 8,
  preferredTitle: 'Architect',
  specialization: ['Residential', 'Commercial'],
  portfolioLink: 'https://...',
  profilePicture: s3Response.url,
  phoneNumber: '...'
});
```

### 3. Bio Submission

```typescript
const bioResponse = await Api.patch(`/agent/${agentId}/bio`, {
  bio: 'Professional bio text...'
});
```

### 4. KYC Submission

```typescript
// Upload documents to S3
const idDocUrl = await uploadToS3(idDocumentFile);
const certUrl = await uploadToS3(architectCertFile);

// Submit KYC
const kycResponse = await Api.post(`/agent/${agentId}/kyc`, {
  idType: 'Nin',
  idNumber: '12345678901',
  idDocument: idDocUrl,
  architectCert: certUrl,
  bankName: 'Zenith Bank',
  accountNumber: '1234567890',
  accountHolderName: 'John Smith'
});
```

### 5. Check Registration Status

```typescript
// Check status anytime
const statusResponse = await Api.get(`/agent/status/${agentId}`);

// Get full profile
const profileResponse = await Api.get(`/agent/user/${userId}`);
```

---

## Error Handling

### Common Errors

**400 Bad Request**
```json
{
  "statusCode": 400,
  "message": "Missing required fields: yearsOfExperience, preferredTitle",
  "error": "Bad Request"
}
```

**404 Not Found**
```json
{
  "statusCode": 404,
  "message": "User not found",
  "error": "Not Found"
}
```

**409 Conflict**
```json
{
  "statusCode": 409,
  "message": "Agent profile already exists for this user",
  "error": "Conflict"
}
```

---

## Database Migrations

No special migrations needed - the Agent entity already includes all necessary fields.

---

## Testing Endpoints

### Using cURL

```bash
# Initialize agent
curl -X POST http://localhost:3000/agent/initialize/user-id-here

# Submit profile
curl -X POST http://localhost:3000/agent/user-id/profile \
  -H "Content-Type: application/json" \
  -d '{
    "yearsOfExperience": 8,
    "preferredTitle": "Architect",
    "specialization": ["Residential"],
    "portfolioLink": "https://..."
  }'

# Submit bio
curl -X PATCH http://localhost:3000/agent/agent-id/bio \
  -H "Content-Type: application/json" \
  -d '{"bio": "..."}'

# Submit KYC
curl -X POST http://localhost:3000/agent/agent-id/kyc \
  -H "Content-Type: application/json" \
  -d '{
    "idType": "Nin",
    "idNumber": "12345678901",
    "bankName": "Zenith Bank",
    "accountNumber": "1234567890",
    "accountHolderName": "John Smith"
  }'

# Approve agent
curl -X POST http://localhost:3000/agent/agent-id/approve \
  -H "Content-Type: application/json" \
  -d '{"adminId": "admin-id"}'

# Get status
curl http://localhost:3000/agent/status/agent-id
```

---

## Notes

- All timestamps are in UTC format (ISO 8601)
- Password and sensitive data are never returned
- Phone number updates are optional but recommended
- Bank account details are encrypted in database
- Once approved, agent cannot update certain fields without admin intervention
