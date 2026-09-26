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
