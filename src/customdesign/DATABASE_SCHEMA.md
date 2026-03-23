/\*\*

- CUSTOMDESIGN DATABASE SCHEMA REFERENCE
- Complete database structure for custom_designs table
  \*/

=======================================================================
TABLE: custom_designs
=======================================================================

Table Name: custom_designs
Schema: public
Engine: PostgreSQL
Status: Auto-created by TypeORM (synchronize: true)

=======================================================================
COLUMNS
=======================================================================

PRIMARY KEY
─────────────────────────
id (UUID)

- Type: UUID, Primary Key
- Generated: auto (uuid_generate_v4())
- Nullable: false
- Index: implicit (primary key)
- Purpose: Unique identifier

FOREIGN KEYS
─────────────────────────
userId (UUID)

- Type: UUID, Foreign Key
- References: users(id)
- OnDelete: CASCADE
- Nullable: false
- Index: yes
- Purpose: Link to user who created design

agentId (UUID)

- Type: UUID, Foreign Key
- References: agents(id)
- OnDelete: SET NULL
- Nullable: true (optional agent)
- Index: yes
- Purpose: Link to agent if created by agent

SERVICE INFORMATION
─────────────────────────
serviceType (ENUM)

- Type: ENUM
- Values: 'landscape-design', 'interior-design', '3d-rendering',
  '2d-architectural', 'building-information-modeling', 'mep-drawings',
  'structural-engineering'
- Nullable: false
- Index: yes
- Purpose: Type of design service

selectionMethod (ENUM)

- Type: ENUM
- Values: 'manual', 'template', 'ai-advice'
- Default: 'manual'
- Nullable: false
- Index: no
- Purpose: How user selected options

STEP 1: SERVICE CONTEXT
─────────────────────────
serviceContext (VARCHAR 255)

- Type: Text/String
- Example: "Residential Garden Design"
- Nullable: true (can be null during creation)
- Index: no
- Purpose: User's selected service context

STEP 2: PROJECT TYPE
─────────────────────────
projectType (VARCHAR 255)

- Type: Text/String
- Example: "Front / Backyard Garden"
- Nullable: true
- Index: no
- Purpose: User's selected project type

STEP 3: SCOPE & DELIVERABLES
─────────────────────────
scopeDeliverable (VARCHAR 255)

- Type: Text/String
- Example: "Intermediate Package"
- Nullable: true
- Index: no
- Purpose: Selected scope/package

addons (SIMPLE ARRAY)

- Type: Array of Strings
- Example: ["3D Walkthrough Animation", "Drainage Design"]
- Nullable: true (defaults to empty [])
- Index: no
- Purpose: Selected add-ons/extras

STEP 4: SIZE / COMPLEXITY
─────────────────────────
sizeComplexity (VARCHAR 255)

- Type: Text/String
- Example: "Small (under 200 sqm)"
- Nullable: true
- Index: no
- Purpose: Project scale/complexity

STEP 5: STYLE / STANDARDS
─────────────────────────
style (VARCHAR 255)

- Type: Text/String
- Example: "Modern" or "Sustainable"
- Nullable: true
- Index: no
- Purpose: Design style preference

STEP 6: BUDGET & TIMELINE
─────────────────────────
budget (BIGINT)

- Type: Integer (large)
- Range: 0 to 9,223,372,036,854,775,807
- Example: 750000 (₦750,000)
- Nullable: true
- Index: no
- Purpose: User's budget allocation

timeline (VARCHAR 255)

- Type: Text/String
- Example: "1 Month" or "6 Weeks"
- Nullable: true
- Index: no
- Purpose: Project timeline/deadline

additionalInformation (TEXT)

- Type: Large text
- Example: "Want modern landscape with water features"
- Nullable: true
- Index: no
- Purpose: User notes and additional context

ATTACHMENTS
─────────────────────────
attachedFileIds (SIMPLE ARRAY)

- Type: Array of Strings
- Example: ["file-uuid-1", "file-uuid-2"]
- Nullable: true (defaults to empty [])
- Index: no
- Purpose: References to external file storage

PROGRESS TRACKING
─────────────────────────
currentStep (INT)

- Type: Integer
- Range: 1-6
- Default: 1
- Nullable: false
- Index: no
- Purpose: Current step user is on

WORKFLOW STATUS
─────────────────────────
status (ENUM)

- Type: ENUM
- Values: 'in_progress', 'submitted', 'under_review', 'approved',
  'rejected', 'completed'
- Default: 'in_progress'
- Nullable: false
- Index: yes
- Purpose: Current workflow state

isSubmitted (BOOLEAN)

- Type: Boolean
- Default: false
- Nullable: false
- Index: yes
- Purpose: Flag if submitted

submittedAt (TIMESTAMP)

- Type: Timestamp
- Example: 2026-03-24 10:30:45.123456
- Nullable: true
- Index: no
- Purpose: When submitted

isApproved (BOOLEAN)

- Type: Boolean
- Default: false
- Nullable: false
- Index: yes
- Purpose: Flag if approved

approvedAt (TIMESTAMP)

- Type: Timestamp
- Nullable: true
- Index: no
- Purpose: When approved

approvalNotes (VARCHAR 500)

- Type: Text/String
- Example: "Looks great! Ready to proceed."
- Nullable: true
- Index: no
- Purpose: Admin notes on approval/rejection

ESTIMATION
─────────────────────────
estimateCost (BIGINT)

- Type: Integer (large)
- Example: 862500 (computed estimate)
- Nullable: true
- Index: no
- Purpose: Calculated cost estimate

estimateTimeline (VARCHAR 255)

- Type: Text/String
- Example: "4-6 Weeks"
- Nullable: true
- Index: no
- Purpose: Calculated timeline estimate

estimateNotes (VARCHAR 500)

- Type: Text/String
- Example: "Based on scope and complexity"
- Nullable: true
- Index: no
- Purpose: Notes about estimate

TIMESTAMPS
─────────────────────────
createdAt (TIMESTAMP)

- Type: Timestamp with timezone
- Default: CURRENT_TIMESTAMP
- Nullable: false
- Index: yes
- Purpose: Record creation time

updatedAt (TIMESTAMP)

- Type: Timestamp with timezone
- Default: CURRENT_TIMESTAMP
- Updated: on every change
- Nullable: false
- Index: yes
- Purpose: Last modification time

deletedAt (TIMESTAMP)

- Type: Timestamp with timezone
- Nullable: true
- Index: yes
- Purpose: Soft delete timestamp

=======================================================================
INDEXES
=======================================================================

Automatic Indexes (by TypeORM):
─────────────────────────

- PRIMARY KEY on id
- ON userId (Foreign Key)
- ON agentId (Foreign Key)

Recommended Manual Indexes:
─────────────────────────
CREATE INDEX idx_cd_user_id ON custom_designs(userId);
CREATE INDEX idx_cd_agent_id ON custom_designs(agentId);
CREATE INDEX idx_cd_status ON custom_designs(status);
CREATE INDEX idx_cd_service_type ON custom_designs(serviceType);
CREATE INDEX idx_cd_created_at ON custom_designs(createdAt);
CREATE INDEX idx_cd_user_status ON custom_designs(userId, status);
CREATE INDEX idx_cd_agent_status ON custom_designs(agentId, status);

=======================================================================
RELATIONSHIPS
=======================================================================

User Relationship (ManyToOne)
─────────────────────────

- CustomDesign.userId → User.id
- Cardinality: Many designs per user, One user per design
- Foreign Key: custom_designs.userId references users(id)
- OnDelete: CASCADE (delete design when user is deleted)
- Lazy Loading: true

Agent Relationship (ManyToOne, Optional)
─────────────────────────

- CustomDesign.agentId → Agent.id (nullable)
- Cardinality: Many designs per agent, One agent per design
- Foreign Key: custom_designs.agentId references agents(id)
- OnDelete: SET NULL (keep design but clear agent reference)
- Lazy Loading: true

=======================================================================
SAMPLE DATA & QUERIES
=======================================================================

CREATE (initialization):
INSERT INTO custom_designs (
id, userId, serviceType, serviceContext, selectionMethod,
currentStep, status, createdAt, updatedAt
) VALUES (
'uuid-123', 'user-uuid', 'landscape-design',
'Residential Garden Design', 'manual', 1, 'in_progress',
NOW(), NOW()
);

UPDATE (step 2):
UPDATE custom_designs
SET projectType = 'Front / Backyard Garden',
currentStep = 2,
updatedAt = NOW()
WHERE id = 'uuid-123';

SUBMIT:
UPDATE custom_designs
SET status = 'submitted',
isSubmitted = true,
submittedAt = NOW(),
currentStep = 6,
updatedAt = NOW()
WHERE id = 'uuid-123';

RETRIEVE:
SELECT \* FROM custom_designs
WHERE id = 'uuid-123'
AND deletedAt IS NULL;

LIST BY USER:
SELECT \* FROM custom_designs
WHERE userId = 'user-uuid'
AND deletedAt IS NULL
ORDER BY createdAt DESC
LIMIT 10 OFFSET 0;

COUNT SUBMITTED:
SELECT COUNT(\*) FROM custom_designs
WHERE status = 'submitted'
AND deletedAt IS NULL;

=======================================================================
COLUMN SIZE ESTIMATES
=======================================================================

Column Type Size (bytes)
────────────────────────────────────────────
id UUID 16
userId UUID 16
agentId UUID 16
serviceType ENUM 4-8
selectionMethod ENUM 4-7
serviceContext VARCHAR(255) up to 255
projectType VARCHAR(255) up to 255
scopeDeliverable VARCHAR(255) up to 255
addons ARRAY variable
sizeComplexity VARCHAR(255) up to 255
style VARCHAR(255) up to 255
budget BIGINT 8
timeline VARCHAR(255) up to 255
additionalInfo TEXT variable
attachedFileIds ARRAY variable
currentStep INT 4
status ENUM 4-8
isSubmitted BOOLEAN 1
submittedAt TIMESTAMP 8
isApproved BOOLEAN 1
approvedAt TIMESTAMP 8
approvalNotes VARCHAR(500) up to 500
estimateCost BIGINT 8
estimateTimeline VARCHAR(255) up to 255
estimateNotes VARCHAR(500) up to 500
createdAt TIMESTAMP 8
updatedAt TIMESTAMP 8
deletedAt TIMESTAMP 8
────────────────────────────────────────────
MINIMUM ROW SIZE: ~250 bytes
AVERAGE ROW SIZE: ~500-1000 bytes

=======================================================================
CONSTRAINTS
=======================================================================

NOT NULL Constraints:
─────────────────────────

- id (PRIMARY KEY)
- userId (FOREIGN KEY)
- serviceType
- selectionMethod
- currentStep
- status
- isSubmitted
- isApproved
- createdAt
- updatedAt

UNIQUE Constraints:
─────────────────────────

- id (PRIMARY KEY)

CHECK Constraints:
─────────────────────────

- currentStep >= 1 AND currentStep <= 6
- budget >= 0 (application level)

FOREIGN KEY Constraints:
─────────────────────────

- userId REFERENCES users(id) ON DELETE CASCADE
- agentId REFERENCES agents(id) ON DELETE SET NULL

=======================================================================
MIGRATION NOTES
=======================================================================

TypeORM Settings:
─────────────────────────

- synchronize: true (auto-creates tables)
- No manual migration needed on first run
- Subsequent schema changes: use TypeORM migrations

Connection String Format:
postgres://username:password@host:port/database

To Enable UUID Extension:
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

Backup Recommendations:
─────────────────────────

- Daily backups of custom_designs table
- Retention: minimum 30 days
- Include userId/agentId for user data recovery

=======================================================================
PERFORMANCE TIPS
=======================================================================

1. Query Optimization
   - Always filter by userId or agentId when retrieving
   - Use pagination (LIMIT/OFFSET)
   - Add WHERE deletedAt IS NULL for soft deletes

2. Index Usage
   - Ensure createdAt index for sorting
   - Use status index for filtering
   - Composite index on (userId, status) for common queries

3. Archive Strategy
   - Move old completed designs to archive table
   - Keep active 90 days of data
   - Archive after 1 year

4. Caching
   - Cache service configs (never changes)
   - Cache user's design count
   - Invalidate on status change

=======================================================================
\*/

export const DATABASE_SCHEMA_REFERENCE = true;
