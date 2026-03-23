/\*\*

- Custom Design Resource - Integration Guide
-
- This document outlines the Custom Design Resource architecture and integration
- for the MejarcTech backend platform.
-
- SERVICE TYPES SUPPORTED:
- 1.  Landscape Design
- 2.  Interior Design
- 3.  3D Rendering & Visualization
- 4.  2D Architectural Drawings
- 5.  Building Information Modeling (BIM)
- 6.  Mechanical & Electrical Drawings (MEP)
- 7.  Structural Engineering Drawings
-
- WORKFLOW STEPS (6 Total):
- Step 1: Service Context (Select project context)
- Step 2: Project Type (Select project type)
- Step 3: Scope & Deliverables (Select package + optional add-ons)
- Step 4: Size / Complexity (Select project size)
- Step 5: Style / Standards / Regulations (Select design style)
- Step 6: Budget & Timeline (Enter budget, timeline, attachments)
  \*/

/\*\*

- API ENDPOINTS
-
- Authentication: Required for all endpoints except GET endpoints
- Use JwtAuthGuard for protected routes
  \*/

// ============================================
// INITIALIZATION & CREATION
// ============================================

/\*\*

- POST /custom-design/initialize
- Initialize a new custom design (Step 1)
-
- Request:
- {
- serviceType: "landscape-design",
- serviceContext: "Residential Garden Design"
- }
-
- Response: CustomDesignResponseDto
  \*/

/\*\*

- POST /custom-design
- Create a complete custom design submission (All steps)
-
- Request:
- {
- serviceType: "landscape-design",
- selectionMethod: "manual",
- serviceContext: {
-     serviceType: "landscape-design",
-     serviceContext: "Residential Garden Design"
- },
- projectType: {
-     projectType: "Front / Backyard Garden"
- },
- scopeDeliverable: {
-     scopeDeliverable: "Intermediate Package",
-     addons: ["3D Walkthrough Animation"]
- },
- sizeComplexity: {
-     sizeComplexity: "Small (under 200 sqm)"
- },
- style: {
-     style: "Modern"
- },
- budgetTimeline: {
-     budget: 750000,
-     timeline: "One Month",
-     attachedFileIds: ["file-id-1"],
-     additionalInformation: "Some notes"
- }
- }
-
- Response: CustomDesignResponseDto
  \*/

// ============================================
// STEP MANAGEMENT
// ============================================

/\*\*

- PUT /custom-design/:id/step
- Update a specific step
-
- Request:
- {
- step: 2,
- data: {
-     projectType: "Front / Backyard Garden"
- }
- }
-
- Response: CustomDesignResponseDto
  \*/

/\*\*

- POST /custom-design/:id/validate-step
- Validate step data before saving
-
- Request:
- {
- step: 3,
- data: {
-     scopeDeliverable: "Basic Package",
-     addons: ["3D Walkthrough Animation"]
- }
- }
-
- Response:
- {
- isValid: true,
- errors: []
- }
  \*/

// ============================================
// SUBMISSION & STATUS
// ============================================

/\*\*

- POST /custom-design/:id/submit
- Submit a completed custom design
-
- Response: CustomDesignResponseDto with status = "submitted"
  \*/

/\*\*

- POST /custom-design/:id/approve
- Approve a submitted custom design (Admin)
-
- Request:
- {
- notes: "Looks good!"
- }
-
- Response: CustomDesignResponseDto with status = "approved"
  \*/

/\*\*

- POST /custom-design/:id/reject
- Reject a submitted custom design (Admin)
-
- Request:
- {
- reason: "Needs more details"
- }
-
- Response: CustomDesignResponseDto with status = "rejected"
  \*/

// ============================================
// RETRIEVAL
// ============================================

/\*\*

- GET /custom-design/:id
- Get a specific custom design by ID
-
- Response: CustomDesignResponseDto
  \*/

/\*\*

- GET /custom-design/my/designs
- Get current authenticated user's custom designs
-
- Query Parameters:
- - page: number (default: 1)
- - limit: number (default: 10)
- - serviceType: ServiceType (optional)
- - status: CustomDesignStatus (optional)
-
- Response:
- {
- data: CustomDesignResponseDto[],
- total: number
- }
  \*/

/\*\*

- GET /custom-design/user/:userId
- Get custom designs for a specific user
-
- Query Parameters:
- - page: number (default: 1)
- - limit: number (default: 10)
- - serviceType: ServiceType (optional)
- - status: CustomDesignStatus (optional)
-
- Response:
- {
- data: CustomDesignResponseDto[],
- total: number
- }
  \*/

/\*\*

- GET /custom-design/agent/:agentId
- Get custom designs created by an agent
-
- Query Parameters: Same as above
-
- Response: Same as above
  \*/

// ============================================
// SERVICE CONFIGURATION
// ============================================

/\*\*

- GET /custom-design/config/:serviceType
- Get service configuration options
-
- Example: GET /custom-design/config/landscape-design
-
- Response: ServiceConfig
- {
- serviceType: "landscape-design",
- serviceName: "Landscape Design",
- contexts: [...],
- projectTypes: [...],
- scopes: [...],
- addons: [...],
- sizes: [...],
- styles: [...],
- minimumBudget: 500000,
- currency: "₦"
- }
  \*/

// ============================================
// UPDATES & DELETION
// ============================================

/\*\*

- PUT /custom-design/:id
- Update the entire custom design
-
- Request: Partial UpdateCustomDesignDto
-
- Response: CustomDesignResponseDto
  \*/

/\*\*

- DELETE /custom-design/:id
- Delete a custom design
-
- Response: 204 No Content
  \*/

// ============================================
// INTEGRATION POINTS
// ============================================

/\*\*

- USER INTEGRATION
- - CustomDesign entity has a ManyToOne relationship with User
- - Uses JwtAuthGuard for authentication
- - Tracks userId for ownership validation
    \*/

/\*\*

- AGENT INTEGRATION
- - CustomDesign entity has optional ManyToOne relationship with Agent
- - Agents can create custom designs on behalf of users
- - Agents can retrieve designs via /custom-design/agent/:agentId
    \*/

/\*\*

- FILE STORAGE INTEGRATION
- - CustomDesign stores attachedFileIds (external storage references)
- - Files should be uploaded separately to storage service
- - Integration with AWS S3 config in utils/aws-s3.config.ts
    \*/

/\*\*

- COST ESTIMATION
- - Custom calculateEstimate() method in service
- - Factors in scope, addons, and size
- - Provides estimateCost and estimateTimeline
    \*/

// ============================================
// STATUS FLOWS
// ============================================

/\*\*

- Status Transitions:
-
- in_progress
- ↓
- submitted (POST /submit)
- ├→ approved (POST /approve)
- ├→ rejected (POST /reject)
- ├→ under_review (auto)
- └→ completed (auto)
-
- Permissions:
- - in_progress: User can update/delete
- - submitted+: User can only view (not update)
- - Admin: Can approve/reject at any time
    \*/

// ============================================
// SELECTION METHODS
// ============================================

/\*\*

- SelectionMethod Enum:
- - MANUAL: User builds design step-by-step (manual = "manual")
- - TEMPLATE: Start with pre-designed template (template = "template")
- - AI_ADVICE: AI-powered recommendations (ai-advice = "ai-advice")
-
- Stored in database for tracking user preferences
  \*/

// ============================================
// SERVICE TYPES & CONFIGURATIONS
// ============================================

/\*\*

- Each service type has unique configurations:
-
- LANDSCAPE_DESIGN
- - Contexts: Residential, Commercial, Resort, Public Park
- - Min Budget: ₦500,000
-
- INTERIOR_DESIGN
- - Contexts: Residential, Commercial, Hospitality, Healthcare
- - Min Budget: ₦750,000
-
- RENDERING_3D
- - Contexts: Architectural, Real Estate, Product, Virtual Tours
- - Min Budget: ₦800,000
-
- ARCHITECTURAL_2D
- - Contexts: Residential, Commercial, Industrial, Mixed-Use
- - Min Budget: ₦600,000
-
- BIM
- - Contexts: New Construction, Renovation, Infrastructure, Facility
- - Min Budget: ₦1,000,000
-
- MEP_DRAWINGS
- - Contexts: Commercial, Residential, Industrial, Healthcare
- - Min Budget: ₦700,000
-
- STRUCTURAL_ENGINEERING
- - Contexts: Building, Infrastructure, Industrial, Rehabilitation
- - Min Budget: ₦900,000
    \*/

// ============================================
// VALIDATION & ERROR HANDLING
// ============================================

/\*\*

- Validation Errors:
- - Step validation checks against service config
- - Invalid selections are rejected with detailed error messages
- - Mandatory fields checked before submission
-
- Error Responses:
- 400: BadRequestException - Invalid data
- 404: NotFoundException - Resource not found
- 403: ForbiddenException - Ownership violation
- 409: ConflictException - Status conflict (eg. updating submitted design)
  \*/

// ============================================
// DATABASE MIGRATION
// ============================================

/\*\*

- The CustomDesign entity uses TypeORM synchronize mode
- Table: custom_designs
-
- Columns:
- - id (UUID, Primary Key)
- - userId (UUID, Foreign Key to User)
- - agentId (UUID, Foreign Key to Agent, Nullable)
- - serviceType (ENUM)
- - selectionMethod (ENUM)
- - serviceContext (VARCHAR)
- - projectType (VARCHAR)
- - scopeDeliverable (VARCHAR)
- - addons (Array)
- - sizeComplexity (VARCHAR)
- - style (VARCHAR)
- - budget (BIGINT)
- - timeline (VARCHAR)
- - additionalInformation (TEXT, Nullable)
- - attachedFileIds (Array, Nullable)
- - currentStep (INT)
- - status (ENUM)
- - estimateCost (BIGINT, Nullable)
- - estimateTimeline (VARCHAR, Nullable)
- - estimateNotes (VARCHAR, Nullable)
- - isSubmitted (BOOLEAN)
- - submittedAt (TIMESTAMP, Nullable)
- - isApproved (BOOLEAN)
- - approvedAt (TIMESTAMP, Nullable)
- - approvalNotes (VARCHAR, Nullable)
- - createdAt (TIMESTAMP)
- - updatedAt (TIMESTAMP)
- - deletedAt (TIMESTAMP, Nullable)
    \*/

// ============================================
// USAGE EXAMPLES
// ============================================

/\*\*

- Example 1: Initialize a landscape design
-
- POST /custom-design/initialize
- {
- "serviceType": "landscape-design",
- "serviceContext": "Residential Garden Design"
- }
  \*/

/\*\*

- Example 2: Update to Step 2 - Project Type
-
- PUT /custom-design/123e4567-e89b-12d3-a456-426614174000/step
- {
- "step": 2,
- "data": {
-     "projectType": "Front / Backyard Garden"
- }
- }
  \*/

/\*\*

- Example 3: Submit complete design
-
- POST /custom-design/123e4567-e89b-12d3-a456-426614174000/submit
  \*/

/\*\*

- Example 4: Get user's designs
-
- GET /custom-design/my/designs?page=1&limit=10&serviceType=landscape-design
  \*/

export const CUSTOM_DESIGN_DOCUMENTATION = {
version: '1.0.0',
lastUpdated: '2026-03-24',
module: 'CustomDesignModule',
status: 'Production Ready',
};
