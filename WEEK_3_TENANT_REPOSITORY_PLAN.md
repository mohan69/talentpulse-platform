# WEEK_3_TENANT_REPOSITORY_PLAN

## Purpose

Week 3 introduces tenant-safe data access without changing schema, creating migrations, or redesigning UI. Week 1 added the tenant foundation and nullable tenant columns. Week 2 backfilled existing rows into the default organization and workspace. Week 3 moves core application reads and writes behind a tenant-aware repository and service boundary so later enforcement can safely make tenant columns required.

Primary outcome: every major data access path must resolve organization and workspace context before touching tenant-owned data.

## Current Assumptions

- Week 1 is complete: `001_tenant_foundation_additive` exists and has added `Organization`, `Workspace`, membership, role, permission, audit, and nullable tenant columns.
- Week 2 is complete: existing rows have been backfilled with `organizationId` and workspace-scoped rows have `workspaceId`.
- Current Prisma schema still keeps tenant columns nullable for compatibility.
- Global uniqueness still exists on `Client.name` and `Candidate.email`; Week 3 must use tenant-scoped lookup logic even before old global constraints are removed.
- Week 3 must not introduce schema changes or migrations.

---

## 1. Repository Pattern For Tenant-Safe Data Access

### Design

Create a repository layer that becomes the only allowed access path for tenant-owned models.

Recommended structure:

```text
lib/tenant/context.ts
lib/tenant/permissions.ts
lib/tenant/prisma.ts
lib/repositories/candidate.repository.ts
lib/repositories/client.repository.ts
lib/repositories/job.repository.ts
lib/repositories/application.repository.ts
lib/repositories/interview.repository.ts
lib/repositories/project.repository.ts
lib/repositories/note.repository.ts
lib/repositories/activity.repository.ts
```

No Week 3 implementation should allow route handlers or services to call `prisma.candidate`, `prisma.job`, `prisma.application`, or other tenant-owned delegates directly.

### Repository Contract

Every tenant-owned repository receives a resolved `TenantContext`.

```ts
type TenantContext = {
  organizationId: string;
  workspaceId: string;
  userId: string;
  organizationRole: string;
  workspaceRole?: string;
  userRole: string;
  clientId?: string;
  candidateId?: string;
  permissions: string[];
  enforcementMode: "observe" | "enforce";
};
```

Repository methods must:

- Require `TenantContext`.
- Add `organizationId` to every tenant-owned query.
- Add `workspaceId` to every workspace-scoped operational query.
- Validate parent/child relationships before writes.
- Write `organizationId` and `workspaceId` on creates.
- Return `404`-equivalent behavior for cross-tenant records.
- Emit audit/activity records for consequential writes.

### Repository Method Pattern

Each repository should expose intention-based methods rather than raw Prisma pass-throughs:

```text
list(ctx, filters)
getById(ctx, id)
create(ctx, input)
update(ctx, id, input)
deleteOrArchive(ctx, id)
assertBelongsToTenant(ctx, id)
```

Avoid generic `findMany(args)` wrappers because they allow callers to bypass tenant filters.

---

## 2. Organization Context Resolution

### Resolution Order

Resolve active organization using this order:

1. Explicit organization selection from session or request context.
2. User default organization: `User.defaultOrganizationId`.
3. Active `OrganizationMembership` if the user has exactly one active organization.
4. Reject request if no active organization can be resolved.

### Validation Rules

For every authenticated user:

- Organization must exist.
- Organization status must be `ACTIVE`.
- User must have an `ACTIVE` `OrganizationMembership`.
- Role must be loaded from the membership.
- Suspended or archived organizations must block access.

For client portal users:

- Resolve organization through the user membership first.
- Validate `User.clientId` belongs to the same organization.
- Restrict data to the user's client boundary.

For candidate portal users:

- Resolve organization through membership or linked candidate.
- Validate `User.candidateId` belongs to the same organization.
- Restrict data to the linked candidate boundary.

### Failure Modes

- Missing organization context: return `401` if unauthenticated, otherwise `403`.
- Organization mismatch: return `404` for object reads, `403` for list/action endpoints.
- Suspended organization: return `403`.
- Observe mode: log tenant resolution failures while preserving current behavior only for non-sensitive reads.

---

## 3. Workspace Context Resolution

### Resolution Order

Resolve active workspace using this order:

1. Explicit workspace selection from session or request context.
2. User default workspace: `User.defaultWorkspaceId`.
3. Active `WorkspaceMembership` if the user has exactly one active workspace in the organization.
4. Organization default workspace where `Workspace.type = DEFAULT`.
5. Reject request if workspace cannot be resolved.

### Validation Rules

- Workspace must belong to the resolved organization.
- Workspace status must be `ACTIVE`.
- User must have active workspace membership unless using an organization-wide admin capability.
- Workspace-scoped operational data must include both `organizationId` and `workspaceId`.

### Organization-Scoped Data

Some models may be organization-scoped with optional workspace filtering:

- `Client` can be visible across workspaces within the organization.
- Future shared knowledge and configuration may be organization-scoped.

Repository methods must make scope explicit:

```text
scope: "organization" | "workspace"
```

Do not silently omit workspace filtering for operational models.

---

## 4. Tenant-Aware Prisma Access Layer

### Prisma Boundary

Create a tenant-aware Prisma adapter that wraps the base Prisma client and provides scoped helpers. The adapter should not use Prisma middleware as the only safety mechanism; explicit repository filters are easier to audit and test.

Recommended responsibilities:

- Expose base Prisma only to repositories.
- Provide `tenantWhere(ctx, extraWhere)` helpers.
- Provide `workspaceWhere(ctx, extraWhere)` helpers.
- Provide parent validation helpers.
- Provide audit helper for tenant-sensitive operations.

Example helper shape:

```ts
tenantWhere(ctx, where) => ({
  ...where,
  organizationId: ctx.organizationId,
})

workspaceWhere(ctx, where) => ({
  ...where,
  organizationId: ctx.organizationId,
  workspaceId: ctx.workspaceId,
})
```

### Guardrails

- Direct Prisma access in API route handlers should be treated as a Week 3 defect for tenant-owned data.
- Raw SQL must require an explicit `organizationId` predicate unless used for verified global catalogs.
- Aggregates, counts, groupBy, dashboard queries, and exports must be tenant scoped.
- Include and relation queries must validate parent scope before returning child records.

---

## 5. Query Filtering Strategy

### Read Queries

Default filter:

```text
organizationId = ctx.organizationId
```

Workspace-scoped filter:

```text
organizationId = ctx.organizationId
workspaceId = ctx.workspaceId
```

Client portal filter:

```text
organizationId = ctx.organizationId
clientId = ctx.clientId
```

Candidate portal filter:

```text
organizationId = ctx.organizationId
candidateId = ctx.candidateId
```

### Write Queries

Create:

- Always write `organizationId`.
- Write `workspaceId` for workspace-scoped operational records.
- Validate all referenced IDs belong to the same organization.
- Validate workspace-scoped parents belong to the same workspace unless the entity is intentionally organization-shared.

Update/delete:

- Use compound scope in the `where` condition.
- Never update by `id` alone.
- Treat zero affected rows as not found.

### Relationship Validation

Before creating child records:

- `Job.clientId` must belong to `ctx.organizationId`.
- `Application.jobId` and `candidateId` must belong to `ctx.organizationId`.
- `Interview.applicationId` and `candidateId` must belong to `ctx.organizationId`.
- `Project.candidateId` must belong to `ctx.organizationId`.
- `Note.candidateId`, when present, must belong to `ctx.organizationId`.
- `ActivityLog.entityId` must refer to an entity in the same organization where the entity type is tenant-owned.

---

## 6. Authorization Boundaries

### Role Boundary

Week 3 should separate tenant filtering from authorization:

- Tenant filtering answers: "Can this user see data from this organization/workspace?"
- Authorization answers: "Can this user perform this action?"

Authorization checks should use organization and workspace memberships plus role permissions.

### Minimum Boundaries

Admin:

- Can access organization-wide data inside the active organization.
- Can manage tenant settings when permission allows.

Recruiter:

- Can access workspace-scoped recruiting data.
- May be further restricted to owned candidates, assigned jobs, or assigned applications where current behavior requires it.

Client user:

- Can access only records tied to `User.clientId` inside the organization.
- Cannot list all candidates, all clients, or internal notes unless explicitly shared.

Candidate user:

- Can access only linked candidate profile, applications, interviews, and offer-facing data.
- Cannot access other candidates or employer-side records.

System/provider callback:

- Must resolve tenant from stored record IDs, not from user session.
- Must update only the record's organization/workspace.

### Direct Object Reference Policy

For any tenant-owned record:

- Cross-tenant ID on read returns `404`.
- Cross-tenant ID on write returns `404` or `403` depending on route semantics.
- Cross-workspace access returns `403` unless organization-level role explicitly allows cross-workspace visibility.

---

## 7. Service Layer Changes

### Route Handler Responsibilities

Route handlers should:

- Authenticate user.
- Resolve `TenantContext`.
- Validate request shape.
- Call service methods with `TenantContext`.
- Avoid direct Prisma usage for tenant-owned models.

### Service Responsibilities

Services should:

- Orchestrate business workflows.
- Call repositories for all data access.
- Enforce action-level permissions.
- Validate cross-entity workflow rules.
- Write activity logs through the activity repository.

### Repository Responsibilities

Repositories should:

- Own tenant predicates.
- Own Prisma query shape.
- Own tenant-safe parent checks.
- Own safe create/update/delete primitives.

### Feature Flag

Use a tenant enforcement flag during rollout:

```text
TENANT_ENFORCEMENT_MODE=observe | enforce
```

Observe mode:

- Adds tenant filters where safe.
- Logs missing tenant context and mismatches.
- Does not make schema assumptions beyond Week 2 backfill.

Enforce mode:

- Rejects missing or invalid tenant context.
- Blocks direct cross-tenant access.
- Required before future migration that makes tenant columns non-null.

---

## 8. Major Entity Tenant Filtering

### Candidate

Scope: workspace-scoped operational entity.

Reads:

```text
Candidate.organizationId = ctx.organizationId
Candidate.workspaceId = ctx.workspaceId
```

Admin cross-workspace view may use:

```text
Candidate.organizationId = ctx.organizationId
```

Creates:

- Set `organizationId = ctx.organizationId`.
- Set `workspaceId = ctx.workspaceId`.
- Validate `ownerId`, if provided, has membership in the same organization and workspace.
- Duplicate email checks must use `organizationId + email`, even while global `email @unique` remains.

Updates/deletes:

- Filter by `id + organizationId`.
- Include `workspaceId` unless the user has cross-workspace permission.

Portal restrictions:

- Candidate portal must also filter by `id = ctx.candidateId`.

### Client

Scope: organization-scoped, optionally workspace-filtered.

Reads:

```text
Client.organizationId = ctx.organizationId
```

Optional workspace view:

```text
Client.organizationId = ctx.organizationId
AND (Client.workspaceId = ctx.workspaceId OR Client.workspaceId IS NULL)
```

Creates:

- Set `organizationId = ctx.organizationId`.
- Set `workspaceId` only when the client is intentionally workspace-specific.
- Duplicate name checks must use `organizationId + name`, even while global `name @unique` remains.

Updates/deletes:

- Filter by `id + organizationId`.
- Prevent client users from updating client records unless explicitly allowed.

Client portal restrictions:

- Client user must also filter by `id = ctx.clientId`.

### Job

Scope: workspace-scoped operational entity.

Reads:

```text
Job.organizationId = ctx.organizationId
Job.workspaceId = ctx.workspaceId
```

Client portal reads:

```text
Job.organizationId = ctx.organizationId
Job.clientId = ctx.clientId
```

Creates:

- Set `organizationId = ctx.organizationId`.
- Set `workspaceId = ctx.workspaceId`.
- Validate `clientId` belongs to `ctx.organizationId`.
- Validate `createdById` and `recruiterId`, when present, are active members of the same organization.

Updates/deletes:

- Filter by `id + organizationId + workspaceId` unless cross-workspace permission is present.

### Application

Scope: workspace-scoped operational entity.

Reads:

```text
Application.organizationId = ctx.organizationId
Application.workspaceId = ctx.workspaceId
```

Candidate portal reads:

```text
Application.organizationId = ctx.organizationId
Application.candidateId = ctx.candidateId
```

Client portal reads:

```text
Application.organizationId = ctx.organizationId
Application.job.clientId = ctx.clientId
```

Creates:

- Set `organizationId = ctx.organizationId`.
- Set `workspaceId = ctx.workspaceId`.
- Validate `candidateId` belongs to the same organization.
- Validate `jobId` belongs to the same organization and workspace.
- Replace global `candidateId + jobId` assumptions with tenant-aware checks in service logic.

Updates/deletes:

- Filter by `id + organizationId + workspaceId`.
- Stage changes must create tenant-scoped activity logs.

### Interview

Scope: workspace-scoped operational entity.

Reads:

```text
Interview.organizationId = ctx.organizationId
Interview.workspaceId = ctx.workspaceId
```

Candidate portal reads:

```text
Interview.organizationId = ctx.organizationId
Interview.candidateId = ctx.candidateId
```

Client portal reads:

```text
Interview.organizationId = ctx.organizationId
Interview.application.job.clientId = ctx.clientId
```

Creates:

- Set `organizationId = ctx.organizationId`.
- Set `workspaceId = ctx.workspaceId`.
- Validate `applicationId` belongs to the same organization/workspace.
- Validate `candidateId` matches the application candidate.
- Validate `interviewerId`, when present, is an allowed user in the organization.

Updates/deletes:

- Filter by `id + organizationId + workspaceId`.
- Outcome and feedback changes should write tenant-scoped activity logs.

### Project

Scope: workspace-scoped candidate sub-entity.

Reads:

```text
Project.organizationId = ctx.organizationId
Project.workspaceId = ctx.workspaceId
```

Candidate profile nested reads:

```text
Project.organizationId = ctx.organizationId
Project.candidateId = candidate.id
```

Creates:

- Set `organizationId = ctx.organizationId`.
- Set `workspaceId = ctx.workspaceId`.
- Validate `candidateId` belongs to the same organization.

Updates/deletes:

- Filter by `id + organizationId`.
- Include `workspaceId` unless the user has cross-workspace candidate-profile permission.

### Note

Scope: workspace-scoped internal collaboration record.

Reads:

```text
Note.organizationId = ctx.organizationId
Note.workspaceId = ctx.workspaceId
```

Candidate notes:

```text
Note.organizationId = ctx.organizationId
Note.candidateId = candidate.id
```

Creates:

- Set `organizationId = ctx.organizationId`.
- Set `workspaceId = ctx.workspaceId`.
- Set `authorId = ctx.userId`.
- Validate `candidateId`, if present, belongs to the same organization.

Restrictions:

- Client and candidate portal users should not receive internal notes by default.
- Shared/external notes require explicit future sharing metadata; do not infer sharing from tenant membership.

Updates/deletes:

- Filter by `id + organizationId + workspaceId`.
- Author-only or admin-only changes should be enforced in service authorization.

### Activity

Model: `ActivityLog`.

Scope: workspace-scoped audit/activity stream.

Reads:

```text
ActivityLog.organizationId = ctx.organizationId
ActivityLog.workspaceId = ctx.workspaceId
```

Entity timeline:

```text
ActivityLog.organizationId = ctx.organizationId
ActivityLog.entityType = entityType
ActivityLog.entityId = entityId
```

Creates:

- Set `organizationId = ctx.organizationId`.
- Set `workspaceId = ctx.workspaceId`.
- Set `userId = ctx.userId` where user-driven.
- Validate `entityId` belongs to the same organization for known tenant-owned `entityType` values.

Restrictions:

- Activity logs must not be globally queryable.
- Client and candidate portal activity should be curated through service methods, not direct activity log lists.

---

## 9. Testing Strategy

### Unit Tests

Add repository unit tests for each major entity:

- Adds `organizationId` to every read.
- Adds `workspaceId` to workspace-scoped reads.
- Writes tenant IDs on create.
- Rejects parent IDs from another tenant.
- Returns not found for cross-tenant IDs.
- Applies client/candidate portal restrictions.

### Integration Tests

Create two organizations with two workspaces:

```text
Organization A / Workspace A
Organization B / Workspace B
```

Seed equivalent records with similar names/emails/titles across both tenants:

- Candidate with same email pattern where database constraints allow.
- Client with same name pattern where database constraints allow.
- Job under each client.
- Application linking each tenant's candidate/job.
- Interview under each application.
- Project and note for each candidate.
- Activity logs for each entity.

Test cases:

- Organization A cannot list Organization B records.
- Direct ID lookup across tenants returns not found.
- Organization A create writes Organization A IDs.
- Cross-tenant parent references are rejected.
- Client user sees only their client records.
- Candidate user sees only their candidate records.
- Dashboard/count/report queries are scoped.

### Static Checks

Search for direct Prisma access in route handlers and services:

```text
prisma.candidate
prisma.client
prisma.job
prisma.application
prisma.interview
prisma.project
prisma.note
prisma.activityLog
```

Each occurrence must be either:

- Inside the approved repository layer.
- Inside a migration/backfill/admin validation script.
- Documented as a temporary exception with owner and removal date.

### Manual Smoke Tests

- Login as admin/recruiter and verify candidate, client, job, pipeline, interview, notes, and activity pages still load.
- Login as client user and verify only client-bound jobs/applications/interviews are visible.
- Login as candidate user and verify only linked candidate data is visible.
- Attempt direct URL access to a record from another tenant and verify access is denied or not found.

---

## 10. Rollback Strategy

Week 3 must be rollback-friendly because it changes application access patterns but not schema.

### Soft Rollback

- Set tenant enforcement to `observe`.
- Keep tenant context resolution logging enabled.
- Keep repositories in place but allow legacy fallback only for explicitly approved low-risk routes.

### Hard Rollback

- Revert Week 3 application commits.
- Keep Week 1 schema and Week 2 backfilled data intact.
- Do not remove tenant IDs from data.
- Do not roll back `001_tenant_foundation_additive` unless a separate database rollback has been approved.

### Rollback Triggers

- Any suspected cross-tenant data exposure.
- Core candidate/job/application pages fail for normal users.
- More than 1 percent of tenant-scoped API requests fail due to context resolution.
- Client portal exposes another client.
- Candidate portal exposes another candidate.
- Reports or dashboards show obviously global counts after tenant enforcement.

### Monitoring During Rollout

Log and monitor:

- Missing tenant context.
- Invalid organization membership.
- Invalid workspace membership.
- Cross-tenant ID attempts.
- Repository calls without workspace scope for workspace-scoped models.
- Legacy direct Prisma access paths still in use.

---

## 11. Acceptance Criteria

Week 3 is complete when:

- A tenant context resolver exists and validates active organization and workspace membership.
- Tenant-owned major entity data access goes through repositories.
- Candidate, Client, Job, Application, Interview, Project, Note, and Activity repositories apply tenant filters consistently.
- Create paths write `organizationId` and `workspaceId` where applicable.
- Update/delete paths never use record `id` alone for tenant-owned data.
- Parent-child references are validated inside the same organization before writes.
- Client portal and candidate portal access is additionally restricted by `clientId` or `candidateId`.
- Dashboard, count, aggregate, and report queries are tenant scoped.
- Direct object reference tests return `404` or `403` across tenants.
- Two-tenant isolation tests pass for all major entities.
- Static search shows no unapproved direct Prisma access for tenant-owned models outside repositories.
- Rollback can be performed by application deploy/config change only.
- No schema changes, Prisma schema changes, or migrations are required for Week 3.

## Implementation Order For Week 3

1. Add tenant context resolver in observe mode.
2. Add permission helper and tenant-aware Prisma helper.
3. Add repositories for Candidate, Client, Job, Application, Interview, Project, Note, and Activity.
4. Move services/API routes to repositories one domain at a time.
5. Add two-tenant integration tests.
6. Add direct object reference tests.
7. Add static checks for direct Prisma access.
8. Run smoke tests with tenant enforcement in observe mode.
9. Enable tenant enforcement in staging.
10. Sign off readiness for future non-null tenant enforcement migration.

