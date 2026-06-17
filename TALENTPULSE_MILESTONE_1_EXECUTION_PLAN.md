# TalentPulse Milestone 1 Execution Plan

Milestone: Secure Multi-Tenant Foundation

Duration: 4 weeks

Goal:

Transform the current TalentPulse Next.js and Prisma application from a mostly single-tenant recruitment MVP into a secure multi-tenant foundation that can support organizations, workspaces, tenant-scoped data access, configurable roles, and safe future expansion.

Scope boundary:

This milestone only covers the multi-tenant foundation. It does not implement Knowledge Vault, Talent Graph, agent framework, AI cost governance, revenue intelligence, risk intelligence, marketplace, public APIs, SSO, SCIM, or new UI experiences beyond the minimum workspace/tenant context needed to keep the current app usable.

No application code, Prisma schema, migrations, or UI are modified by this document.

## 1. Exact Schema Changes

The current schema has global users, fixed roles, global clients, globally unique candidates, fixed pipeline stages, and tenant-owned records without `organizationId` or `workspaceId`. Milestone 1 must add tenant ownership without breaking current workflows.

### 1.1 New Enums

Add these enums:

```prisma
enum OrganizationType {
  AGENCY
  STAFFING_FIRM
  EXECUTIVE_SEARCH
  GCC
  ENTERPRISE
  RPO
  OTHER
}

enum TenantStatus {
  ACTIVE
  SUSPENDED
  ARCHIVED
}

enum WorkspaceType {
  DEFAULT
  BUSINESS_UNIT
  GEOGRAPHY
  CLIENT_TEAM
  HIRING_TEAM
  OTHER
}

enum MembershipStatus {
  ACTIVE
  INVITED
  SUSPENDED
  REMOVED
}

enum RoleScope {
  PLATFORM
  ORGANIZATION
  WORKSPACE
}
```

Keep the current `UserRole` enum during Milestone 1 for compatibility. Do not remove `ADMIN`, `RECRUITER`, `CLIENT`, or `CANDIDATE` yet.

### 1.2 New Models

Add `Organization`.

Fields:

- `id String @id @default(cuid())`
- `name String`
- `slug String @unique`
- `type OrganizationType @default(AGENCY)`
- `status TenantStatus @default(ACTIVE)`
- `region String?`
- `defaultCurrency String @default("INR")`
- `timezone String @default("Asia/Kolkata")`
- `securityPolicy Json?`
- `dataRetentionPolicy Json?`
- `modelProviderPolicy Json?`
- `createdAt DateTime @default(now())`
- `updatedAt DateTime @updatedAt`

Indexes:

- `@@index([status])`
- `@@index([type, region])`

Add `Workspace`.

Fields:

- `id String @id @default(cuid())`
- `organizationId String`
- `organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)`
- `name String`
- `slug String`
- `type WorkspaceType @default(DEFAULT)`
- `status TenantStatus @default(ACTIVE)`
- `configuration Json?`
- `createdAt DateTime @default(now())`
- `updatedAt DateTime @updatedAt`

Indexes:

- `@@unique([organizationId, slug])`
- `@@index([organizationId, status])`

Add `Role`.

Fields:

- `id String @id @default(cuid())`
- `organizationId String?`
- `organization Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)`
- `name String`
- `systemKey String`
- `scope RoleScope @default(ORGANIZATION)`
- `isSystemRole Boolean @default(false)`
- `description String?`
- `createdAt DateTime @default(now())`
- `updatedAt DateTime @updatedAt`

Indexes:

- `@@unique([organizationId, systemKey])`
- `@@index([organizationId, scope])`

Add `Permission`.

Fields:

- `id String @id @default(cuid())`
- `key String @unique`
- `resource String`
- `action String`
- `description String?`
- `createdAt DateTime @default(now())`

Indexes:

- `@@index([resource, action])`

Add `RolePermission`.

Fields:

- `id String @id @default(cuid())`
- `roleId String`
- `role Role @relation(fields: [roleId], references: [id], onDelete: Cascade)`
- `permissionId String`
- `permission Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)`
- `conditions Json?`
- `createdAt DateTime @default(now())`

Indexes:

- `@@unique([roleId, permissionId])`
- `@@index([permissionId])`

Add `OrganizationMembership`.

Fields:

- `id String @id @default(cuid())`
- `organizationId String`
- `organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)`
- `userId String`
- `user User @relation(fields: [userId], references: [id], onDelete: Cascade)`
- `roleId String`
- `role Role @relation(fields: [roleId], references: [id])`
- `status MembershipStatus @default(ACTIVE)`
- `joinedAt DateTime @default(now())`
- `createdAt DateTime @default(now())`
- `updatedAt DateTime @updatedAt`

Indexes:

- `@@unique([organizationId, userId])`
- `@@index([organizationId, roleId])`
- `@@index([userId])`
- `@@index([status])`

Add `WorkspaceMembership`.

Fields:

- `id String @id @default(cuid())`
- `organizationId String`
- `organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)`
- `workspaceId String`
- `workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)`
- `userId String`
- `user User @relation(fields: [userId], references: [id], onDelete: Cascade)`
- `roleId String`
- `role Role @relation(fields: [roleId], references: [id])`
- `status MembershipStatus @default(ACTIVE)`
- `createdAt DateTime @default(now())`
- `updatedAt DateTime @updatedAt`

Indexes:

- `@@unique([workspaceId, userId])`
- `@@index([organizationId, userId])`
- `@@index([workspaceId, roleId])`
- `@@index([status])`

Add `TenantAuditLog`.

Purpose:

Capture Milestone 1 security-critical tenant activity. This is not the full event store from later milestones.

Fields:

- `id String @id @default(cuid())`
- `organizationId String?`
- `workspaceId String?`
- `actorUserId String?`
- `action String`
- `resourceType String`
- `resourceId String?`
- `permissionDecision String?`
- `ipAddress String?`
- `userAgent String?`
- `requestId String?`
- `metadata Json?`
- `createdAt DateTime @default(now())`

Indexes:

- `@@index([organizationId, createdAt])`
- `@@index([organizationId, actorUserId, createdAt])`
- `@@index([organizationId, resourceType, resourceId])`
- `@@index([requestId])`

### 1.3 User Model Changes

Add:

- `defaultOrganizationId String?`
- `defaultWorkspaceId String?`
- Relations to `OrganizationMembership` and `WorkspaceMembership`

Keep:

- `role UserRole`
- `clientId`
- `candidateId`

Reason:

The current app depends on `role`, `clientId`, and `candidateId` in the NextAuth JWT and route guards. Removing them in Milestone 1 would create avoidable migration risk.

### 1.4 Tenant Columns To Add To Existing Models

Add `organizationId String?` and `workspaceId String?` to these models in the first additive migration. They become required only after backfill and code enforcement.

Core operations:

- `Client`
- `Job`
- `Candidate`
- `Project`
- `Application`
- `Interview`
- `Offer`
- `Prospect`

Sourcing and platform:

- `JobPosting`
- `PlatformSubscription`
- `IntegrationSetting`
- `NaukriImport`
- `NaukriCandidate`
- `SavedSearch`

Communication:

- `VoiceScreening`
- `WhatsAppTemplate`
- `WhatsAppMessage`
- `EmailCampaign`
- `CampaignRecipient`
- `CalendarConnection`
- `EmailTemplate`
- `EmailLog`

Activity and notes:

- `Note`
- `ActivityLog`

Company profile:

- `CompanyProfile`

Do not add `organizationId` to `RecruitingPlatform` in Milestone 1. Treat it as a global platform catalog. Tenant-specific usage belongs to `PlatformSubscription`.

### 1.5 Tenant Relations To Add To Existing Models

For each tenant-owned model above, add:

- `organization Organization? @relation(fields: [organizationId], references: [id])`
- `workspace Workspace? @relation(fields: [workspaceId], references: [id])`

Use nullable relations in the additive migration, then convert to required after backfill.

### 1.6 Tenant Indexes To Add

Add these indexes:

User:

- `@@index([defaultOrganizationId])`
- `@@index([defaultWorkspaceId])`

Client:

- `@@index([organizationId, isActive])`
- `@@index([organizationId, name])`

Job:

- `@@index([organizationId, workspaceId, status])`
- `@@index([organizationId, clientId, status])`
- `@@index([organizationId, recruiterId, status])`

Candidate:

- `@@index([organizationId, workspaceId])`
- `@@index([organizationId, email])`
- `@@index([organizationId, phone])`
- `@@index([organizationId, source])`
- `@@index([organizationId, ownerId])`

Project:

- `@@index([organizationId, candidateId])`

Application:

- `@@index([organizationId, workspaceId, stage])`
- `@@index([organizationId, jobId, stage])`
- `@@index([organizationId, candidateId])`

Interview:

- `@@index([organizationId, workspaceId, scheduledAt])`
- `@@index([organizationId, applicationId])`
- `@@index([organizationId, candidateId])`

Offer:

- `@@index([organizationId, workspaceId, status])`
- `@@index([organizationId, applicationId])`
- `@@index([organizationId, candidateId])`

JobPosting:

- `@@index([organizationId, workspaceId, status])`
- `@@index([organizationId, jobId])`
- `@@index([organizationId, platformId])`

PlatformSubscription:

- `@@index([organizationId, workspaceId, isActive])`
- `@@index([organizationId, recruiterId])`
- `@@index([organizationId, platformId])`

IntegrationSetting:

- `@@index([organizationId, workspaceId, isActive])`

VoiceScreening:

- `@@index([organizationId, workspaceId, callStatus])`
- `@@index([organizationId, candidateId])`
- `@@index([organizationId, applicationId])`

WhatsAppTemplate:

- `@@index([organizationId, workspaceId, isApproved])`

WhatsAppMessage:

- `@@index([organizationId, workspaceId, status])`
- `@@index([organizationId, candidateId])`
- `@@index([organizationId, phoneNumber])`

EmailCampaign:

- `@@index([organizationId, workspaceId, status])`
- `@@index([organizationId, createdById])`

CampaignRecipient:

- `@@index([organizationId, campaignId])`

CalendarConnection:

- `@@index([organizationId, userId])`

Note:

- `@@index([organizationId, workspaceId, candidateId])`

ActivityLog:

- `@@index([organizationId, workspaceId, createdAt])`
- `@@index([organizationId, entityType, entityId])`
- `@@index([organizationId, userId, createdAt])`

EmailTemplate:

- `@@index([organizationId, workspaceId, category])`

EmailLog:

- `@@index([organizationId, candidateId])`
- `@@index([organizationId, senderId])`

NaukriImport:

- `@@index([organizationId, workspaceId, userId])`
- `@@index([organizationId, createdAt])`

NaukriCandidate:

- `@@index([organizationId, importId])`
- `@@index([organizationId, status])`
- `@@index([organizationId, matchedJobId])`

Prospect:

- `@@index([organizationId, workspaceId, status])`
- `@@index([organizationId, email])`
- `@@index([organizationId, phone])`
- `@@index([organizationId, source])`
- `@@index([organizationId, ownerId])`

SavedSearch:

- `@@index([organizationId, workspaceId, userId])`

CompanyProfile:

- `@@index([organizationId])`

### 1.7 Unique Constraint Changes

Milestone 1 must transition from global uniqueness to tenant-scoped uniqueness in two steps.

Step A: Add new tenant-scoped unique constraints while keeping old constraints.

Add:

- `Client`: `@@unique([organizationId, name])`
- `Candidate`: `@@unique([organizationId, email])`
- `IntegrationSetting`: `@@unique([organizationId, workspaceId, provider])`
- `WhatsAppTemplate`: `@@unique([organizationId, name])`
- `EmailTemplate`: `@@unique([organizationId, name])`
- `PlatformSubscription`: `@@unique([organizationId, platformId, recruiterId])`
- `CalendarConnection`: `@@unique([organizationId, userId, provider])`
- `CompanyProfile`: `@@unique([organizationId])`

Step B: After all code paths use tenant-scoped lookup, remove old global unique constraints:

- `Client.name @unique`
- `Candidate.email @unique`
- `IntegrationSetting.provider @unique`
- `WhatsAppTemplate.name @unique`
- `EmailTemplate.name @unique`
- `PlatformSubscription @@unique([platformId, recruiterId])`
- `CalendarConnection @@unique([userId, provider])`

Do not remove `User.email @unique` in Milestone 1. User identity remains global.

### 1.8 Required Field Enforcement

At the end of Milestone 1, `organizationId` must be required for all tenant-owned models.

`workspaceId` should be required for workspace-scoped operational models:

- `Job`
- `Candidate`
- `Project`
- `Application`
- `Interview`
- `Offer`
- `Prospect`
- `JobPosting`
- `PlatformSubscription`
- `IntegrationSetting`
- `NaukriImport`
- `NaukriCandidate`
- `SavedSearch`
- `VoiceScreening`
- `WhatsAppTemplate`
- `WhatsAppMessage`
- `EmailCampaign`
- `CampaignRecipient`
- `CalendarConnection`
- `Note`
- `ActivityLog`
- `EmailTemplate`
- `EmailLog`

`Client` and `CompanyProfile` may be organization-scoped in Milestone 1, with optional `workspaceId`, because clients may be shared across workspaces later.

## 2. Exact Prisma Migration Sequence

Use four controlled migration waves. Do not combine them into one large risky migration.

### Migration 001: `001_tenant_foundation_additive`

Purpose:

Add new tenant foundation tables and nullable tenant columns without changing current application behavior.

Schema actions:

1. Add new enums:
   - `OrganizationType`
   - `TenantStatus`
   - `WorkspaceType`
   - `MembershipStatus`
   - `RoleScope`
2. Add new models:
   - `Organization`
   - `Workspace`
   - `Role`
   - `Permission`
   - `RolePermission`
   - `OrganizationMembership`
   - `WorkspaceMembership`
   - `TenantAuditLog`
3. Add nullable `organizationId` and `workspaceId` to tenant-owned models.
4. Add nullable `defaultOrganizationId` and `defaultWorkspaceId` to `User`.
5. Add non-unique tenant indexes listed in section 1.6.

Development command:

```bash
npx prisma migrate dev --name 001_tenant_foundation_additive
```

Production command:

```bash
npx prisma migrate deploy
```

Validation:

```bash
npx prisma generate
npx prisma validate
npm run build
```

### Migration 002: `002_seed_default_tenant_and_backfill`

Purpose:

Create the default tenant and attach all existing records to it.

Data actions:

1. Create default organization:
   - `name`: from `CompanyProfile.name` if available, else `CareerPaths India`
   - `slug`: `careerpaths`
   - `type`: `AGENCY`
   - `status`: `ACTIVE`
   - `region`: `IN`
   - `defaultCurrency`: `INR`
   - `timezone`: `Asia/Kolkata`
2. Create default workspace:
   - `name`: `Default Workspace`
   - `slug`: `default`
   - `type`: `DEFAULT`
   - `status`: `ACTIVE`
3. Create system permissions from the Milestone 1 permission catalog.
4. Create default roles:
   - `organization_admin`
   - `recruiter`
   - `client`
   - `candidate`
5. Map existing users:
   - `ADMIN` -> organization admin role
   - `RECRUITER` -> recruiter role
   - `CLIENT` -> client role
   - `CANDIDATE` -> candidate role
6. Create `OrganizationMembership` for every active user.
7. Create `WorkspaceMembership` for every active `ADMIN` and `RECRUITER`.
8. Create `WorkspaceMembership` for `CLIENT` and `CANDIDATE` users only if the current portal requires workspace-scoped access.
9. Set `User.defaultOrganizationId` and `User.defaultWorkspaceId`.
10. Backfill `organizationId` and `workspaceId` across all tenant-owned models.

Backfill order:

1. `Organization`, `Workspace`, `Role`, `Permission`, `RolePermission`
2. `User`
3. `Client`, `Candidate`, `Prospect`
4. `Job`
5. `Application`
6. `Project`, `Interview`, `Offer`
7. `JobPosting`, `PlatformSubscription`, `IntegrationSetting`
8. `VoiceScreening`, `WhatsAppTemplate`, `WhatsAppMessage`
9. `EmailCampaign`, `CampaignRecipient`, `CalendarConnection`
10. `Note`, `ActivityLog`, `EmailTemplate`, `EmailLog`
11. `NaukriImport`, `NaukriCandidate`, `SavedSearch`
12. `CompanyProfile`

Implementation requirement:

Use an idempotent script, not hand-written one-off SQL in production. The script must be safe to rerun and must report counts before and after update.

Recommended script name:

```text
scripts/backfill-milestone-1-tenant.ts
```

Validation query expectations:

- Every tenant-owned row has `organizationId`.
- Every workspace-scoped row has `workspaceId`.
- Every user has exactly one active organization membership.
- Every admin/recruiter has at least one active workspace membership.
- Existing row counts are unchanged.

### Migration 003: `003_enforce_tenant_required_and_scoped_indexes`

Purpose:

Make tenant ownership enforceable after code is tenant-aware and backfill is complete.

Preconditions:

- All Milestone 1 APIs use tenant context.
- All tenant-owned rows are backfilled.
- Staging has passed tenant isolation tests.

Schema actions:

1. Convert `organizationId` to required on tenant-owned models.
2. Convert `workspaceId` to required on workspace-scoped models.
3. Add foreign key constraints to `Organization` and `Workspace`.
4. Add tenant-scoped unique constraints:
   - `Client @@unique([organizationId, name])`
   - `Candidate @@unique([organizationId, email])`
   - `IntegrationSetting @@unique([organizationId, workspaceId, provider])`
   - `WhatsAppTemplate @@unique([organizationId, name])`
   - `EmailTemplate @@unique([organizationId, name])`
   - `PlatformSubscription @@unique([organizationId, platformId, recruiterId])`
   - `CalendarConnection @@unique([organizationId, userId, provider])`
   - `CompanyProfile @@unique([organizationId])`
5. Add required relation fields in Prisma model definitions.

Development command:

```bash
npx prisma migrate dev --name 003_enforce_tenant_required_and_scoped_indexes
```

Production command:

```bash
npx prisma migrate deploy
```

### Migration 004: `004_remove_global_uniqueness_after_tenant_cutover`

Purpose:

Remove old global uniqueness only after the application fully uses tenant-scoped lookups.

Preconditions:

- Tenant enforcement feature flag is enabled in production.
- No route uses global candidate email, client name, integration provider, WhatsApp template name, or email template name lookup without organization scope.
- Production monitoring shows no tenant-scope errors for at least 48 hours.

Schema actions:

1. Remove `@unique` from `Client.name`.
2. Remove `@unique` from `Candidate.email`.
3. Remove `@unique` from `IntegrationSetting.provider`.
4. Remove `@unique` from `WhatsAppTemplate.name`.
5. Remove `@unique` from `EmailTemplate.name`.
6. Remove old non-tenant `PlatformSubscription @@unique([platformId, recruiterId])`.
7. Remove old non-tenant `CalendarConnection @@unique([userId, provider])`.

Development command:

```bash
npx prisma migrate dev --name 004_remove_global_uniqueness_after_tenant_cutover
```

Production command:

```bash
npx prisma migrate deploy
```

Rollback sensitivity:

This is the hardest migration to roll back because duplicate values may appear across tenants after this point. Do not run Migration 004 until the system has operated successfully with tenant enforcement.

## 3. APIs To Modify

All modified APIs must resolve tenant context before querying data.

Tenant context requirements:

- Resolve current user through `requireUser`.
- Resolve active organization from `User.defaultOrganizationId`, request header, route context, or membership.
- Resolve active workspace from `User.defaultWorkspaceId`, request header, route context, or membership.
- Verify active membership.
- Apply organization and workspace filters server-side.
- Write `organizationId` and `workspaceId` on creates.
- Reject cross-tenant IDs even if a valid record ID is provided.

### 3.1 Auth And Guard APIs

Modify:

- `app/api/auth/[...nextauth]/route.ts`
- `lib/auth.ts`
- `lib/guards.ts`

Required changes:

- Add `organizationId`, `workspaceId`, `organizationRole`, and `workspaceRole` to JWT/session.
- Preserve current `role`, `clientId`, and `candidateId`.
- Add `requireTenantUser`.
- Add `requireTenantRole`.
- Add `requirePermission`.
- Add membership lookup and active tenant validation.

### 3.2 Core Candidate APIs

Modify:

- `app/api/candidates/route.ts`
- `app/api/candidates/[id]/route.ts`
- `app/api/candidates/[id]/notes/route.ts`
- `app/api/candidates/[id]/projects/route.ts`

Required changes:

- Scope list/search by `organizationId` and `workspaceId`.
- Create candidates with tenant IDs.
- Replace global duplicate check by email with tenant-scoped duplicate check.
- Verify candidate belongs to tenant before read/update/delete.
- Create projects and notes with tenant IDs.

### 3.3 Client APIs

Modify:

- `app/api/clients/route.ts`
- `app/api/clients/[id]/route.ts`

Required changes:

- Scope clients by `organizationId`.
- Create clients with `organizationId`.
- If `workspaceId` remains optional for clients, support workspace filtering without hiding organization-shared clients.
- Replace global client name uniqueness with tenant-scoped uniqueness.

### 3.4 Job And Application APIs

Modify:

- `app/api/jobs/route.ts`
- `app/api/jobs/[id]/route.ts`
- `app/api/applications/route.ts`
- `app/api/applications/[id]/route.ts`

Required changes:

- Scope jobs and applications by tenant.
- Create jobs with `organizationId` and `workspaceId`.
- Ensure referenced `clientId`, `candidateId`, `jobId`, `recruiterId`, and `createdById` belong to the tenant.
- Preserve client portal filtering by `clientId`, but only after tenant validation.
- Preserve candidate portal filtering by `candidateId`, but only after tenant validation.

### 3.5 Interviews And Offers APIs

Modify:

- `app/api/interviews/route.ts`
- `app/api/interviews/[id]/route.ts`
- `app/api/offers/route.ts`
- `app/api/offers/[id]/route.ts`

Required changes:

- Scope all reads and writes by `organizationId` and `workspaceId`.
- Verify related application/candidate/job belongs to tenant.
- Prevent clients or candidates from seeing records outside their scoped relationship.

### 3.6 Analytics And Reports APIs

Modify:

- `app/api/analytics/route.ts`
- `app/api/reports/route.ts`
- `app/api/call-analytics/route.ts`

Required changes:

- Add tenant filters to every count, groupBy, findMany, and aggregate.
- Client users remain restricted to their tenant and their `clientId`.
- Recruiter users remain restricted to their tenant and, where current behavior requires it, their own assigned jobs/candidates.
- Report exports must include tenant audit logging.

### 3.7 Search, Sourcing, And Naukri APIs

Modify:

- `app/api/search/route.ts`
- `app/api/search/web/route.ts`
- `app/api/search/github/route.ts`
- `app/api/search/import/route.ts`
- `app/api/saved-searches/route.ts`
- `app/api/naukri-assistant/route.ts`
- `app/api/naukri-assistant/[id]/route.ts`
- `app/api/naukri-assistant/parse/route.ts`
- `app/api/naukri-assistant/match/route.ts`
- `app/api/naukri-assistant/import-to-pipeline/route.ts`

Required changes:

- Scope saved searches, imports, parsed candidates, matched jobs, and pipeline imports by tenant.
- Ensure imported candidates/jobs/applications all share the same tenant.
- Do not expose global Naukri import data across users or workspaces.

### 3.8 Communication APIs

Modify:

- `app/api/whatsapp/templates/route.ts`
- `app/api/whatsapp/templates/[id]/route.ts`
- `app/api/whatsapp/messages/route.ts`
- `app/api/whatsapp/send/route.ts`
- `app/api/voice-screening/route.ts`
- `app/api/voice-screening/[id]/route.ts`
- `app/api/voice-screening/fetch-transcript/route.ts`
- `app/api/voice-screening/callback/route.ts`
- `app/api/voice-screening/webhook/route.ts`
- `app/api/voice-screening/twiml/route.ts`
- `app/api/voice-screening/debug/route.ts`
- `app/api/voice-screening/send-jd-email/route.ts`
- `app/api/email/send/route.ts`
- `app/api/email-campaigns/route.ts`
- `app/api/email-campaigns/[id]/route.ts`
- `app/api/email-campaigns/[id]/send/route.ts`
- `app/api/email-campaigns/ai-draft/route.ts`
- `app/api/email-templates/route.ts`
- `app/api/email-templates/[id]/route.ts`

Required changes:

- Scope all templates, messages, campaigns, voice screenings, and email logs by tenant.
- Provider callbacks must resolve tenant from stored screening/message IDs, not from user session.
- Integration credentials must be loaded from tenant-scoped `IntegrationSetting`.

### 3.9 Integration And Platform APIs

Modify:

- `app/api/integrations/route.ts`
- `app/api/integrations/[provider]/route.ts`
- `app/api/integrations/test/route.ts`
- `app/api/platforms/route.ts`
- `app/api/platforms/[id]/route.ts`
- `app/api/platform-subscriptions/route.ts`
- `app/api/platform-subscriptions/[id]/route.ts`
- `app/api/job-postings/route.ts`
- `app/api/job-postings/[id]/route.ts`

Required changes:

- Keep `RecruitingPlatform` globally readable as a catalog.
- Scope subscriptions, credentials, tests, and job postings by tenant.
- Ensure tenant admin permission before viewing or editing credentials.

### 3.10 Team, Signup, Upload, Company Profile, And AI APIs

Modify:

- `app/api/team/route.ts`
- `app/api/team/[id]/route.ts`
- `app/api/signup/route.ts`
- `app/api/company-profile/route.ts`
- `app/api/upload/presigned/route.ts`
- `app/api/upload/download/route.ts`
- `app/api/ai/screen/route.ts`
- `app/api/ai/parse-resume/route.ts`
- `app/api/ai/parse-jd/route.ts`
- `app/api/copilot/chat/route.ts`

Required changes:

- Team APIs manage memberships, not only users.
- Signup creates or joins an organization based on business rules.
- Company profile becomes tenant-scoped.
- Upload keys must include organization/workspace prefixes.
- AI APIs must fetch only tenant-scoped candidate/job/application data.
- Copilot must not retrieve or include cross-tenant context.

## 4. Pages To Modify

Milestone 1 UI changes are limited to tenant awareness and access safety. Do not redesign the product.

### 4.1 Layout And Navigation

Modify:

- `app/admin/layout.tsx`
- `app/recruiter/layout.tsx`
- `app/client-portal/layout.tsx`
- `app/candidate-portal/layout.tsx`
- `components/workspace/workspace-shell.tsx`

Required changes:

- Read tenant context from session.
- Show active organization/workspace where useful.
- Hide navigation items that the current membership/role cannot access.
- Redirect users without active membership to login or a no-access page.

### 4.2 Admin Pages

Modify:

- `app/admin/page.tsx`
- `app/admin/team/page.tsx`
- `app/admin/team/team-client.tsx`
- `app/admin/settings/page.tsx`
- `app/admin/settings/company-profile-client.tsx`
- `app/admin/settings/integrations-client.tsx`
- `app/admin/analytics/page.tsx`
- `app/admin/reports/page.tsx`
- `app/admin/candidates/page.tsx`
- `app/admin/candidates/[id]/page.tsx`
- `app/admin/clients/page.tsx`
- `app/admin/jobs/page.tsx`
- `app/admin/jobs/[id]/page.tsx`
- `app/admin/pipeline/page.tsx`
- `app/admin/interviews/page.tsx`
- `app/admin/platforms/page.tsx`
- `app/admin/naukri-assistant/page.tsx`
- `app/admin/voice-screening/page.tsx`
- `app/admin/whatsapp/page.tsx`

Required changes:

- Fetch only tenant-scoped data.
- Team page manages organization/workspace memberships.
- Settings page saves tenant-scoped company profile and integrations.
- Reports and analytics must display tenant-scoped numbers only.

### 4.3 Recruiter Pages

Modify:

- `app/recruiter/page.tsx`
- `app/recruiter/candidates/page.tsx`
- `app/recruiter/candidates/[id]/page.tsx`
- `app/recruiter/candidates/new/page.tsx`
- `app/recruiter/jobs/page.tsx`
- `app/recruiter/jobs/[id]/page.tsx`
- `app/recruiter/pipeline/page.tsx`
- `app/recruiter/interviews/page.tsx`
- `app/recruiter/prospects/page.tsx`
- `app/recruiter/naukri-assistant/page.tsx`
- `app/recruiter/platforms/page.tsx`
- `app/recruiter/templates/page.tsx`
- `app/recruiter/voice-screening/page.tsx`
- `app/recruiter/whatsapp/page.tsx`
- `app/recruiter/copilot/page.tsx`
- `app/recruiter/advanced-search/page.tsx`
- `app/recruiter/sourcing-intelligence/page.tsx`

Required changes:

- Fetch by active tenant and recruiter permissions.
- Preserve current recruiter UX.
- Prevent direct-link access to another tenant's records.

### 4.4 Client Portal Pages

Modify:

- `app/client-portal/page.tsx`
- `app/client-portal/jobs/page.tsx`
- `app/client-portal/pipeline/page.tsx`
- `app/client-portal/interviews/page.tsx`
- `app/client-portal/analytics/page.tsx`

Required changes:

- Scope by tenant and `clientId`.
- Prevent client users from seeing other clients in the same tenant.
- Preserve current client portal workflows.

### 4.5 Candidate Portal Pages

Modify:

- `app/candidate-portal/page.tsx`
- `app/candidate-portal/profile/page.tsx`
- `app/candidate-portal/interviews/page.tsx`

Required changes:

- Scope by tenant and `candidateId`.
- Prevent candidate users from seeing other candidate records.
- Preserve current candidate portal workflows.

## 5. Backfill Strategy

### 5.1 Backfill Principles

- Backfill must be idempotent.
- Backfill must not delete records.
- Backfill must not change business data.
- Backfill must preserve current login behavior.
- Backfill must create one default organization and one default workspace for all existing data.
- Backfill must produce a count report.

### 5.2 Default Tenant Creation

Default organization:

- Use `CompanyProfile.name` if present.
- Fallback name: `CareerPaths India`
- Slug: `careerpaths`
- Type: `AGENCY`
- Region: `IN`
- Currency: `INR`
- Timezone: `Asia/Kolkata`

Default workspace:

- Name: `Default Workspace`
- Slug: `default`
- Type: `DEFAULT`

### 5.3 User And Membership Backfill

For each user:

- Set `defaultOrganizationId` to the default organization.
- Set `defaultWorkspaceId` to the default workspace.
- Create one active `OrganizationMembership`.
- Create one active `WorkspaceMembership` for admin and recruiter users.
- Preserve `clientId` and `candidateId`.

Role mapping:

- `ADMIN` -> `organization_admin`
- `RECRUITER` -> `recruiter`
- `CLIENT` -> `client`
- `CANDIDATE` -> `candidate`

### 5.4 Data Backfill Rules

Set default `organizationId` and `workspaceId` on:

- Candidates and related projects, notes, applications, interviews, offers, voice screenings, WhatsApp messages, email logs, Naukri candidates.
- Clients and jobs.
- Prospects and converted candidate links.
- Job postings and platform subscriptions.
- Integration settings.
- Email campaigns, campaign recipients, templates.
- Saved searches.
- Activity logs.
- Company profile.

Derive child tenant values from parent where possible:

- `Project` from `Candidate`
- `Application` from `Job` and `Candidate`
- `Interview` from `Application`
- `Offer` from `Application`
- `JobPosting` from `Job`
- `CampaignRecipient` from `EmailCampaign`
- `NaukriCandidate` from `NaukriImport`
- `VoiceScreening` from `Application`
- `WhatsAppMessage` from `Candidate` when available, else default workspace
- `EmailLog` from `Candidate` when available, else sender/default workspace

### 5.5 Backfill Validation Report

The backfill script must print and store:

- Organization count
- Workspace count
- User count
- Membership count
- Row counts per tenant-owned table before and after
- Count of rows still missing `organizationId`
- Count of workspace-scoped rows still missing `workspaceId`
- Duplicate candidate emails per organization
- Duplicate client names per organization
- Duplicate integration providers per organization/workspace
- Any orphaned relationship IDs discovered

Backfill passes only when all required missing-count checks are zero.

## 6. Rollback Strategy

### 6.1 Feature Rollback

Use a tenant enforcement feature flag.

Recommended flags:

- `TENANT_CONTEXT_ENABLED`
- `TENANT_ENFORCEMENT_ENABLED`
- `TENANT_SCOPED_UNIQUES_ENABLED`

Rollback path:

1. Disable `TENANT_ENFORCEMENT_ENABLED`.
2. Keep reading legacy `role`, `clientId`, and `candidateId`.
3. Keep tenant columns populated but do not require them in route guards.
4. Continue logging tenant resolution errors.

### 6.2 Migration Rollback

Migration 001 rollback:

- Safe to roll back before data is written to new tables.
- If already deployed, prefer leaving additive tables and columns unused instead of dropping them.

Migration 002 rollback:

- Do not delete backfilled tenant data immediately.
- Disable tenant enforcement and keep default organization/workspace records.
- If required, restore from pre-backfill database snapshot.

Migration 003 rollback:

- Highest operational risk because fields become required.
- Roll back by restoring the database snapshot taken immediately before Migration 003.
- Do not attempt manual nullability rollback in production unless snapshot restore is impossible.

Migration 004 rollback:

- Restore from snapshot if global uniqueness must be restored.
- Do not re-add global unique constraints after cross-tenant duplicates may have been created.

### 6.3 Data Backup Requirements

Before each production migration:

- Take full database snapshot.
- Export schema.
- Export row counts for all tenant-owned tables.
- Export duplicate checks for candidate email, client name, integration provider, WhatsApp template, email template.
- Record deployed commit SHA and Prisma migration hash.

### 6.4 Operational Rollback Criteria

Rollback if any of these occur:

- Users cannot log in.
- Admin cannot access dashboard.
- Candidate/job/application list returns materially incorrect counts.
- Client portal exposes data from another client or tenant.
- Candidate portal exposes another candidate.
- More than 1 percent of core API requests fail due to tenant context.
- Any suspected cross-tenant data leak occurs.

## 7. Test Cases

### 7.1 Schema And Migration Tests

Test cases:

1. Migration 001 applies cleanly to an empty database.
2. Migration 001 applies cleanly to a populated staging copy.
3. Backfill creates exactly one default organization and workspace.
4. Backfill is idempotent when run twice.
5. All users receive organization memberships.
6. Admin and recruiter users receive workspace memberships.
7. Every tenant-owned row has `organizationId`.
8. Every workspace-scoped row has `workspaceId`.
9. Row counts are unchanged after backfill.
10. Tenant-scoped unique constraints apply successfully.
11. Required tenant columns can be enforced after backfill.

### 7.2 Auth And Permission Tests

Test cases:

1. Admin login returns session with organization and workspace context.
2. Recruiter login returns session with organization and workspace context.
3. Client login preserves `clientId` and tenant context.
4. Candidate login preserves `candidateId` and tenant context.
5. User without active membership is denied access.
6. Suspended organization blocks login or app access.
7. Suspended workspace blocks workspace-scoped access.
8. Admin can access admin routes within tenant.
9. Recruiter cannot access admin-only tenant settings.
10. Client cannot access recruiter/admin records.
11. Candidate cannot access another candidate.

### 7.3 API Tenant Isolation Tests

Create two organizations in test data:

- Organization A
- Organization B

For every high-risk API:

1. User from Organization A cannot list Organization B records.
2. User from Organization A cannot fetch Organization B record by ID.
3. User from Organization A cannot update Organization B record by ID.
4. Create requests always write Organization A tenant IDs.
5. Nested includes do not leak Organization B records.
6. Analytics and reports count only Organization A records.

High-risk APIs:

- Candidates
- Clients
- Jobs
- Applications
- Interviews
- Offers
- Reports
- Analytics
- Search
- Naukri imports
- Voice screening
- WhatsApp
- Email campaigns
- Integrations
- Team
- Upload

### 7.4 Portal Tests

Admin portal:

- Dashboard loads tenant-scoped data.
- Team page displays tenant members only.
- Settings update tenant company profile only.
- Integrations show tenant-scoped credentials only.

Recruiter portal:

- Candidate list is tenant scoped.
- Job list is tenant scoped.
- Pipeline board is tenant scoped.
- Naukri assistant imports are tenant scoped.

Client portal:

- Client sees only its own jobs, pipeline, interviews, and analytics within the tenant.

Candidate portal:

- Candidate sees only their profile and interviews.

### 7.5 Regression Tests

Existing workflows must continue:

1. Create candidate.
2. Edit candidate.
3. Add candidate note.
4. Add candidate project.
5. Create client.
6. Create job.
7. Create application.
8. Run AI screening.
9. Schedule interview.
10. Create offer.
11. View analytics.
12. Generate reports.
13. Create Naukri import.
14. Import Naukri candidate to pipeline.
15. Create WhatsApp template.
16. Send WhatsApp message record.
17. Create voice screening record.
18. Manage platform subscription.

### 7.6 Security Tests

Test cases:

1. Direct object reference to another tenant returns 404 or 403.
2. Report export is tenant scoped.
3. Upload download URL cannot be generated for another tenant's file.
4. Integration credential APIs require tenant admin permission.
5. Provider webhook updates only the record linked to the webhook ID.
6. Tenant audit log is written for membership, settings, integration, and export actions.

## 8. Deployment Checklist

### 8.1 Pre-Development Checklist

- Confirm production database provider and backup process.
- Confirm current production environment variables.
- Confirm current user roles and expected tenant mapping.
- Confirm default organization name and slug.
- Confirm no existing production tenant concept exists elsewhere.
- Confirm all active routes requiring tenant scoping.

### 8.2 Pre-Staging Checklist

- Migration 001 reviewed.
- Backfill script reviewed.
- Tenant context helper design reviewed.
- Permission catalog reviewed.
- Test data includes at least two organizations.
- Staging snapshot created.

### 8.3 Staging Deployment Checklist

1. Deploy Migration 001.
2. Run Prisma generate.
3. Run backfill script.
4. Validate backfill report.
5. Deploy tenant-aware API code with enforcement disabled.
6. Run regression tests.
7. Enable tenant context.
8. Run tenant isolation tests.
9. Enable tenant enforcement.
10. Run full portal QA.
11. Deploy Migration 003.
12. Run required-column validation.
13. Wait for stable staging period before Migration 004.

### 8.4 Production Deployment Checklist

1. Announce maintenance window if required.
2. Capture production database snapshot.
3. Export pre-migration row counts.
4. Deploy Migration 001.
5. Run Prisma generate/build.
6. Run backfill script.
7. Store backfill report.
8. Deploy tenant-aware code with enforcement disabled.
9. Smoke test login and dashboards.
10. Enable `TENANT_CONTEXT_ENABLED`.
11. Monitor logs for tenant resolution errors.
12. Enable `TENANT_ENFORCEMENT_ENABLED`.
13. Smoke test admin, recruiter, client, and candidate portals.
14. Deploy Migration 003 only after validation.
15. Monitor for 48 hours.
16. Deploy Migration 004 only after no tenant-scope issues remain.

### 8.5 Post-Deployment Checklist

- Verify all users can log in.
- Verify admin dashboard counts.
- Verify candidate list count.
- Verify job list count.
- Verify pipeline count.
- Verify reports and analytics.
- Verify client portal data visibility.
- Verify candidate portal data visibility.
- Verify integration settings visibility.
- Verify tenant audit logs.
- Review error logs for unscoped query failures.
- Review support issues for access problems.

## 9. Acceptance Criteria

Milestone 1 is accepted only when all criteria below are met.

### 9.1 Schema Acceptance

- `Organization`, `Workspace`, `Role`, `Permission`, `RolePermission`, `OrganizationMembership`, `WorkspaceMembership`, and `TenantAuditLog` exist.
- Every tenant-owned table has `organizationId`.
- Every workspace-scoped table has `workspaceId`.
- All existing records are backfilled to the default organization and workspace.
- Tenant-scoped indexes exist for high-volume tables.
- Tenant-scoped unique constraints exist for candidate email, client name, integration provider, templates, platform subscriptions, calendar connections, and company profile.
- Old global unique constraints are removed only after tenant-scoped code is live and stable.

### 9.2 API Acceptance

- All core APIs enforce tenant context.
- No API lists records across tenants.
- No API fetches, updates, or deletes another tenant's record by direct ID.
- All create APIs write `organizationId` and `workspaceId`.
- Analytics and reports are tenant scoped.
- Provider callbacks update only the tenant-owned records they are linked to.

### 9.3 Auth And Permission Acceptance

- Sessions include active organization and workspace context.
- Current role behavior remains compatible.
- Admin, recruiter, client, and candidate portals still work.
- Users without active membership are denied.
- Suspended tenant access is blocked.
- Team membership management supports organization and workspace membership.

### 9.4 Data Acceptance

- Existing production row counts are preserved.
- Existing candidates, clients, jobs, applications, interviews, offers, prospects, Naukri imports, WhatsApp records, voice records, reports, and analytics remain accessible to the correct users.
- No duplicate or orphaned tenant records are introduced by backfill.
- Backfill can be rerun safely.

### 9.5 Security Acceptance

- Cross-tenant direct object access is blocked.
- Client users cannot see other clients.
- Candidate users cannot see other candidates.
- Integration settings are tenant scoped.
- Upload paths and downloads are tenant scoped.
- Tenant audit logs are written for sensitive tenant actions.

### 9.6 Operational Acceptance

- Production deployment has a tested rollback plan.
- Database snapshots are captured before enforcement migrations.
- Build passes.
- Prisma validation passes.
- Regression tests pass.
- Tenant isolation tests pass.
- Monitoring shows no material increase in 401, 403, 404, or 500 errors after enforcement.

### 9.7 Business Acceptance

- Current CareerPaths workflows remain usable.
- Recruiters can still manage candidates, jobs, pipeline, interviews, offers, Naukri imports, WhatsApp, voice screening, analytics, and reports.
- The platform can safely onboard a second organization without exposing CareerPaths data.
- Future milestones can build on tenant-safe data without redesigning the foundation.

## 10. Four-Week Execution Calendar

### Week 1: Design, Audit, And Additive Schema

Deliverables:

- Final Milestone 1 schema diff.
- Tenant permission catalog.
- Route scoping audit.
- Migration 001 draft.
- Backfill script design.

Implementation focus:

- New tenant models.
- Nullable tenant columns.
- Session/guard design.
- Two-tenant test data plan.

Exit criteria:

- Migration 001 applies on staging copy.
- Backfill dry-run plan approved.
- All APIs and pages requiring tenant changes are listed.

### Week 2: Backfill And Tenant Context

Deliverables:

- Migration 002 backfill script.
- Tenant context resolver.
- Membership mapping.
- Staging backfill report.

Implementation focus:

- Default organization/workspace creation.
- User membership creation.
- Tenant IDs on all existing data.
- Auth/session tenant context.

Exit criteria:

- Backfill is idempotent.
- All required tenant fields are populated in staging.
- Existing portals still load with tenant context disabled or soft-enabled.

### Week 3: Tenant-Safe APIs And Pages

Deliverables:

- Tenant-scoped core APIs.
- Tenant-aware admin, recruiter, client, and candidate pages.
- Tenant isolation test suite.
- Migration 003 readiness report.

Implementation focus:

- Candidates, clients, jobs, applications, interviews, offers.
- Reports and analytics.
- Naukri, search, voice, WhatsApp, email, integrations, team, uploads.

Exit criteria:

- Two-tenant isolation tests pass.
- Regression tests pass.
- Tenant enforcement can be enabled in staging.

### Week 4: Enforcement, Production Rollout, And Stabilization

Deliverables:

- Migration 003 production deployment.
- Tenant enforcement enabled.
- Production validation report.
- Migration 004 go/no-go decision.

Implementation focus:

- Required tenant fields.
- Tenant-scoped unique constraints.
- Production rollout.
- Monitoring and rollback readiness.

Exit criteria:

- No cross-tenant leaks.
- Current workflows remain stable.
- Second test organization can be created safely.
- Migration 004 runs only after at least 48 hours of stable enforcement.
