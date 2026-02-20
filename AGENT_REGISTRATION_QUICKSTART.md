# Agent Registration Quick Start Guide

## 5-Minute Setup Overview

This guide walks you through implementing the agent registration system in your application.

---

## Prerequisites

✅ NestJS backend configured  
✅ TypeORM database setup  
✅ Nodemailer/email service configured  
✅ S3 or file upload service  
✅ React/Next.js frontend

---

## Step 1: Database Migration (5 minutes)

### 1. Create migration directory (if not exists)

```bash
mkdir -p database/migrations
```

### 2. Copy migration file

The migration file is available at:

```
database/migrations/1708251600000-AddAgentRegistrationFields.ts
```

### 3. Run migration

```bash
npm run typeorm migration:run
```

**Or manually if using different DB:**

```sql
-- Add new columns to agents table
ALTER TABLE agents ADD COLUMN registrationStatus VARCHAR(50) DEFAULT 'profile_pending';
ALTER TABLE agents ADD COLUMN yearsOfExperience INTEGER;
ALTER TABLE agents ADD COLUMN preferredTitle VARCHAR(255);
ALTER TABLE agents ADD COLUMN specialization TEXT;
ALTER TABLE agents ADD COLUMN portfolioLink VARCHAR(500);
ALTER TABLE agents ADD COLUMN profilePicture VARCHAR(1000);
ALTER TABLE agents ADD COLUMN bio TEXT;
ALTER TABLE agents ADD COLUMN idType VARCHAR(100);
ALTER TABLE agents ADD COLUMN idNumber VARCHAR(100);
ALTER TABLE agents ADD COLUMN idDocument VARCHAR(1000);
ALTER TABLE agents ADD COLUMN architectCert VARCHAR(1000);
ALTER TABLE agents ADD COLUMN bankName VARCHAR(255);
ALTER TABLE agents ADD COLUMN accountNumber VARCHAR(50);
ALTER TABLE agents ADD COLUMN accountHolderName VARCHAR(255);
ALTER TABLE agents ADD COLUMN approvedAt TIMESTAMP;
ALTER TABLE agents ADD COLUMN rejectionReason TEXT;

-- Add indices
CREATE INDEX idx_agents_registrationStatus ON agents(registrationStatus);
CREATE INDEX idx_agents_userId ON agents(userId);
```

---

## Step 2: Backend Code Updates (10 minutes)

### 1. Files to Update/Create

**Already Created:**

- ✅ `src/agent/entities/agent.entity.ts` - Updated with new fields
- ✅ `src/agent/agent.service.ts` - Updated with new methods
- ✅ `src/agent/agent.controller.ts` - Updated with new endpoints
- ✅ `src/agent/dto/create-agent-profile.dto.ts` - NEW
- ✅ `src/agent/dto/create-agent-bio.dto.ts` - NEW
- ✅ `src/agent/dto/create-agent-kyc.dto.ts` - NEW
- ✅ `src/agent/dto/agent-profile-response.dto.ts` - NEW
- ✅ `src/user/service/mail.service.ts` - Updated with email methods

### 2. Verify Imports in Module

Check `src/agent/agent.module.ts`:

```typescript
@Module({
  imports: [
    MulterModule.register(),
    TypeOrmModule.forFeature([Agent, User, Admin]),
    UserModule,
  ],
  controllers: [AgentController, AgentKycController],
  providers: [AgentService, UverifyKycProvider],
  exports: [AgentService],
})
export class AgentModule {}
```

### 3. Test Backend

```bash
# Build
npm run build

# Run tests
npm test

# Start dev server
npm run start:dev
```

---

## Step 3: Frontend Integration (20 minutes)

### 1. Create S3 Upload Utility

Create `src/Utils/S3Upload.ts`:

```typescript
import Api from '@/src/Utils/Api';

export const uploadToS3 = async (file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await Api.post('/upload/s3', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.url;
  } catch (error) {
    console.error('S3 Upload failed:', error);
    throw error;
  }
};
```

### 2. Update AgentSignupPage

Replace the entire `handleSignups`, `handleProfileSubmit`, `handleBioSubmit`, and `handleKYCSubmit` functions with the API implementations shown in [AGENT_SIGNUP_FRONTEND_INTEGRATION.md](AGENT_SIGNUP_FRONTEND_INTEGRATION.md).

**Key Changes:**

- Store `userId` and `agentId` in component state
- Make API calls to new endpoints
- Handle file uploads via S3
- Implement proper error handling

### 3. Update Sub-components

**ProfileSection:**

- Add `userId` and `agentId` props
- Call `handleProfileSubmit` with API request

**BioSection:**

- Add `agentId` prop
- Call `handleBioSubmit` with API request

**KYCSection:**

- Add `agentId` prop
- Call `handleKYCSubmit` with API request

---

## Step 4: Test the Flow (10 minutes)

### Manual Testing

#### 1. Signup

```bash
curl -X POST http://localhost:3000/user \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phoneNumber": "+1234567890",
    "password": "Test@123"
  }'
```

#### 2. Initialize Agent

```bash
curl -X POST http://localhost:3000/agent/initialize/{userId}
```

#### 3. Submit Profile

```bash
curl -X POST http://localhost:3000/agent/{userId}/profile \
  -H "Content-Type: application/json" \
  -d '{
    "yearsOfExperience": 8,
    "preferredTitle": "Architect",
    "specialization": ["Residential"],
    "portfolioLink": "https://example.com"
  }'
```

#### 4. Submit Bio

```bash
curl -X PATCH http://localhost:3000/agent/{agentId}/bio \
  -H "Content-Type: application/json" \
  -d '{
    "bio": "Experienced architect with 8+ years in design"
  }'
```

#### 5. Submit KYC

```bash
curl -X POST http://localhost:3000/agent/{agentId}/kyc \
  -H "Content-Type: application/json" \
  -d '{
    "idType": "Nin",
    "idNumber": "12345678901",
    "bankName": "Zenith Bank",
    "accountNumber": "1234567890",
    "accountHolderName": "John Doe"
  }'
```

#### 6. Check Status

```bash
curl http://localhost:3000/agent/status/{agentId}
```

#### 7. Admin Approve

```bash
curl -X POST http://localhost:3000/agent/{agentId}/approve \
  -H "Content-Type: application/json" \
  -d '{"adminId": "{adminId}"}'
```

---

## API Documentation

For detailed API documentation, see:
📖 [AGENT_REGISTRATION_API.md](AGENT_REGISTRATION_API.md)

Key Endpoints:

```
POST   /agent/initialize/:userId           # Initialize agent
POST   /agent/:userId/profile             # Submit profile
PATCH  /agent/:agentId/bio                # Submit bio
POST   /agent/:agentId/kyc                # Submit KYC
GET    /agent/user/:userId                # Get agent profile
GET    /agent/status/:agentId             # Get status
POST   /agent/:agentId/approve            # Admin approve
POST   /agent/:agentId/reject             # Admin reject
```

---

## Email Notifications

Recipients should automatically receive emails at:

1. **After KYC Submission**
   - To: Agent
   - Subject: "Registration Submitted for Review"

2. **After Admin Approval**
   - To: Agent
   - Subject: "Congratulations! Your Agent Account is Approved"

3. **After Admin Rejection**
   - To: Agent
   - Subject: "Application Requires Additional Information"

4. **New KYC Submission**
   - To: Admin users
   - Subject: "New KYC uploaded..."

---

## Environment Variables

Ensure these are set in `.env`:

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/mejarc

# Mail Service
MAIL_SERVICE=gmail
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password

# Frontend
Frontend_Domain_Url=http://localhost:3000

# S3 (optional)
AWS_S3_BUCKET=your-bucket
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=key
AWS_SECRET_ACCESS_KEY=secret
```

---

## Troubleshooting

### Issue: "Property 'X' does not exist on type 'Agent'"

**Solution:** Run the migration to add new columns

```bash
npm run typeorm migration:run
```

### Issue: Emails not sending

**Solution** Check:

1. Mail credentials in `.env`
2. Check spam folder
3. Verify `Frontend_Domain_Url` is correct
4. Check email service logs

### Issue: File upload fails

**Solution:** Check:

1. S3 bucket permissions
2. File size under 10MB
3. CORS configuration on S3
4. AWS credentials are valid

### Issue: "Agent profile already exists"

**Solution:** Use GET endpoint to check status:

```bash
curl http://localhost:3000/agent/user/{userId}
```

---

## File Structure

```
Backend/
├── src/
│   ├── agent/
│   │   ├── entities/
│   │   │   └── agent.entity.ts          ✅ UPDATED
│   │   ├── dto/
│   │   │   ├── create-agent-profile.dto.ts    ✅ NEW
│   │   │   ├── create-agent-bio.dto.ts        ✅ NEW
│   │   │   ├── create-agent-kyc.dto.ts        ✅ NEW
│   │   │   ├── agent-profile-response.dto.ts  ✅ NEW
│   │   │   └── update-agent.dto.ts      ✅ UPDATED
│   │   ├── agent.service.ts             ✅ UPDATED
│   │   ├── agent.controller.ts          ✅ UPDATED
│   │   └── agent.module.ts              ✅ OK
│   └── user/
│       └── service/
│           └── mail.service.ts          ✅ UPDATED
└── database/
    └── migrations/
        └── 1708251600000-AddAgentRegistrationFields.ts  ✅ NEW

Frontend/
└── app/
    └── (agent-signup)/
        └── page.tsx                      📝 NEEDS UPDATE
```

---

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] Backend compiles without errors
- [ ] POST /agent/initialize/:userId works
- [ ] POST /agent/:userId/profile works
- [ ] PATCH /agent/:agentId/bio works
- [ ] POST /agent/:agentId/kyc works
- [ ] GET /agent/user/:userId works
- [ ] GET /agent/status/:agentId works
- [ ] File uploads to S3 successfully
- [ ] Email notifications sent correctly
- [ ] POST /agent/:agentId/approve works
- [ ] POST /agent/:agentId/reject works
- [ ] Frontend form submission works end-to-end
- [ ] Validation errors display properly
- [ ] Loading states show during API calls

---

## Deployment Checklist

- [ ] Run database migrations
- [ ] Verify environment variables are set
- [ ] Test all endpoints in production
- [ ] Verify email service is working
- [ ] Test file uploads on production S3
- [ ] Monitor logs for errors
- [ ] Test email delivery
- [ ] Verify frontend integration

---

## Next Steps

1. **Day 1:** Database migration + Backend testing
2. **Day 2:** Frontend integration + Integration testing
3. **Day 3:** Admin dashboard for approvals
4. **Day 4:** Email template customization
5. **Day 5:** Production deployment + monitoring

---

## Documentation References

- 📖 **API Documentation:** [AGENT_REGISTRATION_API.md](AGENT_REGISTRATION_API.md)
- 📖 **Frontend Integration:** [AGENT_SIGNUP_FRONTEND_INTEGRATION.md](AGENT_SIGNUP_FRONTEND_INTEGRATION.md)
- 📖 **Implementation Details:** [AGENT_REGISTRATION_IMPLEMENTATION.md](AGENT_REGISTRATION_IMPLEMENTATION.md)

---

## Support

For issues or questions:

1. Check the relevant documentation file
2. Review error messages carefully
3. Check environment variables
4. Verify database migrations ran
5. Review API response structure
6. Check email service logs

---

## Success Criteria ✅

Once implemented, you should have:

✅ Multi-step agent registration flow  
✅ Profile, bio, and KYC collection  
✅ Automatic and manual KYC verification  
✅ Admin approval workflow  
✅ Email notifications at each step  
✅ Professional API endpoints  
✅ Comprehensive error handling  
✅ Database persistence

---

## Time Estimate

- **Backend Setup:** 15-30 minutes
- **Database Migration:** 5 minutes
- **Frontend Integration:** 30-45 minutes
- **Testing:** 20-30 minutes
- **Deployment:** 10-15 minutes

**Total: 1.5 - 2 hours**

---

Enjoy your new agent registration system! 🚀
