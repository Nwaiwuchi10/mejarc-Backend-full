# Mejarc Admin API Documentation

**Base URL:** `http://localhost:3000` (or your deployed domain)  
**Auth:** All protected endpoints require `Authorization: Bearer <adminToken>` header.  
**Admin Token:** Obtained from `POST /admin/verify-login` after OTP verification.

---

## 🔐 Authentication

### POST `/admin/make-admin`
Promote an existing user to admin.

**Auth:** None

**Body:**
```json
{ "userId": "uuid", "role": "admin" }
```
**Response:**
```json
{ "success": true, "message": "User has been promoted to admin", "admin": { "id": "...", "role": "admin" } }
```

---

### POST `/admin/login`
Step 1 — Validate credentials and send OTP to admin email.

**Auth:** None

**Body:**
```json
{ "email": "admin@example.com", "password": "password123" }
```
**Response:**
```json
{ "success": true, "message": "OTP sent to admin email", "email": "admin@example.com", "expiresIn": "15 minutes" }
```

---

### POST `/admin/verify-login`
Step 2 — Verify OTP and receive admin JWT token.

**Auth:** None

**Body:**
```json
{ "email": "admin@example.com", "token": "A3F9B2" }
```
**Response:**
```json
{
  "success": true,
  "adminToken": "eyJhbGci...",
  "admin": { "id": "...", "firstName": "John", "email": "...", "adminRole": "admin" }
}
```

---

### GET `/admin`
List all admin accounts (paginated).

**Auth:** ✅ Admin Token  
**Query:** `?page=1&limit=10&search=john`

---

## 👥 Agents

### GET `/admin/agents`
List all agent registrations.

**Auth:** ✅ Admin Token  
**Query:** `?page=1&limit=10&search=sarah`

**Response:**
```json
{
  "data": [{ "id": "...", "registrationStatus": "APPROVED", "kycStatus": "VERIFIED", "user": { "firstName": "Sarah" } }],
  "meta": { "total": 25, "page": 1, "limit": 10, "totalPages": 3 }
}
```

---

### GET `/admin/agents/:agentId`
Get full detail of a single agent including KYC records.

**Auth:** ✅ Admin Token

---

### POST `/admin/approve-agent`
Approve an agent registration.

**Auth:** ✅ Admin Token  
**Body:** `{ "agentId": "uuid" }`  
**Response:** `{ "success": true }`

---

### POST `/admin/reject-agent`
Reject an agent registration.

**Auth:** ✅ Admin Token  
**Body:** `{ "agentId": "uuid", "reason": "Incomplete KYC documents" }`

---

## 👤 Users

### GET `/admin/users`
List all platform users with filtering.

**Auth:** ✅ Admin Token  
**Query:**

| Param | Type | Description |
|---|---|---|
| `page` | number | Default: 1 |
| `limit` | number | Default: 20 |
| `search` | string | Searches name/email |
| `status` | string | `Active` \| `Pending` \| `Disabled` |
| `tab` | string | `Customers` \| `Agents` \| `Staff` |

**Response:**
```json
{
  "data": [{
    "id": "uuid",
    "name": "John Smith",
    "email": "john@example.com",
    "userType": "Customer",
    "status": "Active",
    "verification": "Verified",
    "lastLogin": "2026-05-10T...",
    "createdAt": "2026-01-15T..."
  }],
  "meta": { "total": 120, "page": 1, "limit": 20, "totalPages": 6 }
}
```

---

### GET `/admin/users/:userId`
Get full detail of a single user.

**Auth:** ✅ Admin Token

**Response:** Full user object (password fields stripped)

---

### PATCH `/admin/users/:userId/suspend`
Suspend a user account.

**Auth:** ✅ Admin Token

**Response:** `{ "success": true, "message": "User suspended" }`

---

### PATCH `/admin/users/:userId/activate`
Reactivate a suspended user account.

**Auth:** ✅ Admin Token

**Response:** `{ "success": true, "message": "User activated" }`

---

## 💬 Communication

### GET `/admin/communication/stats`
Get communication overview statistics.

**Auth:** ✅ Admin Token

**Response:**
```json
{ "total": 45, "active": 38, "archived": 7, "unreadMessages": 12 }
```

---

### GET `/admin/communication/conversations`
List all conversations with last message preview.

**Auth:** ✅ Admin Token  
**Query:** `?page=1&limit=20&search=john`

**Response:**
```json
{
  "data": [{
    "id": "uuid",
    "name": null,
    "type": "dm",
    "isArchived": false,
    "lastMessage": "Hello, I need help with my project.",
    "lastMessageAt": "2026-05-17T09:30:00Z",
    "memberCount": 2
  }],
  "meta": { "total": 45, "page": 1, "limit": 20, "totalPages": 3 }
}
```

---

### GET `/admin/communication/conversations/:conversationId`
Get full conversation detail including all members and messages.

**Auth:** ✅ Admin Token

---

### POST `/admin/communication/conversations/:conversationId/escalate`
Escalate a conversation to the support team.

**Auth:** ✅ Admin Token

**Body:**
```json
{ "reason": "Customer requires urgent attention — project delay dispute." }
```
**Response:**
```json
{ "success": true, "message": "Conversation escalated to support team", "conversationId": "uuid", "reason": "..." }
```

---

## ✉️ Messages

### GET `/admin/messages`
List all conversations (alias of communication/conversations).

**Auth:** ✅ Admin Token  
**Query:** `?page=1&limit=20&search=`

---

### GET `/admin/messages/:conversationId`
Get all messages inside a specific conversation.

**Auth:** ✅ Admin Token

**Response:**
```json
{
  "conversation": { "id": "uuid", "type": "dm", "members": [...] },
  "messages": [{
    "id": "uuid",
    "text": "Hello John, your project has been updated.",
    "author": { "id": "...", "firstName": "Admin" },
    "isRead": true,
    "createdAt": "2026-05-17T10:12:00Z"
  }]
}
```

---

### POST `/admin/messages/:conversationId/reply`
Send a message from the admin into a conversation.

**Auth:** ✅ Admin Token

**Body:**
```json
{ "text": "Thank you for reaching out. We are reviewing your case.", "attachments": [] }
```
**Response:** Full saved message object.

---

## 💰 Financials

### GET `/admin/financials/stats`
Financial overview KPIs.

**Auth:** ✅ Admin Token

**Response:**
```json
{
  "totalRevenue": 11210500,
  "customerPayments": 11210500,
  "agentPayouts": 0,
  "platformCommission": 560525,
  "totalOrders": 34
}
```

---

### GET `/admin/financials/transactions`
Customer transaction history.

**Auth:** ✅ Admin Token  
**Query:** `?page=1&limit=20&status=Completed`

**Status values:** `Completed` | `Pending`

**Response:**
```json
{
  "data": [{
    "id": "uuid",
    "customer": "John Smith",
    "amount": 1200000,
    "method": "Credit Card",
    "status": "Completed",
    "date": "2026-03-01T...",
    "project": "Eco Home Design",
    "category": "Marketplace"
  }]
}
```

---

### GET `/admin/financials/payouts`
Agent payout records.

**Auth:** ✅ Admin Token  
**Query:** `?page=1&limit=20`

---

### GET `/admin/financials/disputes`
Disputed transactions.

**Auth:** ✅ Admin Token  
**Query:** `?page=1&limit=20`

---

### GET `/admin/financials/refunds`
Refund records.

**Auth:** ✅ Admin Token  
**Query:** `?page=1&limit=20`

---

### PATCH `/admin/financials/payouts/:payoutId/release`
Release a pending agent payout.

**Auth:** ✅ Admin Token  
**Body:** `{ "notes": "Released after project completion verified" }`  
**Response:** `{ "success": true, "message": "Payout uuid released" }`

---

### PATCH `/admin/financials/disputes/:disputeId/resolve`
Resolve a dispute.

**Auth:** ✅ Admin Token

**Body:**
```json
{ "resolution": "Full refund issued to customer", "refundTo": "customer" }
```
`refundTo` accepts: `"customer"` | `"agent"`

---

### PATCH `/admin/financials/refunds/:refundId/approve`
Approve a refund request.

**Auth:** ✅ Admin Token  
**Body:** `{ "notes": "Refund verified and approved" }`

---

## 🏪 Marketplace

### GET `/admin/marketplace/stats`
Marketplace listing overview.

**Auth:** ✅ Admin Token

**Response:**
```json
{ "total": 47, "approved": 30, "pending": 12, "rejected": 5 }
```

---

### GET `/admin/marketplace/listings`
List all marketplace products with filters.

**Auth:** ✅ Admin Token  
**Query:**

| Param | Values |
|---|---|
| `status` | `Pending Approval` \| `Approved` \| `Rejected` |
| `type` | `Building Plan` \| `Product Design` |
| `search` | product title keyword |
| `page` / `limit` | pagination |

**Response:**
```json
{
  "data": [{
    "id": "uuid",
    "title": "Eco Home Design",
    "category": "Building Plan",
    "planType": "Residential",
    "price": 30000000,
    "status": "pending_review",
    "agent": "Sarah Johnson",
    "agentId": "uuid",
    "createdAt": "2026-02-06T..."
  }]
}
```

---

### GET `/admin/marketplace/listings/:listingId`
Full detail of a single marketplace listing including agent and ratings.

**Auth:** ✅ Admin Token

---

### PATCH `/admin/marketplace/listings/:listingId/approve`
Approve a marketplace listing (sets status to `approved`).

**Auth:** ✅ Admin Token  
**Response:** `{ "success": true, "message": "Listing approved" }`

---

### PATCH `/admin/marketplace/listings/:listingId/reject`
Reject a marketplace listing.

**Auth:** ✅ Admin Token  
**Body:** `{ "reason": "Poor quality images submitted" }`  
**Response:** `{ "success": true, "message": "Listing rejected", "reason": "..." }`

---

### PATCH `/admin/marketplace/listings/:listingId/request-change`
Request revisions from the agent before approval.

**Auth:** ✅ Admin Token  
**Body:** `{ "feedback": "Please upload clearer floor plan images and add more description." }`  
**Response:** `{ "success": true, "message": "Change request sent to agent" }`

---

## 📋 Project Oversight

### GET `/admin/projects/stats`
Project KPI overview.

**Auth:** ✅ Admin Token

**Response:**
```json
{ "totalProjects": 120, "ongoing": 85, "completed": 0, "disputed": 0, "cancelled": 35 }
```

---

### GET `/admin/projects/customers`
Customer project list (Customers tab).

**Auth:** ✅ Admin Token  
**Query:** `?page=1&limit=20&search=john&status=Ongoing`

**Status values:** `Ongoing` | `Disputed` | `Cancelled`

**Response:**
```json
{
  "data": [{
    "projectId": "PRJ-A3F9B2",
    "orderId": "uuid",
    "customerName": "John Smith",
    "planType": "Residential Plan",
    "purchaseType": "Credit Card",
    "budget": 30000000,
    "status": "Ongoing",
    "startDate": "2026-02-01T...",
    "deadline": null,
    "agentAssigned": null
  }]
}
```

---

### GET `/admin/projects/agents`
Agent performance table (Agents tab).

**Auth:** ✅ Admin Token

**Response:**
```json
{
  "data": [{
    "id": "uuid",
    "name": "Sarah Johnson",
    "handled": 0, "completed": 0, "ongoing": 0,
    "cancelled": 0, "disputed": 0,
    "earnings": "₦0", "rating": "N/A"
  }]
}
```

---

### GET `/admin/projects/custom`
Pending custom project submissions (Custom Projects tab).

**Auth:** ✅ Admin Token

**Response:**
```json
{
  "data": [{
    "submissionId": "MKT-A3F9B2",
    "productId": "uuid",
    "agentName": "Sarah Johnson",
    "projectTitle": "Eco Home Design",
    "planType": "Residential",
    "projectValue": 30000000,
    "submissionDate": "2026-03-01T...",
    "status": "Pending Approval"
  }]
}
```

---

### GET `/admin/projects/customers/:projectId`
Full detail of a single customer project/order.

**Auth:** ✅ Admin Token

---

### PATCH `/admin/projects/customers/:projectId/assign-agent`
Assign an agent to a customer project.

**Auth:** ✅ Admin Token

**Body:**
```json
{ "agentId": "uuid-of-agent" }
```
**Response:** `{ "success": true, "message": "Agent uuid assigned to project uuid" }`

---

### PATCH `/admin/projects/custom/:submissionId/approve`
Approve a custom project submission.

**Auth:** ✅ Admin Token  
**Response:** `{ "success": true, "message": "Custom project approved" }`

---

### PATCH `/admin/projects/custom/:submissionId/reject`
Reject a custom project submission.

**Auth:** ✅ Admin Token  
**Body:** `{ "reason": "Design does not meet platform standards" }`

---

## 📊 Reports

### GET `/admin/reports/summary`
Full financial and platform KPIs for the Reports page stats cards.

**Auth:** ✅ Admin Token

**Response:**
```json
{
  "totalRevenue": 11210500,
  "customerPayments": 11210500,
  "agentPayouts": 7847350,
  "platformCommission": 560525,
  "totalUsers": 234,
  "totalAgents": 48,
  "totalProducts": 67
}
```

---

### GET `/admin/reports/performance`
Project performance breakdown (Completed, In Progress, Disputed, Cancelled).

**Auth:** ✅ Admin Token

**Response:**
```json
{
  "total": 279,
  "completed": 85,
  "inProgress": 194,
  "disputed": 0,
  "cancelled": 0,
  "completionRate": 30.5
}
```

---

### GET `/admin/reports/revenue-chart`
Monthly revenue data for the last 6 months (Revenue Chart component).

**Auth:** ✅ Admin Token

**Response:**
```json
{
  "data": [
    { "month": "Dec", "revenue": 1200000 },
    { "month": "Jan", "revenue": 1850000 },
    { "month": "Feb", "revenue": 2100000 },
    { "month": "Mar", "revenue": 1750000 },
    { "month": "Apr", "revenue": 2400000 },
    { "month": "May", "revenue": 3010500 }
  ]
}
```

---

### GET `/admin/reports/top-agents`
Top performing agents (Top Agent component).

**Auth:** ✅ Admin Token

**Response:**
```json
{
  "data": [{ "id": "uuid", "name": "Sarah Johnson", "avatar": null, "rating": 0, "projectsCompleted": 0, "earnings": 0 }]
}
```

---

### GET `/admin/reports/customer-activity`
Recent customer activity feed (Customer Activity component).

**Auth:** ✅ Admin Token

**Response:**
```json
{
  "data": [{ "userId": "uuid", "customer": "John Smith", "action": "Payment made", "amount": 1200000, "date": "2026-05-17T..." }]
}
```

---

## 🔑 Roles & Permissions

### GET `/admin/roles/stats`
Stats cards: total roles, active staff, departments, custom roles.

**Auth:** ✅ Admin Token

**Response:**
```json
{ "totalRoles": 4, "activeStaff": 15, "departmentsCovered": 4, "customRolesCreated": 2 }
```

---

### GET `/admin/roles`
List all roles (Roles tab).

**Auth:** ✅ Admin Token

**Response:**
```json
{
  "data": [
    { "id": "1", "name": "Super Admin", "department": "Executive", "users": 1, "permissions": "Full System Access" },
    { "id": "2", "name": "Project Manager", "department": "Operations", "users": 6, "permissions": "Manage Projects, Assign Agents" },
    { "id": "3", "name": "Finance Manager", "department": "Finance", "users": 3, "permissions": "Transactions, Refunds, Payouts" },
    { "id": "4", "name": "Support Manager", "department": "Customer Support", "users": 5, "permissions": "Handle Disputes, Customer Issues" }
  ],
  "total": 4
}
```

---

### POST `/admin/roles`
Create a new role.

**Auth:** ✅ Admin Token

**Body:**
```json
{ "name": "Content Manager", "department": "Marketing", "permissions": "Manage Listings, View Reports" }
```
**Response:** `{ "success": true, "role": { "id": "...", "name": "Content Manager", ... } }`

---

### PATCH `/admin/roles/:roleId`
Update an existing role.

**Auth:** ✅ Admin Token

**Body:** (all fields optional)
```json
{ "name": "Senior Project Manager", "permissions": "Manage Projects, Assign Agents, View Reports" }
```

---

### DELETE `/admin/roles/:roleId`
Delete a role.

**Auth:** ✅ Admin Token  
**Response:** `{ "success": true, "message": "Role deleted" }`

---

### GET `/admin/roles/staff`
List all admin staff members and their assigned roles (Staff Assignment tab).

**Auth:** ✅ Admin Token

**Response:**
```json
{
  "data": [{ "id": "uuid", "userId": "uuid", "name": "John Admin", "email": "john@mejarc.com", "role": "Super Admin", "isActive": true }],
  "total": 15
}
```

---

### PATCH `/admin/roles/staff/:userId/assign`
Assign a role to a staff member.

**Auth:** ✅ Admin Token

**Body:**
```json
{ "roleId": "3" }
```
**Response:** `{ "success": true, "message": "Role \"Finance Manager\" assigned to user uuid" }`

---

### GET `/admin/roles/permissions`
Get the permission matrix for all roles (Permission Matrix tab).

**Auth:** ✅ Admin Token

**Response:**
```json
{
  "permissions": ["View Users", "Edit Users", "Assign Agents", "Manage Projects", "Approve Refunds", "Process Payouts", "Access Reports"],
  "roles": ["Super Admin", "Project Manager", "Finance Manager", "Support Manager"],
  "matrix": {
    "Super Admin":      [1, 1, 1, 1, 1, 1, 1],
    "Project Manager":  [1, 1, 1, 1, 0, 0, 1],
    "Finance Manager":  [1, 0, 0, 0, 1, 1, 1],
    "Support Manager":  [1, 0, 0, 0, 1, 0, 1]
  }
}
```

---

## ⚙️ Settings

### GET `/admin/settings/profile`
Get the authenticated admin's profile (Profile Header + Personal Info).

**Auth:** ✅ Admin Token

**Response:**
```json
{
  "id": "uuid",
  "firstName": "John",
  "lastName": "Admin",
  "email": "admin@mejarc.com",
  "phoneNumber": "+2348012345678",
  "profilePics": "https://...",
  "isEmailVerified": true,
  "adminId": "uuid",
  "adminRole": "Super Admin"
}
```

---

### PATCH `/admin/settings/profile`
Update the admin's personal information.

**Auth:** ✅ Admin Token

**Body:** (all fields optional)
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+2348012345678",
  "profilePics": "https://s3.amazonaws.com/mejarc/avatars/admin.jpg"
}
```
**Response:** `{ "success": true, "message": "Profile updated" }`

---

### PATCH `/admin/settings/security/change-password`
Change the admin's password (Security settings page).

**Auth:** ✅ Admin Token

**Body:**
```json
{ "currentPassword": "OldPassword123", "newPassword": "NewSecurePass456" }
```
**Response:** `{ "success": true, "message": "Password changed successfully" }`

**Errors:**
- `401 Unauthorized` — if `currentPassword` is incorrect

---

## 📌 Error Responses

All endpoints return standard NestJS error shapes:

```json
{ "statusCode": 401, "message": "Invalid or expired admin token", "error": "Unauthorized" }
{ "statusCode": 404, "message": "User not found", "error": "Not Found" }
{ "statusCode": 400, "message": ["field must not be empty"], "error": "Bad Request" }
```

---

## 📌 Quick Reference — All Endpoints

| # | Method | Endpoint | Auth |
|---|---|---|---|
| 1 | POST | `/admin/make-admin` | — |
| 2 | POST | `/admin/login` | — |
| 3 | POST | `/admin/verify-login` | — |
| 4 | GET | `/admin` | ✅ |
| 5 | GET | `/admin/agents` | ✅ |
| 6 | GET | `/admin/agents/:agentId` | ✅ |
| 7 | POST | `/admin/approve-agent` | ✅ |
| 8 | POST | `/admin/reject-agent` | ✅ |
| 9 | GET | `/admin/users` | ✅ |
| 10 | GET | `/admin/users/:userId` | ✅ |
| 11 | PATCH | `/admin/users/:userId/suspend` | ✅ |
| 12 | PATCH | `/admin/users/:userId/activate` | ✅ |
| 13 | GET | `/admin/communication/stats` | ✅ |
| 14 | GET | `/admin/communication/conversations` | ✅ |
| 15 | GET | `/admin/communication/conversations/:id` | ✅ |
| 16 | POST | `/admin/communication/conversations/:id/escalate` | ✅ |
| 17 | GET | `/admin/messages` | ✅ |
| 18 | GET | `/admin/messages/:conversationId` | ✅ |
| 19 | POST | `/admin/messages/:conversationId/reply` | ✅ |
| 20 | GET | `/admin/financials/stats` | ✅ |
| 21 | GET | `/admin/financials/transactions` | ✅ |
| 22 | GET | `/admin/financials/payouts` | ✅ |
| 23 | GET | `/admin/financials/disputes` | ✅ |
| 24 | GET | `/admin/financials/refunds` | ✅ |
| 25 | PATCH | `/admin/financials/payouts/:id/release` | ✅ |
| 26 | PATCH | `/admin/financials/disputes/:id/resolve` | ✅ |
| 27 | PATCH | `/admin/financials/refunds/:id/approve` | ✅ |
| 28 | GET | `/admin/marketplace/stats` | ✅ |
| 29 | GET | `/admin/marketplace/listings` | ✅ |
| 30 | GET | `/admin/marketplace/listings/:id` | ✅ |
| 31 | PATCH | `/admin/marketplace/listings/:id/approve` | ✅ |
| 32 | PATCH | `/admin/marketplace/listings/:id/reject` | ✅ |
| 33 | PATCH | `/admin/marketplace/listings/:id/request-change` | ✅ |
| 34 | GET | `/admin/projects/stats` | ✅ |
| 35 | GET | `/admin/projects/customers` | ✅ |
| 36 | GET | `/admin/projects/agents` | ✅ |
| 37 | GET | `/admin/projects/custom` | ✅ |
| 38 | GET | `/admin/projects/customers/:projectId` | ✅ |
| 39 | PATCH | `/admin/projects/customers/:id/assign-agent` | ✅ |
| 40 | PATCH | `/admin/projects/custom/:id/approve` | ✅ |
| 41 | PATCH | `/admin/projects/custom/:id/reject` | ✅ |
| 42 | GET | `/admin/reports/summary` | ✅ |
| 43 | GET | `/admin/reports/performance` | ✅ |
| 44 | GET | `/admin/reports/revenue-chart` | ✅ |
| 45 | GET | `/admin/reports/top-agents` | ✅ |
| 46 | GET | `/admin/reports/customer-activity` | ✅ |
| 47 | GET | `/admin/roles/stats` | ✅ |
| 48 | GET | `/admin/roles` | ✅ |
| 49 | POST | `/admin/roles` | ✅ |
| 50 | PATCH | `/admin/roles/:roleId` | ✅ |
| 51 | DELETE | `/admin/roles/:roleId` | ✅ |
| 52 | GET | `/admin/roles/staff` | ✅ |
| 53 | PATCH | `/admin/roles/staff/:userId/assign` | ✅ |
| 54 | GET | `/admin/roles/permissions` | ✅ |
| 55 | GET | `/admin/settings/profile` | ✅ |
| 56 | PATCH | `/admin/settings/profile` | ✅ |
| 57 | PATCH | `/admin/settings/security/change-password` | ✅ |
