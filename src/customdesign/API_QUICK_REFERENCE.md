/\*\*

- CUSTOMDESIGN API QUICK REFERENCE
- Fast lookup for all endpoints and their usage
  \*/

=======================================================================
BASE PATH: /custom-design
=======================================================================

=======================================================================
ENDPOINT REFERENCE
=======================================================================

┌─────────────────────────────────────────────────────────────────────
│ INITIALIZATION & CREATION
└─────────────────────────────────────────────────────────────────────

POST /initialize
├─ Auth: Required (JwtAuthGuard)
├─ Purpose: Initialize a new custom design (Step 1)
├─ Body:
│ {
│ "serviceType": "landscape-design",
│ "serviceContext": "Residential Garden Design"
│ }
└─ Returns: CustomDesignResponseDto

POST /
├─ Auth: Required
├─ Purpose: Create complete custom design (all 6 steps at once)
├─ Body:
│ {
│ "serviceType": "landscape-design",
│ "selectionMethod": "manual",
│ "serviceContext": { ... },
│ "projectType": { ... },
│ "scopeDeliverable": { ... },
│ "sizeComplexity": { ... },
│ "style": { ... },
│ "budgetTimeline": { ... }
│ }
└─ Returns: CustomDesignResponseDto

┌─────────────────────────────────────────────────────────────────────
│ STEP MANAGEMENT
└─────────────────────────────────────────────────────────────────────

PUT /:id/step
├─ Auth: Required
├─ Purpose: Update a specific step
├─ Body:
│ {
│ "step": 2,
│ "data": { "projectType": "Front / Backyard Garden" }
│ }
└─ Returns: CustomDesignResponseDto
└─ Note: Auto-increments currentStep

POST /:id/validate-step
├─ Auth: Required
├─ Purpose: Validate step data without saving
├─ Body:
│ {
│ "step": 3,
│ "data": { "scopeDeliverable": "Basic Package" }
│ }
└─ Returns: { isValid: boolean, errors?: string[] }

┌─────────────────────────────────────────────────────────────────────
│ SUBMISSION & STATUS
└─────────────────────────────────────────────────────────────────────

POST /:id/submit
├─ Auth: Required
├─ Purpose: Submit completed custom design
├─ Validates: All mandatory fields present
├─ Updates Status: in_progress → submitted
└─ Returns: CustomDesignResponseDto

POST /:id/approve (Admin Only)
├─ Auth: Required
├─ Purpose: Approve submitted design
├─ Body:
│ {
│ "notes": "Looks good!"
│ }
├─ Updates Status: submitted → approved
└─ Returns: CustomDesignResponseDto

POST /:id/reject (Admin Only)
├─ Auth: Required
├─ Purpose: Reject submitted design
├─ Body:
│ {
│ "reason": "Needs more details"
│ }
├─ Updates Status: submitted → rejected
└─ Returns: CustomDesignResponseDto

┌─────────────────────────────────────────────────────────────────────
│ RETRIEVAL
└─────────────────────────────────────────────────────────────────────

GET /:id
├─ Auth: Optional
├─ Purpose: Get specific custom design
├─ Params: id (UUID)
└─ Returns: CustomDesignResponseDto

GET /my/designs
├─ Auth: Required
├─ Purpose: Get authenticated user's designs
├─ Query Params:
│ - page: number (default: 1)
│ - limit: number (default: 10)
│ - serviceType: ServiceType (optional)
│ - status: CustomDesignStatus (optional)
└─ Returns: { data: CustomDesignResponseDto[], total: number }

GET /user/:userId
├─ Auth: Optional
├─ Purpose: Get designs for specific user
├─ Params: userId (UUID)
├─ Query Params: (same as /my/designs)
└─ Returns: { data: CustomDesignResponseDto[], total: number }

GET /agent/:agentId
├─ Auth: Optional
├─ Purpose: Get designs created by specific agent
├─ Params: agentId (UUID)
├─ Query Params: (same as /my/designs)
└─ Returns: { data: CustomDesignResponseDto[], total: number }

┌─────────────────────────────────────────────────────────────────────
│ SERVICE CONFIGURATION
└─────────────────────────────────────────────────────────────────────

GET /config/:serviceType
├─ Auth: Optional
├─ Purpose: Get service options and configuration
├─ Params: serviceType (enum value)
├─ Example: /config/landscape-design
└─ Returns: ServiceConfig with all step options

Service Types:

- landscape-design
- interior-design
- 3d-rendering
- 2d-architectural
- building-information-modeling
- mep-drawings
- structural-engineering

┌─────────────────────────────────────────────────────────────────────
│ UPDATES & DELETION
└─────────────────────────────────────────────────────────────────────

PUT /:id
├─ Auth: Required
├─ Purpose: Update entire custom design
├─ Body: UpdateCustomDesignDto (flat structure)
├─ Restriction: Cannot update if submitted
└─ Returns: CustomDesignResponseDto

DELETE /:id
├─ Auth: Required
├─ Purpose: Delete custom design
├─ Params: id (UUID)
├─ Restriction: Cannot delete if submitted
└─ Returns: 204 No Content

=======================================================================
SERVICE TYPES & ENUMS
=======================================================================

ServiceType:

- "landscape-design"
- "interior-design"
- "3d-rendering"
- "2d-architectural"
- "building-information-modeling"
- "mep-drawings"
- "structural-engineering"

SelectionMethod:

- "manual" (User builds step-by-step)
- "template" (Start with template)
- "ai-advice" (AI-powered recommendations)

CustomDesignStatus:

- "in_progress" (User still editing)
- "submitted" (User submitted, under review)
- "under_review" (Admin reviewing)
- "approved" (Admin approved)
- "rejected" (Admin rejected)
- "completed" (Design completed)

=======================================================================
STEP DEFINITIONS
=======================================================================

STEP 1: Service Context
├─ Field: serviceContext (string)
├─ Example: "Residential Garden Design"
└─ 4 options per service type

STEP 2: Project Type
├─ Field: projectType (string)
├─ Example: "Front / Backyard Garden"
└─ 4 options per service type

STEP 3: Scope & Deliverables
├─ Field 1: scopeDeliverable (string - one of 3 packages)
├─ Field 2: addons (array of strings, optional)
├─ Examples:
│ - "Basic Package"
│ - "Intermediate Package" with ["3D Walkthrough Animation"]
│ - "Advanced Package" with multiple addons
└─ 3-4+ options total (3 packages + addons)

STEP 4: Size/Complexity
├─ Field: sizeComplexity (string)
├─ Example: "Small (under 200 sqm)"
└─ 3 options per service type

STEP 5: Style/Standards
├─ Field: style (string)
├─ Example: "Modern"
└─ 3-4 options per service type

STEP 6: Budget & Timeline
├─ Field 1: budget (number, min budget enforced)
├─ Field 2: timeline (string, e.g., "1 Month")
├─ Field 3: additionalInformation (string, optional)
├─ Field 4: attachedFileIds (array of strings, optional)
└─ Returns: estimateCost and estimateTimeline

=======================================================================
COMMON REQUESTS
=======================================================================

1. Initialize Landscape Design
   POST /custom-design/initialize
   {
   "serviceType": "landscape-design",
   "serviceContext": "Residential Garden Design"
   }

2. Validate Step 3 Data
   POST /custom-design/xyz/validate-step
   {
   "step": 3,
   "data": {
   "scopeDeliverable": "Basic Package",
   "addons": []
   }
   }

3. Update to Step 2
   PUT /custom-design/xyz/step
   {
   "step": 2,
   "data": {
   "projectType": "Front / Backyard Garden"
   }
   }

4. Submit Design
   POST /custom-design/xyz/submit

5. Get Service Config
   GET /custom-design/config/landscape-design

6. Get User's Designs (Paginated)
   GET /custom-design/my/designs?page=1&limit=10

7. Admin Approval
   POST /custom-design/xyz/approve
   {
   "notes": "Approved! Ready for next phase."
   }

=======================================================================
RESPONSE STRUCTURE
=======================================================================

SUCCESS (200, 201)
{
"id": "uuid",
"userId": "uuid",
"agentId": "uuid or null",
"serviceType": "landscape-design",
"selectionMethod": "manual",
"serviceContext": "Residential Garden Design",
"projectType": "Front / Backyard Garden",
"scopeDeliverable": "Basic Package",
"addons": ["3D Walkthrough Animation"],
"sizeComplexity": "Small (under 200 sqm)",
"style": "Modern",
"budget": 750000,
"timeline": "1 Month",
"additionalInformation": "Some notes",
"attachedFiles": ["file-id-1", "file-id-2"],
"currentStep": 6,
"status": "in_progress",
"estimateCost": 862500,
"estimateTimeline": "1 Month",
"createdAt": "2026-03-24T10:00:00Z",
"updatedAt": "2026-03-24T10:30:00Z"
}

VALIDATION ERROR (400)
{
"statusCode": 400,
"message": "Invalid service context selection",
"error": "Bad Request"
}

NOT FOUND (404)
{
"statusCode": 404,
"message": "Custom design not found",
"error": "Not Found"
}

FORBIDDEN (403)
{
"statusCode": 403,
"message": "You do not have permission to access this custom design",
"error": "Forbidden"
}

=======================================================================
MINIMUM BUDGETS BY SERVICE
=======================================================================

Service Type Min Budget
───────────────────────────────────────────────
Landscape Design ₦500,000
Architectural 2D ₦600,000
MEP Drawings ₦700,000
Interior Design ₦750,000
3D Rendering ₦800,000
Structural Engineering ₦900,000
BIM ₦1,000,000

=======================================================================
CURL EXAMPLES
=======================================================================

Initialize Design:
curl -X POST http://localhost:3000/custom-design/initialize \
 -H "Authorization: Bearer {token}" \
 -H "Content-Type: application/json" \
 -d '{
"serviceType": "landscape-design",
"serviceContext": "Residential Garden Design"
}'

Update Step:
curl -X PUT http://localhost:3000/custom-design/{id}/step \
 -H "Authorization: Bearer {token}" \
 -H "Content-Type: application/json" \
 -d '{
"step": 2,
"data": {"projectType": "Front / Backyard Garden"}
}'

Validate Step:
curl -X POST http://localhost:3000/custom-design/{id}/validate-step \
 -H "Authorization: Bearer {token}" \
 -H "Content-Type: application/json" \
 -d '{
"step": 3,
"data": {"scopeDeliverable": "Basic Package"}
}'

Submit:
curl -X POST http://localhost:3000/custom-design/{id}/submit \
 -H "Authorization: Bearer {token}"

Get Design:
curl -X GET http://localhost:3000/custom-design/{id} \
 -H "Authorization: Bearer {token}"

=======================================================================
NOTES
=======================================================================

1. All timestamps use ISO 8601 format
2. UUIDs are required for all ID parameters
3. Budget values are in base currency units (no decimals)
4. Pagination: page and limit are both 1-indexed/1-based
5. Step values range from 1-6
6. Status enum is case-sensitive (lowercase with underscores)
7. Service types use kebab-case
8. FileIds are external references (managed separately)
9. Cost estimation is automatic on retrieval
10. Validation errors include specific field messages

=======================================================================
\*/

export const CUSTOMDESIGN_API_QUICK_REFERENCE = true;
