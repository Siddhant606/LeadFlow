# AI Coding Prompt History

All AI coding prompts used in the development of LeadFlow are recorded here in chronological order, preserving verbatim prompt instructions.

---

### Prompt 1: Initial System & MVP Requirement Specification
**Timestamp**: 2026-09-26T13:18:08+05:30
**Input Prompt**:
```markdown
You are a senior full-stack engineer and software architect. Build the following production-minded MERN MVP called "LeadFlow" for a technical assessment.

## PRODUCT

LeadFlow is a multi-tenant SaaS platform for German mortgage brokerages.

Core workflow:

External Lead Source
→ Webhook
→ Lead created/deduplicated
→ Advisor Pipeline
→ Lead becomes Client
→ Client uploads documents
→ Background document verification
→ Live status updates
→ Email + Task automations

The product must support multiple brokerages in one deployment, with strict tenant isolation. Brokerage A must NEVER access Brokerage B's users, leads, clients, documents, tasks, or settings.

Build a smaller reliable product rather than a large unfinished one.

## TECH STACK

Frontend:
- React + TypeScript + Vite
- React Router
- TanStack Query
- Tailwind CSS
- Socket.IO Client

Backend:
- Node.js + Express + TypeScript
- MongoDB + Mongoose
- JWT authentication
- bcrypt/bcryptjs
- Zod validation
- Socket.IO

Async processing:
- Redis
- BullMQ
- Background worker

Storage:
- Object/file storage for uploaded documents; do not store document binaries in MongoDB.

Email:
- Use an appropriate email provider with environment-based configuration.

Deploy using practical free/low-cost services where possible.

## ARCHITECTURE

Use:

React
  ↓
Express REST API
  ↓
Controllers → Services → Mongoose
  ↓
MongoDB

Real-time:
Express/Socket.IO → React

Async:
Express → BullMQ → Redis → Worker → MongoDB → Socket.IO

External leads:
External tool → authenticated webhook → Express

Keep business logic in services rather than React components or route handlers.

## USER ROLES

Implement:

- PLATFORM_ADMIN
- BROKERAGE_ADMIN
- ADVISOR
- CLIENT

Use server-side RBAC.

Clients can only access their own case/documents.

Advisors/admins can only access data belonging to their brokerage.

## MULTI-TENANCY

Every brokerage-owned entity must contain brokerageId.

Every backend query must enforce tenant scope.

Never rely on frontend filtering.

Protect against IDOR attacks such as changing /leads/:id to another brokerage's ID.

Socket.IO rooms must also be tenant-scoped.

## DATABASE MODELS

Create:

Brokerage
- name
- slug
- status

User
- brokerageId
- name
- email
- passwordHash
- role
- isActive

Lead
- brokerageId
- externalId
- name
- email
- phone
- source
- stage
- assignedAdvisorId
- clientId

Client
- brokerageId
- userId
- leadId
- caseStatus

Document
- brokerageId
- clientId
- uploadedBy
- originalName
- storageKey
- mimeType
- size
- status
- failureReason

Task
- brokerageId
- leadId
- assignedTo
- title
- description
- dueAt
- status

EmailTemplate
- brokerageId
- name
- subject
- body

PipelineStage
- brokerageId
- name
- order
- emailTemplateId
- taskTemplates

Add appropriate indexes and unique constraints.

## PIPELINE

Initial stages:

NEW
CONTACTED
QUALIFIED
APPLICATION
WON
LOST

Create a Kanban-style pipeline.

When a lead changes stage:

1. Validate authorization and tenant ownership.
2. Update lead.
3. Trigger configured email.
4. Create configured tasks.
5. Emit Socket.IO event.

Changes must appear live on other open screens without refresh.

## LEAD WEBHOOK

Implement:

POST /api/webhooks/leads

Accept:

externalId
name
email
phone
source

Authenticate the webhook using a secret/API key.

Normalize email/phone.

Prevent duplicate webhook processing using:

brokerageId + externalId

with database-level uniqueness/idempotency.

Also detect existing people using normalized email/phone.

## LEAD → CLIENT

Authorized advisor can convert a lead into a client.

Create the client and associated CLIENT user.

Prevent duplicate conversion.

Client can then log in and access only their own case.

## DOCUMENTS

Client uploads documents to object storage.

MongoDB stores metadata.

Statuses:

UPLOADED
PROCESSING
PASSED
FAILED

Upload must return quickly.

Do NOT synchronously perform verification.

Instead:

Upload
→ create document
→ PROCESSING
→ BullMQ job
→ Redis
→ worker
→ simulated slow validation
→ PASSED/FAILED
→ MongoDB
→ Socket.IO
→ live client/advisor update

Verification may be simulated, but must actually be asynchronous, slow, and capable of failing.

Implement retries for worker failures.

## EMAIL AUTOMATION

Brokerage admins can create/edit email templates.

Support placeholders:

{{clientName}}
{{advisorName}}
{{brokerageName}}

When a lead enters a configured pipeline stage, send the linked email.

Email failure must not cause the core lead/stage update to fail.

## TASK AUTOMATION

When a lead enters a configured stage, create configured tasks.

Task fields:

title
assigned advisor
due date
status

Statuses:

PENDING
COMPLETED

Highlight overdue tasks.

## DASHBOARD

Create a brokerage dashboard showing:

- Total leads
- Leads by stage
- Pending tasks
- Overdue tasks
- Documents processing
- Documents failed

Dashboard must be tenant-specific, fast, and consistent.

Use appropriate MongoDB indexes/aggregation. Use Redis caching only if it does not introduce stale data.

## SECURITY

Implement:

- JWT authentication
- RBAC
- tenant isolation
- Zod validation
- Helmet
- CORS
- rate limiting where appropriate
- safe file validation
- centralized error handling
- no secrets in source code
- .env configuration
- sanitized production errors

Never expose passwords, secrets, or storage credentials.

## FRONTEND

Create professional responsive pages for:

- Login
- Dashboard
- Lead Pipeline
- Lead Details
- Clients
- Client Details
- Tasks
- Email Templates
- Pipeline Settings
- Client Portal
- Documents

Use loading, error, empty, and success states.

Use TanStack Query for server state and Socket.IO for live updates.

## TESTING

Test at minimum:

- authentication
- RBAC
- cross-tenant access rejection
- duplicate webhook
- duplicate person detection
- pipeline transitions
- concurrent lead updates
- lead-to-client conversion
- document upload
- background document processing
- worker retry
- task triggers
- email triggers
- dashboard tenant isolation

Especially test:

Brokerage A must not access Brokerage B data.

## FAILURE CASES

Handle:

- duplicate webhooks
- 500 leads arriving quickly
- simultaneous advisor updates
- worker crash
- email provider failure
- Redis failure
- invalid JWT
- invalid file
- oversized file
- unauthorized resource ID
- duplicate client conversion

Do not over-engineer. Use simple, defensible solutions.

## PROJECT STRUCTURE

Use:

leadflow/
├── client/
├── server/
├── README.md
├── PROMPTS.md
├── .gitignore
└── package.json

Backend:

server/src/
├── config/
├── controllers/
├── middleware/
├── models/
├── routes/
├── services/
├── queues/
├── workers/
├── sockets/
├── validators/
├── utils/
└── types/

## DEVELOPMENT PROCESS

Build incrementally:

1. Project setup
2. Database/models
3. Authentication/RBAC
4. Multi-tenancy
5. Leads/webhook/idempotency
6. Pipeline/Socket.IO
7. Client conversion
8. Documents/storage
9. Redis/BullMQ/worker
10. Email/tasks
11. Dashboard
12. Testing/security
13. Deployment
14. Documentation

After each phase:
- run the app
- run tests/type checking
- fix errors
- make a Git commit

Do not generate the entire application blindly in one step.

Inspect existing files before modifying them.

## DOCUMENTATION

Create README.md containing:

- product overview
- architecture
- tech stack
- setup
- environment variables
- database design
- multi-tenancy/security approach
- API overview
- webhook setup
- queue/worker architecture
- deployment
- demo credentials
- testing
- limitations/trade-offs

Create PROMPTS.md and preserve every AI coding prompt exactly as used, in chronological order, including failed prompts.

Do not fabricate prompt history.

## FINAL REQUIREMENT

The final product must be genuinely functional, deployable, secure, and demonstrable end-to-end.

The evaluator should be able to demonstrate:

External webhook
→ Lead
→ Duplicate detection
→ Pipeline
→ Real-time update
→ Client conversion
→ Client login
→ Document upload
→ Background processing
→ Live document result
→ Email trigger
→ Task trigger
→ Dashboard

Do not fake required functionality.

If something is intentionally omitted, document exactly what was omitted and why.

Start by inspecting the existing repository and then create a concise implementation plan before coding.

START BUILDING.
```

---

### Prompt 2: Status & Readiness Verification
**Timestamp**: 2026-09-26T14:00:52+05:30
**Input Prompt**:
```markdown
is the whole implementation ready ?
```

---

### Prompt 3: Step-by-Step Run & Verification Instructions
**Timestamp**: 2026-09-26T14:03:48+05:30
**Input Prompt**:
```markdown
give me step by step instructions to run and check
```


- **Phase 1: Project Setup & Monorepo Initialization**
  - Initialized isolated Git repository in `LeadFlow`.
  - Created root `package.json`, `client/`, and `server/` configurations.
  - Confirmed local MongoDB running on `127.0.0.1:27017`.
  - Installed dependencies for client (Vite, React, TypeScript, TanStack Query, Tailwind CSS, Socket.IO Client) and server (Express, Mongoose, Zod, BullMQ, ioredis, Multer, Nodemailer, Helmet).
  - Designed auto-fallback Redis configuration using embedded `redis-memory-server` to allow zero-hassle dev and test execution even when external standalone Redis is not active.
- **Phase 2: Database Models & Tenant Scoping**
  - Implemented Mongoose models with strict tenant compound indexes: `Brokerage`, `User`, `Lead`, `Client`, `DocumentModel`, `Task`, `EmailTemplate`, and `PipelineStage`.
  - Implemented partial unique compound index `{ brokerageId: 1, externalId: 1 }` for webhook idempotency.
  - Implemented unique index `{ brokerageId: 1, leadId: 1 }` on `Client` to prevent duplicate client conversion.
- **Phase 3 & 4: Authentication, RBAC & Multi-Tenancy Enforcement**
  - Created JWT sign/verify utilities, bcrypt password hashing.
  - Built `authenticate` and `requireRole` middleware enforcing RBAC (`PLATFORM_ADMIN`, `BROKERAGE_ADMIN`, `ADVISOR`, `CLIENT`).
  - Built `enforceTenant` middleware preventing IDOR attacks and cross-tenant access.
  - Built centralized `errorHandler` and Zod validation middleware.
- **Phase 5: Lead Webhook & Deduplication**
  - Implemented `POST /api/webhooks/leads` authenticated via `x-api-key`.
  - Normalization for email (trimmed lowercase) and German phone numbers (`0170...`, `0049...`, spaces/dashes normalized to unified `+49170...`).
  - Deduplicated webhook requests with matching `brokerageId + externalId` returning `200 OK` with `{ deduplicated: true }`.
  - Duplicate person detection via normalized email or phone returning `{ duplicatePersonDetected: true }`.
- **Phase 6: Pipeline & Socket.IO Real-Time**
  - Implemented Kanban stage progression (`NEW`, `CONTACTED`, `QUALIFIED`, `APPLICATION`, `WON`, `LOST`).
  - Stage transitions trigger linked email templates with placeholder rendering (`{{clientName}}`, `{{advisorName}}`, `{{brokerageName}}`) and automated task generation.
  - Real-time Socket.IO broadcasts scoped strictly to tenant rooms (`tenant:${brokerageId}`).
- **Phase 7: Lead to Client Conversion**
  - Implemented `POST /api/clients/convert/:leadId`.
  - Creates `CLIENT` user and `Client` case record, preventing duplicate conversion.
- **Phase 8 & 9: Document Storage, BullMQ & Async Worker**
  - Fast file upload storing binary in object/disk storage with unique storageKey and metadata in MongoDB.
  - Immediate return with status `UPLOADED`.
  - BullMQ queue `document-verification` with retry backoff and worker simulating realistic slow OCR (2-3s delay), error handling, and status transition to `PASSED` or `FAILED`.
  - Real-time updates emitted via Socket.IO to both tenant room and client portal room.
- **Phase 10 & 11: Email & Tasks Automations & Dashboard**
  - Configured email templates with safe failure handling (email outage never breaks core pipeline transition).
  - Automated tasks with due dates and overdue calculation.
  - Dashboard aggregations for total leads, stage breakdown, overdue tasks, and document OCR counts.
- **Phase 12: Automated Testing**
  - Executed 20 Vitest unit/integration tests across 5 test suites.
  - Addressed Vitest parallel test suite collision by setting `fileParallelism: false` and unique tenant slugs per test suite.
  - Fixed Zod email validation pipeline to trim before email format check.
  - 100% tests passing (`20 passed`).
- **Phase 13 & 14: Frontend & Documentation**
  - Built React TypeScript client pages: `LoginPage`, `DashboardPage`, `PipelinePage`, `LeadDetailPage`, `ClientsPage`, `ClientDetailPage`, `TasksPage`, `DocumentsPage`, `EmailTemplatesPage`, `PipelineSettingsPage`, and `ClientPortalPage`.
  - Built interactive `WebhookSimulatorModal` for 1-click external lead testing with presets.
  - Created Dockerfile, Nginx configuration, and `docker-compose.yml`.
  - Created comprehensive `README.md`.

---

### Prompt 4: Root concurrently command fix
**Timestamp**: 2026-09-26T14:07:20+05:30
**Input Prompt**:
```markdown
fix this: PS C:\Users\arti0\OneDrive\Desktop\LeadFlow> npm run dev

> leadflow@1.0.0 dev
> concurrently -n "SERVER,WORKER,CLIENT" -c "blue,green,magenta" "npm run dev:server" "npm run dev:worker" "npm run dev:client"       

'concurrently' is not recognized as an internal or external command,
operable program or batch file.
```

---

### Prompt 5: Database Inspection & Data Visibility
**Timestamp**: 2026-09-26T14:21:41+05:30
**Input Prompt**:
```markdown
excellent, now it is working, now tell me where can I see my data ? which database you used and how to see it ?
```

---

### Prompt 6: End-to-End Workflow Verification from External Sources
**Timestamp**: 2026-09-27T13:48:42+05:30
**Input Prompt**:
```markdown
The assignment says leads arrive from web forms, ad platforms, booking tools, and partner links, and that LeadFlow should receive leads automatically, is this functionality working ? is this flow flollwong ? Potential customer
       ↓
Website / external lead form
       ↓
LeadFlow webhook
       ↓
Lead created
       ↓
Advisor pipeline
       ↓
Advisor contacts customer
       ↓
Lead → Client
       ↓
Client gets login
       ↓
Documents uploaded
       ↓
Background checking
```

---

### Prompt 7: GitHub Repository Deployment & Commit History
**Timestamp**: 2026-09-27T14:02:16+05:30
**Input Prompt**:
```markdown
Now i want to deploy this project to the github repository with its full commit history (if not done already)
```

---

### Prompt 8: Git Push Non-Fast-Forward Error Resolution
**Timestamp**: 2026-09-27T14:14:12+05:30
**Input Prompt**:
```markdown
I am getting error, help me resolve this by guiding me
[Image: git push rejected: Updates were rejected because the remote contains work that you do not have locally]
```

---

### Prompt 9: Full Production Cloud Deployment Guide
**Timestamp**: 2026-09-27T14:18:35+05:30
**Input Prompt**:
```markdown
```

---

### Prompt 10: MongoDB Atlas Driver Selection
**Timestamp**: 2026-09-27T14:27:16+05:30
**Input Prompt**:
```markdown
what should i select here ?
[Image: MongoDB Atlas Connect to Cluster0 modal with options: "Drivers and Client Libraries", "Compass", "Shell", "MongoDB for VS Code", "Atlas SQL"]
```

---

### Prompt 11: Render TypeScript TS5108 Build Failure Resolution
**Timestamp**: 2026-09-27T15:02:50+05:30
**Input Prompt**:
```markdown
what to do here ? help me
[Image: Render deployment build failed with error: tsconfig.json(5,25): error TS5108: Option 'moduleResolution=node10' has been removed. Please remove it from your configuration.]
```









