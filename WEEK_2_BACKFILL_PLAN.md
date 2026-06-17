# Week 2 Backfill Plan

Purpose:

Design the Week 2 data backfill required after `001_tenant_foundation_additive` and after the migration baseline strategy is complete.

Scope:

- Default organization strategy
- Default workspace strategy
- Existing user backfill
- Existing candidate backfill
- Existing client/company backfill
- Existing job/requisition backfill
- Existing application/pipeline backfill
- Validation queries
- Rollback strategy
- Acceptance criteria

Out of scope:

- Code changes
- Prisma schema changes
- Migration creation
- Migration application
- API changes
- Auth changes
- UI changes

This plan assumes `001_tenant_foundation_additive` has already been applied safely in staging first, using the migration baseline process in `MIGRATION_BASELINE_PLAN.md`.

## 1. Default Organization Strategy

### Objective

Create one default organization that owns all existing production data. This preserves current single-tenant behavior while enabling tenant-scoped records for future multi-organization support.

### Default Organization Values

Create exactly one default organization if it does not already exist:

- `name`: use `CompanyProfile.name` if a non-empty value exists, else `CareerPaths India`
- `slug`: `careerpaths`
- `type`: `AGENCY`
- `status`: `ACTIVE`
- `region`: `IN`
- `defaultCurrency`: `INR`
- `timezone`: `Asia/Kolkata`
- `securityPolicy`: null for Week 2
- `dataRetentionPolicy`: null for Week 2
- `modelProviderPolicy`: null for Week 2

### Idempotency Rule

The default organization must be looked up by slug first:

```text
Organization.slug = "careerpaths"
```

If it exists, reuse it.

If it does not exist, create it.

Never create a second default organization with a different slug during Week 2.

### Source Of Organization Name

Priority:

1. `CompanyProfile.name` where `id = 'default'` and name is not blank.
2. First available `CompanyProfile.name` if no default row exists.
3. Literal fallback: `CareerPaths India`.

### Records To Attach To Default Organization

All existing tenant-owned records should receive this `organizationId`:

- `User.defaultOrganizationId`
- `Client.organizationId`
- `Job.organizationId`
- `Candidate.organizationId`
- `Project.organizationId`
- `Application.organizationId`
- `Interview.organizationId`
- `Offer.organizationId`
- `Prospect.organizationId`
- `JobPosting.organizationId`
- `PlatformSubscription.organizationId`
- `IntegrationSetting.organizationId`
- `NaukriImport.organizationId`
- `NaukriCandidate.organizationId`
- `SavedSearch.organizationId`
- `VoiceScreening.organizationId`
- `WhatsAppTemplate.organizationId`
- `WhatsAppMessage.organizationId`
- `EmailCampaign.organizationId`
- `CampaignRecipient.organizationId`
- `CalendarConnection.organizationId`
- `EmailTemplate.organizationId`
- `EmailLog.organizationId`
- `Note.organizationId`
- `ActivityLog.organizationId`
- `CompanyProfile.organizationId`

`RecruitingPlatform` remains global and must not be assigned an organization in Week 2.

## 2. Default Workspace Strategy

### Objective

Create one default workspace under the default organization. This workspace becomes the operating scope for all existing records that represent active recruiting work.

### Default Workspace Values

Create exactly one default workspace if it does not already exist:

- `organizationId`: default organization ID
- `name`: `Default Workspace`
- `slug`: `default`
- `type`: `DEFAULT`
- `status`: `ACTIVE`
- `configuration`: null for Week 2

### Idempotency Rule

The default workspace must be looked up by:

```text
Workspace.organizationId = defaultOrganization.id
Workspace.slug = "default"
```

If it exists, reuse it.

If it does not exist, create it.

Never create a second default workspace during Week 2.

### Records To Attach To Default Workspace

All existing workspace-scoped records should receive this `workspaceId`:

- `User.defaultWorkspaceId`
- `Job.workspaceId`
- `Candidate.workspaceId`
- `Project.workspaceId`
- `Application.workspaceId`
- `Interview.workspaceId`
- `Offer.workspaceId`
- `Prospect.workspaceId`
- `JobPosting.workspaceId`
- `PlatformSubscription.workspaceId`
- `IntegrationSetting.workspaceId`
- `NaukriImport.workspaceId`
- `NaukriCandidate.workspaceId`
- `SavedSearch.workspaceId`
- `VoiceScreening.workspaceId`
- `WhatsAppTemplate.workspaceId`
- `WhatsAppMessage.workspaceId`
- `EmailCampaign.workspaceId`
- `CampaignRecipient.workspaceId`
- `CalendarConnection.workspaceId`
- `EmailTemplate.workspaceId`
- `EmailLog.workspaceId`
- `Note.workspaceId`
- `ActivityLog.workspaceId`

Organization-scoped records may keep `workspaceId` null in Week 2:

- `Client`
- `CompanyProfile`

Rationale:

Clients and company profile may become organization-wide objects later. Do not force a workspace-specific interpretation yet.

## 3. Existing User Backfill

### Objective

Attach every existing user to the default organization and, where appropriate, default workspace, while preserving current login and role behavior.

### User Fields To Update

For every existing `User`:

- Set `defaultOrganizationId` to default organization ID if null.
- Set `defaultWorkspaceId` to default workspace ID if null.
- Preserve `role`.
- Preserve `clientId`.
- Preserve `candidateId`.
- Preserve `isActive`.
- Preserve credentials and profile fields.

### Role Creation

Create default organization roles if they do not already exist.

Roles:

| Current `User.role` | New `Role.systemKey` | New `Role.name` | Scope |
|---|---|---|---|
| `ADMIN` | `organization_admin` | `Organization Admin` | `ORGANIZATION` |
| `RECRUITER` | `recruiter` | `Recruiter` | `WORKSPACE` |
| `CLIENT` | `client` | `Client` | `ORGANIZATION` |
| `CANDIDATE` | `candidate` | `Candidate` | `ORGANIZATION` |

Role idempotency key:

```text
Role.organizationId + Role.systemKey
```

### Permission Creation

Week 2 should create only a minimal permission catalog needed to support future tenant guards.

Suggested permission keys:

- `tenant.read`
- `tenant.manage`
- `workspace.read`
- `workspace.manage`
- `users.read`
- `users.manage`
- `candidates.read`
- `candidates.manage`
- `clients.read`
- `clients.manage`
- `jobs.read`
- `jobs.manage`
- `pipeline.read`
- `pipeline.manage`
- `reports.read`
- `settings.manage`

Permission idempotency key:

```text
Permission.key
```

### Role Permission Mapping

Organization admin:

- all Week 2 permissions

Recruiter:

- `workspace.read`
- `candidates.read`
- `candidates.manage`
- `clients.read`
- `jobs.read`
- `jobs.manage`
- `pipeline.read`
- `pipeline.manage`
- `reports.read`

Client:

- `workspace.read`
- `jobs.read`
- `pipeline.read`
- `reports.read`

Candidate:

- `workspace.read`

### Organization Membership Backfill

For every active and inactive user:

- Create one `OrganizationMembership`.
- `organizationId`: default organization ID
- `userId`: current user ID
- `roleId`: mapped role ID
- `status`: `ACTIVE` if `User.isActive = true`, else `SUSPENDED`
- `joinedAt`: `User.createdAt` if available, else current timestamp

Idempotency key:

```text
OrganizationMembership.organizationId + OrganizationMembership.userId
```

### Workspace Membership Backfill

Create workspace memberships as follows:

Admin users:

- Create active membership in default workspace with `organization_admin` role.

Recruiter users:

- Create active membership in default workspace with `recruiter` role.

Client users:

- Create workspace membership only if current client portal queries need workspace context immediately.
- Recommended Week 2 approach: create membership in default workspace with `client` role to simplify future `requireTenantUser` behavior.

Candidate users:

- Create workspace membership only if candidate portal queries need workspace context immediately.
- Recommended Week 2 approach: create membership in default workspace with `candidate` role to simplify future tenant context behavior.

Inactive users:

- Create memberships with `SUSPENDED` status.

Idempotency key:

```text
WorkspaceMembership.workspaceId + WorkspaceMembership.userId
```

## 4. Existing Candidate Backfill

### Objective

Attach all existing candidate records and candidate-owned child records to the default organization and workspace.

### Candidate Table

For every `Candidate`:

- Set `organizationId` to default organization ID if null.
- Set `workspaceId` to default workspace ID if null.
- Preserve `ownerId`.
- Preserve `email`, `phone`, `source`, compensation, resume, AI fields, and all existing profile data.

### Candidate Child Records

Backfill from parent candidate where possible:

Project:

- Set `organizationId` and `workspaceId` from `Project.candidate`.
- If candidate is missing, use default organization/workspace and report orphan.

Note:

- Set from `Note.candidate` where `candidateId` exists.
- If no candidate, set from author user's defaults.
- If both are missing, use default organization/workspace and report orphan context.

EmailLog:

- Set from `EmailLog.candidate` where `candidateId` exists.
- Else set from sender user's defaults.
- Else use default organization/workspace.

WhatsAppMessage:

- Set from candidate where `candidateId` exists.
- Else use default organization/workspace because phone-only WhatsApp records still belong to the existing tenant.

VoiceScreening:

- Prefer application-derived tenant context.
- Fallback to candidate-derived tenant context.
- Final fallback to default organization/workspace and report orphan context.

Candidate-linked `User`:

- If a `User.candidateId` points to a candidate, ensure that user defaults and memberships match the candidate's organization/workspace.

### Candidate Duplicate Check

Before and after backfill, detect candidate email collisions inside the default organization:

```sql
select "organizationId", lower(email) as normalized_email, count(*) as duplicate_count
from "Candidate"
where email is not null
group by "organizationId", lower(email)
having count(*) > 1;
```

Expected:

- No duplicates in current single-tenant production because `Candidate.email` is currently globally unique.

## 5. Existing Client/Company Backfill

### Objective

Attach all existing client/company records to the default organization. Keep clients organization-scoped in Week 2.

### Client Table

For every `Client`:

- Set `organizationId` to default organization ID if null.
- Leave `workspaceId` null unless a client is explicitly tied to the default workspace by business decision.
- Preserve `name`, `contactName`, `contactEmail`, `contactPhone`, and all existing client fields.

### CompanyProfile Table

For every `CompanyProfile`:

- Set `organizationId` to default organization ID if null.
- Leave `workspaceId` null unless the product explicitly wants workspace-specific branding.
- Preserve current profile values.

### Client-Linked Users

For every `User.clientId`:

- Ensure the linked client has the default organization.
- Ensure the user has organization membership.
- Ensure the user has default workspace membership if Week 2 standard creates memberships for all users.

### Client Duplicate Check

```sql
select "organizationId", lower(name) as normalized_name, count(*) as duplicate_count
from "Client"
where name is not null
group by "organizationId", lower(name)
having count(*) > 1;
```

Expected:

- No duplicates in current single-tenant production because `Client.name` is currently globally unique.

## 6. Existing Job/Requisition Backfill

### Objective

Attach every existing job/requisition and job-owned child records to the default organization/workspace.

### Job Table

For every `Job`:

- Set `organizationId` to default organization ID if null.
- Set `workspaceId` to default workspace ID if null.
- Preserve `clientId`, `createdById`, `recruiterId`, status, priority, skills, salary, and AI parsed data.

### Job Parent Consistency

For each job:

- `Job.clientId` must point to a `Client` in the same organization.
- `Job.createdById` must point to a `User` with membership in the same organization.
- `Job.recruiterId`, if present, must point to a `User` with membership in the same organization.

Week 2 should report inconsistencies but should not delete or rewrite business ownership.

### JobPosting Table

For every `JobPosting`:

- Set `organizationId` and `workspaceId` from linked `Job`.
- Preserve `platformId`.
- Do not tenant-scope `RecruitingPlatform`.
- If linked job is missing, use default organization/workspace and report orphan.

### NaukriCandidate Matched Job

For every `NaukriCandidate` with `matchedJobId`:

- Ensure `organizationId` and `workspaceId` match the linked `NaukriImport`.
- Confirm matched job belongs to same organization.
- Report mismatches.

## 7. Existing Application/Pipeline Backfill

### Objective

Attach all current candidate-job pipeline records to the default organization/workspace while preserving current `Application.stage` behavior.

### Application Table

For every `Application`:

- Prefer tenant from linked `Job`.
- Confirm linked `Candidate` has same organization.
- Set `organizationId` to default organization ID if null.
- Set `workspaceId` to default workspace ID if null.
- Preserve `stage`, `matchScore`, `noShowRisk`, `aiReport`, `submittedAt`, and `clientFeedback`.

### Application Consistency Checks

Check for:

- Application with missing candidate.
- Application with missing job.
- Application where candidate organization differs from job organization.
- Application where candidate workspace differs from job workspace.

In Week 2, all existing records should resolve to the default organization/workspace. Any mismatch means partial or failed backfill.

### Interview Table

For every `Interview`:

- Set `organizationId` and `workspaceId` from linked `Application`.
- Confirm `candidateId` matches the linked application's candidate.
- Preserve interview schedule, feedback, rating, status, and outcome.

### Offer Table

For every `Offer`:

- Set `organizationId` and `workspaceId` from linked `Application`.
- Confirm `candidateId` matches the linked application's candidate.
- Preserve compensation, fee, payment, joining, and status fields.

### VoiceScreening Table

For every `VoiceScreening`:

- Set tenant from linked `Application`.
- Confirm `candidateId` matches application candidate.
- Preserve call status, external IDs, transcripts, AI summaries, and recordings.

### ActivityLog Table

Activity logs are polymorphic and may reference candidates, jobs, applications, or interviews.

Backfill order:

1. If `entityType = 'candidate'`, derive from `Candidate`.
2. If `entityType = 'job'`, derive from `Job`.
3. If `entityType = 'application'`, derive from `Application`.
4. If `entityType = 'interview'`, derive from `Interview`.
5. Else derive from `userId` default organization/workspace.
6. Final fallback to default organization/workspace and report unresolved entity reference.

## 8. Validation Queries

Run these validation queries after backfill on staging before any production run. Run again after production backfill.

### 8.1 Organization And Workspace Counts

```sql
select id, name, slug, type, status, "createdAt"
from "Organization"
order by "createdAt";
```

Expected:

- Exactly one default organization for Week 2 unless test/staging intentionally contains more.
- Default slug is `careerpaths`.

```sql
select id, "organizationId", name, slug, type, status, "createdAt"
from "Workspace"
order by "createdAt";
```

Expected:

- Exactly one default workspace under the default organization for Week 2.
- Default slug is `default`.

### 8.2 User Membership Validation

Users missing default tenant:

```sql
select count(*) as users_missing_defaults
from "User"
where "defaultOrganizationId" is null
   or "defaultWorkspaceId" is null;
```

Users missing organization membership:

```sql
select count(*) as users_without_org_membership
from "User" u
left join "OrganizationMembership" om
  on om."userId" = u.id
 and om."organizationId" = u."defaultOrganizationId"
where om.id is null;
```

Users missing workspace membership:

```sql
select count(*) as users_without_workspace_membership
from "User" u
left join "WorkspaceMembership" wm
  on wm."userId" = u.id
 and wm."workspaceId" = u."defaultWorkspaceId"
where wm.id is null;
```

Expected:

- All counts are zero, unless the final design intentionally excludes client/candidate workspace membership. If excluded, document the expected non-zero count by role.

### 8.3 Tenant-Owned Rows Missing Organization

```sql
select 'Client' as table_name, count(*) from "Client" where "organizationId" is null
union all select 'Job', count(*) from "Job" where "organizationId" is null
union all select 'Candidate', count(*) from "Candidate" where "organizationId" is null
union all select 'Project', count(*) from "Project" where "organizationId" is null
union all select 'Application', count(*) from "Application" where "organizationId" is null
union all select 'Interview', count(*) from "Interview" where "organizationId" is null
union all select 'Offer', count(*) from "Offer" where "organizationId" is null
union all select 'Prospect', count(*) from "Prospect" where "organizationId" is null
union all select 'JobPosting', count(*) from "JobPosting" where "organizationId" is null
union all select 'PlatformSubscription', count(*) from "PlatformSubscription" where "organizationId" is null
union all select 'IntegrationSetting', count(*) from "IntegrationSetting" where "organizationId" is null
union all select 'NaukriImport', count(*) from "NaukriImport" where "organizationId" is null
union all select 'NaukriCandidate', count(*) from "NaukriCandidate" where "organizationId" is null
union all select 'SavedSearch', count(*) from "SavedSearch" where "organizationId" is null
union all select 'VoiceScreening', count(*) from "VoiceScreening" where "organizationId" is null
union all select 'WhatsAppTemplate', count(*) from "WhatsAppTemplate" where "organizationId" is null
union all select 'WhatsAppMessage', count(*) from "WhatsAppMessage" where "organizationId" is null
union all select 'EmailCampaign', count(*) from "EmailCampaign" where "organizationId" is null
union all select 'CampaignRecipient', count(*) from "CampaignRecipient" where "organizationId" is null
union all select 'CalendarConnection', count(*) from "CalendarConnection" where "organizationId" is null
union all select 'EmailTemplate', count(*) from "EmailTemplate" where "organizationId" is null
union all select 'EmailLog', count(*) from "EmailLog" where "organizationId" is null
union all select 'Note', count(*) from "Note" where "organizationId" is null
union all select 'ActivityLog', count(*) from "ActivityLog" where "organizationId" is null
union all select 'CompanyProfile', count(*) from "CompanyProfile" where "organizationId" is null;
```

Expected:

- Every count is zero.

### 8.4 Workspace-Scoped Rows Missing Workspace

```sql
select 'Job' as table_name, count(*) from "Job" where "workspaceId" is null
union all select 'Candidate', count(*) from "Candidate" where "workspaceId" is null
union all select 'Project', count(*) from "Project" where "workspaceId" is null
union all select 'Application', count(*) from "Application" where "workspaceId" is null
union all select 'Interview', count(*) from "Interview" where "workspaceId" is null
union all select 'Offer', count(*) from "Offer" where "workspaceId" is null
union all select 'Prospect', count(*) from "Prospect" where "workspaceId" is null
union all select 'JobPosting', count(*) from "JobPosting" where "workspaceId" is null
union all select 'PlatformSubscription', count(*) from "PlatformSubscription" where "workspaceId" is null
union all select 'IntegrationSetting', count(*) from "IntegrationSetting" where "workspaceId" is null
union all select 'NaukriImport', count(*) from "NaukriImport" where "workspaceId" is null
union all select 'NaukriCandidate', count(*) from "NaukriCandidate" where "workspaceId" is null
union all select 'SavedSearch', count(*) from "SavedSearch" where "workspaceId" is null
union all select 'VoiceScreening', count(*) from "VoiceScreening" where "workspaceId" is null
union all select 'WhatsAppTemplate', count(*) from "WhatsAppTemplate" where "workspaceId" is null
union all select 'WhatsAppMessage', count(*) from "WhatsAppMessage" where "workspaceId" is null
union all select 'EmailCampaign', count(*) from "EmailCampaign" where "workspaceId" is null
union all select 'CampaignRecipient', count(*) from "CampaignRecipient" where "workspaceId" is null
union all select 'CalendarConnection', count(*) from "CalendarConnection" where "workspaceId" is null
union all select 'EmailTemplate', count(*) from "EmailTemplate" where "workspaceId" is null
union all select 'EmailLog', count(*) from "EmailLog" where "workspaceId" is null
union all select 'Note', count(*) from "Note" where "workspaceId" is null
union all select 'ActivityLog', count(*) from "ActivityLog" where "workspaceId" is null;
```

Expected:

- Every count is zero.
- `Client` and `CompanyProfile` are intentionally excluded because they may remain organization-scoped.

### 8.5 Parent/Child Tenant Consistency

Jobs with client organization mismatch:

```sql
select j.id, j.title, j."organizationId" as job_org, c."organizationId" as client_org
from "Job" j
join "Client" c on c.id = j."clientId"
where j."organizationId" is distinct from c."organizationId";
```

Applications with candidate/job mismatch:

```sql
select a.id, a."organizationId" as app_org, c."organizationId" as candidate_org, j."organizationId" as job_org
from "Application" a
join "Candidate" c on c.id = a."candidateId"
join "Job" j on j.id = a."jobId"
where a."organizationId" is distinct from c."organizationId"
   or a."organizationId" is distinct from j."organizationId";
```

Interviews with application mismatch:

```sql
select i.id, i."organizationId" as interview_org, a."organizationId" as app_org
from "Interview" i
join "Application" a on a.id = i."applicationId"
where i."organizationId" is distinct from a."organizationId";
```

Offers with application mismatch:

```sql
select o.id, o."organizationId" as offer_org, a."organizationId" as app_org
from "Offer" o
join "Application" a on a.id = o."applicationId"
where o."organizationId" is distinct from a."organizationId";
```

Expected:

- All result sets are empty.

### 8.6 Duplicate Checks For Future Scoped Uniques

Candidate email duplicates:

```sql
select "organizationId", lower(email) as normalized_email, count(*) as duplicate_count
from "Candidate"
where email is not null
group by "organizationId", lower(email)
having count(*) > 1;
```

Client name duplicates:

```sql
select "organizationId", lower(name) as normalized_name, count(*) as duplicate_count
from "Client"
where name is not null
group by "organizationId", lower(name)
having count(*) > 1;
```

Integration provider duplicates:

```sql
select "organizationId", "workspaceId", provider, count(*) as duplicate_count
from "IntegrationSetting"
group by "organizationId", "workspaceId", provider
having count(*) > 1;
```

WhatsApp template duplicates:

```sql
select "organizationId", lower(name) as normalized_name, count(*) as duplicate_count
from "WhatsAppTemplate"
group by "organizationId", lower(name)
having count(*) > 1;
```

Email template duplicates:

```sql
select "organizationId", lower(name) as normalized_name, count(*) as duplicate_count
from "EmailTemplate"
group by "organizationId", lower(name)
having count(*) > 1;
```

Expected:

- All result sets are empty before later scoped unique constraints are enforced.

### 8.7 Row Count Preservation

Capture row counts before and after backfill:

```sql
select 'User' as table_name, count(*) from "User"
union all select 'Client', count(*) from "Client"
union all select 'Job', count(*) from "Job"
union all select 'Candidate', count(*) from "Candidate"
union all select 'Application', count(*) from "Application"
union all select 'Interview', count(*) from "Interview"
union all select 'Offer', count(*) from "Offer"
union all select 'Prospect', count(*) from "Prospect"
union all select 'Project', count(*) from "Project"
union all select 'Note', count(*) from "Note"
union all select 'ActivityLog', count(*) from "ActivityLog"
union all select 'NaukriImport', count(*) from "NaukriImport"
union all select 'NaukriCandidate', count(*) from "NaukriCandidate"
union all select 'VoiceScreening', count(*) from "VoiceScreening"
union all select 'WhatsAppMessage', count(*) from "WhatsAppMessage"
union all select 'EmailCampaign', count(*) from "EmailCampaign"
union all select 'EmailLog', count(*) from "EmailLog";
```

Expected:

- Business table row counts remain unchanged.
- New tenant tables gain rows only for organization, workspace, roles, permissions, and memberships.

## 9. Rollback Strategy

### 9.1 Preferred Rollback

Preferred rollback is to leave backfilled tenant data in place and disable any tenant-context application behavior.

Reason:

- Week 2 backfill writes additive IDs into nullable columns.
- Existing application code should continue to ignore those columns until Week 3 tenant enforcement.
- Removing backfilled values creates more operational risk than leaving them unused.

### 9.2 Snapshot Restore

Use snapshot restore if:

- Backfill corrupts existing business data.
- Backfill changes row counts unexpectedly.
- Backfill links records to wrong organization/workspace.
- Existing login or critical workflows fail and cannot be quickly explained.

Required before production backfill:

- Neon branch/snapshot created.
- Schema dump captured.
- Pre-backfill row counts captured.
- Current deployed application commit recorded.

Restore approach:

1. Stop writes or place app in maintenance mode.
2. Restore the pre-backfill Neon snapshot to a new branch.
3. Validate restored row counts.
4. Repoint application to restored branch or promote restored branch.
5. Re-run smoke tests.

### 9.3 Manual Rollback Option

Manual rollback should be staging-only unless reviewed by a DBA.

If needed, manual rollback would:

1. Set `organizationId` and `workspaceId` back to null on backfilled business tables.
2. Set `User.defaultOrganizationId` and `User.defaultWorkspaceId` back to null.
3. Delete `WorkspaceMembership` rows for the default workspace.
4. Delete `OrganizationMembership` rows for the default organization.
5. Delete `RolePermission` rows for default roles.
6. Delete default roles.
7. Delete Week 2-created permissions only if they are not used elsewhere.
8. Delete default workspace.
9. Delete default organization.

Do not use manual rollback if Week 3 or later has already enforced tenant context or created tenant-specific records.

### 9.4 Idempotency As Rollback Protection

The backfill should be safe to rerun.

Rerun behavior:

- Existing organization is reused.
- Existing workspace is reused.
- Existing roles are reused.
- Existing permissions are reused.
- Existing memberships are reused.
- Existing non-null tenant IDs are not overwritten unless they match the default tenant or an explicit repair mode is approved.

## 10. Acceptance Criteria

Week 2 backfill is accepted only when all criteria below are met in staging first and then production.

### 10.1 Default Organization Acceptance

- Exactly one default organization exists for the legacy tenant.
- Default organization slug is `careerpaths`.
- Default organization is `ACTIVE`.
- Default organization type is `AGENCY`.
- Default organization uses `INR` and `Asia/Kolkata`.

### 10.2 Default Workspace Acceptance

- Exactly one default workspace exists under the default organization.
- Default workspace slug is `default`.
- Default workspace is `ACTIVE`.
- Default workspace type is `DEFAULT`.

### 10.3 User Acceptance

- Every user has `defaultOrganizationId`.
- Every user has `defaultWorkspaceId`.
- Every user has one organization membership in the default organization.
- Every user has one workspace membership in the default workspace unless the team explicitly chooses to exclude client/candidate users.
- Current `User.role`, `clientId`, and `candidateId` are unchanged.
- Inactive users are mapped to suspended memberships.

### 10.4 Candidate Acceptance

- Every candidate has default `organizationId`.
- Every candidate has default `workspaceId`.
- Candidate child records have tenant IDs:
  - `Project`
  - `Note`
  - `EmailLog`
  - `WhatsAppMessage`
  - `VoiceScreening`
- Candidate row count is unchanged.
- No new candidate email duplicates exist inside the default organization.

### 10.5 Client/Company Acceptance

- Every client has default `organizationId`.
- Client row count is unchanged.
- Company profile has default `organizationId`.
- No new client name duplicates exist inside the default organization.
- Client-linked users remain linked to the same clients.

### 10.6 Job/Requisition Acceptance

- Every job has default `organizationId`.
- Every job has default `workspaceId`.
- Every job's linked client belongs to the same organization.
- Job row count is unchanged.
- Job postings inherit tenant context from jobs.

### 10.7 Application/Pipeline Acceptance

- Every application has default `organizationId`.
- Every application has default `workspaceId`.
- Every application's candidate and job belong to the same organization.
- Every interview inherits tenant context from application.
- Every offer inherits tenant context from application.
- Application, interview, and offer row counts are unchanged.

### 10.8 Validation Acceptance

- Missing organization query returns zero for all tenant-owned tables.
- Missing workspace query returns zero for all workspace-scoped tables.
- Parent/child mismatch queries return no rows.
- Duplicate checks return no rows.
- Row counts before and after backfill match for all existing business tables.
- Backfill can be run twice without creating duplicate organizations, workspaces, roles, permissions, or memberships.

### 10.9 Operational Acceptance

- Backfill is tested on a Neon staging branch created from production.
- Staging validation report is saved.
- Production snapshot exists before production backfill.
- Production validation report is saved.
- Existing application behavior remains unchanged after backfill.

## Final Recommendation

Use a single default organization and single default workspace to preserve the current single-tenant production behavior. Backfill parent records first, then derive tenant context for child records from their parents wherever possible. Treat fallback-to-default cases as reportable exceptions, not silent successes.

Run the full process on a Neon staging branch before production. Production backfill should proceed only after row counts, missing tenant fields, duplicate checks, and parent/child consistency checks all pass in staging.
