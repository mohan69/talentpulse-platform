# STAGING_EXECUTION_CHECKLIST

## Reviewer Scope

This checklist is for staging execution only. It assumes:

- Week 1 migration exists at `prisma/migrations/001_tenant_foundation_additive/migration.sql`.
- Week 2 backfill script exists at `scripts/week2-tenant-backfill.ts`.
- Build and Prisma validation currently pass locally.
- The connected Neon database does not yet have tenant foundation tables or columns.
- Staging migration execution has not yet been performed.

Do not run production steps until every staging gate below is complete and signed off.

---

## 1. Exact Pre-Flight Checks

### Repository State

- [ ] Confirm working directory:

```powershell
pwd
```

- [ ] Confirm the expected project path:

```text
C:\Users\mohan\development\cloudcxo\cloudcxo_recruitment\nextjs_space
```

- [ ] Confirm no unexpected code, schema, or migration changes are present:

```powershell
git status --short
```

- [ ] Confirm `prisma/schema.prisma` exists:

```powershell
Test-Path .\prisma\schema.prisma
```

- [ ] Confirm Week 1 migration exists:

```powershell
Test-Path .\prisma\migrations\001_tenant_foundation_additive\migration.sql
```

- [ ] Confirm Week 2 backfill script exists:

```powershell
Test-Path .\scripts\week2-tenant-backfill.ts
```

- [ ] Confirm baseline migration folder status:

```powershell
Get-ChildItem .\prisma\migrations | Select-Object Name
```

Expected before staging execution:

- `000_baseline_existing_production_schema` must exist before `migrate resolve`.
- `001_tenant_foundation_additive` must exist after the baseline folder.

No-Go if `000_baseline_existing_production_schema` is missing at execution time.

### Local Validation

- [ ] Prisma schema validates:

```powershell
npx prisma validate
```

- [ ] Application build passes:

```powershell
npm run build
```

- [ ] Prisma migration status can connect to the intended database:

```powershell
npx prisma migrate status
```

No-Go if Prisma suggests database reset, destructive drift handling, or an unexpected target database.

---

## 2. Neon Staging Branch Creation Checklist

### Branch Creation

- [ ] Create a new Neon branch from the current production branch.
- [ ] Use a clear branch name, for example:

```text
staging-m1-baseline-backfill
```

- [ ] Record the following:

```text
Neon project:
Production branch:
Staging branch:
Staging branch ID:
Created by:
Created at:
Source snapshot timestamp:
```

- [ ] Confirm the staging branch was created from production, not from another stale branch.
- [ ] Confirm the staging branch contains production-like data required for migration validation.
- [ ] Confirm production remains untouched.

### Branch Safety

- [ ] Confirm staging branch connection strings are copied from the staging branch only.
- [ ] Confirm any pooled and direct connection strings are labeled clearly.
- [ ] Confirm production branch connection strings are not present in the active terminal history for this run.

No-Go if the staging branch source, branch ID, or connection string cannot be verified.

---

## 3. DATABASE_URL Verification Checklist

### PowerShell Setup

- [ ] Set the staging `DATABASE_URL` explicitly in the current PowerShell session:

```powershell
$env:DATABASE_URL="postgresql://USER:PASSWORD@HOST.neon.tech/DB?sslmode=require"
```

- [ ] Do not rely on an existing `.env` value unless it has been reviewed and confirmed as staging.

### Git Bash Setup

- [ ] If using Git Bash, set the staging `DATABASE_URL` explicitly:

```bash
export DATABASE_URL='postgresql://USER:PASSWORD@HOST.neon.tech/DB?sslmode=require'
```

### Database Identity Check

- [ ] Verify connection identity:

```powershell
@"
select
  current_database() as database_name,
  current_schema() as schema_name,
  current_user as database_user,
  now() as checked_at;
"@ | npx prisma db execute --stdin
```

- [ ] Verify the host in `DATABASE_URL` matches the Neon staging branch host.
- [ ] Verify the database name matches the expected Neon database.
- [ ] Verify the Neon dashboard shows active connections on the staging branch, not production.
- [ ] Save the verified staging branch ID and connection host in execution notes.

No-Go if there is any uncertainty about whether `DATABASE_URL` points to staging.

---

## 4. Baseline Migration Review Checklist

### Required Baseline State

- [ ] Confirm `000_baseline_existing_production_schema` exists:

```powershell
Test-Path .\prisma\migrations\000_baseline_existing_production_schema\migration.sql
```

- [ ] Confirm migration folder ordering:

```powershell
Get-ChildItem .\prisma\migrations | Sort-Object Name | Select-Object Name
```

Expected order:

```text
000_baseline_existing_production_schema
001_tenant_foundation_additive
```

### Baseline SQL Review

- [ ] Confirm baseline SQL represents the existing production schema only.
- [ ] Confirm baseline SQL does not include tenant foundation additions from `001`.
- [ ] Confirm baseline SQL does not include data mutations.
- [ ] Confirm baseline SQL does not include destructive commands against existing data.
- [ ] Confirm baseline SQL was generated from the current production/staging schema snapshot, not from a stale local schema.

### 001 SQL Review

- [ ] Review `001_tenant_foundation_additive/migration.sql`.
- [ ] Confirm all tenant columns added to existing business tables are nullable.
- [ ] Confirm new tables are additive.
- [ ] Confirm indexes are additive.
- [ ] Confirm no existing table is dropped.
- [ ] Confirm no existing column is dropped.
- [ ] Confirm no existing enum value is removed.

PowerShell destructive keyword scan:

```powershell
Select-String -Path .\prisma\migrations\001_tenant_foundation_additive\migration.sql -Pattern "DROP TABLE","DROP COLUMN","TRUNCATE","DELETE FROM","ALTER COLUMN .* SET NOT NULL" -CaseSensitive:$false
```

Expected result:

- No destructive statements against existing production data.

No-Go if the baseline is absent, includes tenant additions, is stale, or contains unreviewed destructive SQL.

---

## 5. Prisma Migration Resolve Checklist

Use `migrate resolve` only to mark the baseline as applied. Do not use it for `001_tenant_foundation_additive`.

### Before Resolve

- [ ] Confirm `DATABASE_URL` points to Neon staging.
- [ ] Confirm baseline migration SQL has been reviewed.
- [ ] Capture current migration status:

```powershell
npx prisma migrate status
```

- [ ] Confirm Prisma does not require or suggest a database reset.
- [ ] Confirm `000_baseline_existing_production_schema` is not already marked applied.

### Resolve Baseline

- [ ] Mark only the baseline as applied:

```powershell
npx prisma migrate resolve --applied 000_baseline_existing_production_schema
```

### After Resolve

- [ ] Confirm migration status:

```powershell
npx prisma migrate status
```

Expected:

- `000_baseline_existing_production_schema` is applied.
- `001_tenant_foundation_additive` remains pending.
- No reset instruction is shown.

- [ ] Verify `_prisma_migrations` contains the baseline:

```powershell
@"
select migration_name, finished_at, rolled_back_at
from "_prisma_migrations"
order by started_at;
"@ | npx prisma db execute --stdin
```

No-Go if Prisma reports drift requiring reset, if the baseline cannot be resolved, or if `001` is accidentally marked applied.

---

## 6. 001 Deployment Verification Checklist

### Deploy 001 on Staging

- [ ] Confirm `DATABASE_URL` points to Neon staging.
- [ ] Confirm migration status shows only `001_tenant_foundation_additive` pending:

```powershell
npx prisma migrate status
```

- [ ] Apply pending migrations:

```powershell
npx prisma migrate deploy
```

### Verify Migration State

- [ ] Confirm Prisma migration status:

```powershell
npx prisma migrate status
```

Expected:

- Database schema is up to date.
- `000_baseline_existing_production_schema` is applied.
- `001_tenant_foundation_additive` is applied.

- [ ] Verify tenant tables exist:

```powershell
@"
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'Organization',
    'Workspace',
    'Role',
    'Permission',
    'RolePermission',
    'OrganizationMembership',
    'WorkspaceMembership',
    'TenantAuditLog'
  )
order by table_name;
"@ | npx prisma db execute --stdin
```

- [ ] Verify tenant columns exist on key tables:

```powershell
@"
select table_name, column_name, is_nullable
from information_schema.columns
where table_schema = 'public'
  and column_name in ('organizationId', 'workspaceId', 'defaultOrganizationId', 'defaultWorkspaceId')
order by table_name, column_name;
"@ | npx prisma db execute --stdin
```

- [ ] Confirm Prisma validation still passes:

```powershell
npx prisma validate
```

- [ ] Confirm build still passes:

```powershell
npm run build
```

No-Go if `001` fails, tenant tables are missing, tenant columns are missing, Prisma validation fails, or build fails.

---

## 7. Week 2 Dry-Run Verification Checklist

### Pre-Dry-Run

- [ ] Confirm `001_tenant_foundation_additive` has been applied to staging.
- [ ] Confirm `DATABASE_URL` points to Neon staging.
- [ ] Capture pre-backfill business row counts.

### Dry Run

- [ ] Run dry-run mode:

```powershell
npx tsx --require dotenv/config .\scripts\week2-tenant-backfill.ts --mode=dry-run
```

Expected:

- Script reports staging schema is ready.
- Script does not report `Status: NOT_READY`.
- Script shows planned default organization/workspace/role/membership actions.
- Script does not write data.
- Script reports candidate, client/company, job/requisition, application/pipeline, and user backfill impact.

### Report Mode

- [ ] Run report mode:

```powershell
npx tsx --require dotenv/config .\scripts\week2-tenant-backfill.ts --mode=report
```

Expected:

- Report mode completes without writing data.
- Report identifies rows missing tenant references before apply.
- No unexpected table access errors occur.

### Validate Mode Before Apply

- [ ] Run validate mode:

```powershell
npx tsx --require dotenv/config .\scripts\week2-tenant-backfill.ts --mode=validate
```

Expected before apply:

- Validation may report missing tenant references.
- Validation must not report schema-not-ready once `001` is applied.

No-Go if dry-run reports `NOT_READY`, accesses production, crashes unexpectedly, or plans changes outside tenant foundation backfill scope.

---

## 8. Week 2 Apply Verification Checklist

### Before Apply

- [ ] Confirm `DATABASE_URL` points to Neon staging.
- [ ] Confirm staging branch snapshot or restore point is available.
- [ ] Confirm pre-apply row counts have been captured.
- [ ] Confirm dry-run output has been reviewed and approved.
- [ ] Confirm report output has been reviewed.
- [ ] Confirm no unexpected code/schema/migration changes were made locally:

```powershell
git status --short
```

### Apply

- [ ] Run apply mode on staging:

```powershell
npx tsx --require dotenv/config .\scripts\week2-tenant-backfill.ts --mode=apply
```

Expected:

- Default organization is created or reused.
- Default workspace is created or reused.
- Default roles and permissions are created or reused.
- Existing users are linked to default organization/workspace.
- Existing tenant-owned rows receive organization/workspace references where applicable.
- No business records are deleted.

### After Apply

- [ ] Run validate mode:

```powershell
npx tsx --require dotenv/config .\scripts\week2-tenant-backfill.ts --mode=validate
```

Expected:

- Validation passes.
- No missing tenant references remain for tables covered by Week 2.
- No duplicate default organization/workspace/role records are created.

- [ ] Run report mode:

```powershell
npx tsx --require dotenv/config .\scripts\week2-tenant-backfill.ts --mode=report
```

Expected:

- Report confirms tenant foundation data is populated.
- Remaining gaps, if any, are known and documented.

No-Go if apply deletes business records, creates duplicate default tenant records, leaves covered rows without tenant references, or fails validation.

---

## 9. Idempotency Verification Checklist

Run the backfill apply more than once on staging before production readiness.

- [ ] Run apply mode a second time:

```powershell
npx tsx --require dotenv/config .\scripts\week2-tenant-backfill.ts --mode=apply
```

- [ ] Run validate mode again:

```powershell
npx tsx --require dotenv/config .\scripts\week2-tenant-backfill.ts --mode=validate
```

- [ ] Confirm no duplicate default organizations:

```powershell
@"
select slug, count(*) as count
from "Organization"
group by slug
having count(*) > 1;
"@ | npx prisma db execute --stdin
```

- [ ] Confirm no duplicate default workspaces:

```powershell
@"
select "organizationId", slug, count(*) as count
from "Workspace"
group by "organizationId", slug
having count(*) > 1;
"@ | npx prisma db execute --stdin
```

- [ ] Confirm no duplicate organization memberships:

```powershell
@"
select "organizationId", "userId", count(*) as count
from "OrganizationMembership"
group by "organizationId", "userId"
having count(*) > 1;
"@ | npx prisma db execute --stdin
```

- [ ] Confirm no duplicate workspace memberships:

```powershell
@"
select "workspaceId", "userId", count(*) as count
from "WorkspaceMembership"
group by "workspaceId", "userId"
having count(*) > 1;
"@ | npx prisma db execute --stdin
```

Expected:

- Second apply completes safely.
- Duplicate checks return zero rows.
- Validation passes after repeated apply.

No-Go if repeated apply changes already-correct rows unexpectedly or creates duplicate tenant records.

---

## 10. Row Count Verification Checklist

Capture counts before migration, after `001`, after first apply, and after second apply.

### Business Tables

- [ ] Capture counts for known business tables:

```powershell
@"
select 'User' as table_name, count(*)::bigint as row_count from "User"
union all select 'Client', count(*)::bigint from "Client"
union all select 'Job', count(*)::bigint from "Job"
union all select 'Candidate', count(*)::bigint from "Candidate"
union all select 'Application', count(*)::bigint from "Application"
union all select 'Interview', count(*)::bigint from "Interview"
union all select 'Offer', count(*)::bigint from "Offer"
union all select 'Prospect', count(*)::bigint from "Prospect"
union all select 'Project', count(*)::bigint from "Project"
union all select 'Note', count(*)::bigint from "Note"
union all select 'ActivityLog', count(*)::bigint from "ActivityLog"
union all select 'NaukriImport', count(*)::bigint from "NaukriImport"
union all select 'NaukriCandidate', count(*)::bigint from "NaukriCandidate"
union all select 'VoiceScreening', count(*)::bigint from "VoiceScreening"
union all select 'WhatsAppMessage', count(*)::bigint from "WhatsAppMessage"
union all select 'EmailCampaign', count(*)::bigint from "EmailCampaign"
union all select 'EmailLog', count(*)::bigint from "EmailLog"
order by table_name;
"@ | npx prisma db execute --stdin
```

Expected:

- Business row counts do not decrease.
- Business row counts should remain unchanged unless the backfill script explicitly and safely creates tenant foundation records only.

### Tenant Foundation Tables

- [ ] Capture counts for tenant foundation tables:

```powershell
@"
select 'Organization' as table_name, count(*)::bigint as row_count from "Organization"
union all select 'Workspace', count(*)::bigint from "Workspace"
union all select 'Role', count(*)::bigint from "Role"
union all select 'Permission', count(*)::bigint from "Permission"
union all select 'RolePermission', count(*)::bigint from "RolePermission"
union all select 'OrganizationMembership', count(*)::bigint from "OrganizationMembership"
union all select 'WorkspaceMembership', count(*)::bigint from "WorkspaceMembership"
union all select 'TenantAuditLog', count(*)::bigint from "TenantAuditLog"
order by table_name;
"@ | npx prisma db execute --stdin
```

Expected:

- Tenant foundation counts increase as expected after apply.
- Counts remain stable after second apply except for explicitly expected audit rows.

### Missing Tenant Reference Checks

- [ ] Verify covered tenant-owned tables have tenant references:

```powershell
@"
select 'Candidate' as table_name, count(*)::bigint as missing_count from "Candidate" where "organizationId" is null
union all select 'Client', count(*)::bigint from "Client" where "organizationId" is null
union all select 'Job', count(*)::bigint from "Job" where "organizationId" is null
union all select 'Application', count(*)::bigint from "Application" where "organizationId" is null
union all select 'User', count(*)::bigint from "User" where "defaultOrganizationId" is null;
"@ | npx prisma db execute --stdin
```

Expected:

- Missing counts are zero for tables covered by Week 2.
- Any non-zero counts are documented with a remediation decision before production.

No-Go if business row counts decrease or covered tenant references remain missing without an approved exception.

---

## 11. Smoke Test Checklist

Perform smoke tests only after `001` deploy and Week 2 backfill validation pass on staging.

### Application Startup

- [ ] Confirm build passes:

```powershell
npm run build
```

- [ ] Start staging-targeted application locally or in staging environment.
- [ ] Confirm application starts without Prisma runtime errors.

### User Flows

- [ ] Login succeeds for an existing admin/user.
- [ ] Dashboard loads.
- [ ] Candidates page loads existing candidates.
- [ ] Candidate profile opens.
- [ ] Clients/companies page loads existing records.
- [ ] Jobs/requisitions page loads existing records.
- [ ] Application/pipeline views load existing records.
- [ ] Sourcing page loads.
- [ ] Search page loads.
- [ ] Memory/activity views load if enabled.
- [ ] Existing reports or analytics pages load if enabled.

### Data Integrity

- [ ] Existing users retain access.
- [ ] Existing candidates are visible.
- [ ] Existing jobs are visible.
- [ ] Existing applications/pipeline records are visible.
- [ ] Existing client/company records are visible.
- [ ] No page shows tenant-related null reference errors.

No-Go if core application pages fail to load, existing data disappears, or Prisma errors occur after migration/backfill.

---

## 12. Production Readiness Checklist

Production rollout is allowed only after staging is complete.

- [ ] Staging branch creation notes are saved.
- [ ] `DATABASE_URL` verification output is saved.
- [ ] Baseline review is signed off.
- [ ] `migrate resolve` output is saved.
- [ ] `migrate deploy` output is saved.
- [ ] `001` verification SQL output is saved.
- [ ] Week 2 dry-run output is saved.
- [ ] Week 2 report output is saved.
- [ ] Week 2 apply output is saved.
- [ ] Week 2 validate output is saved.
- [ ] Idempotency second apply output is saved.
- [ ] Row count comparisons are saved.
- [ ] Smoke test results are saved.
- [ ] Rollback owner is assigned.
- [ ] Production maintenance window is approved.
- [ ] Production Neon backup/snapshot/restore strategy is confirmed.
- [ ] Production `DATABASE_URL` handling plan is reviewed.
- [ ] Production communications plan is approved.
- [ ] Go/No-Go matrix below is marked Go for all required gates.

No-Go if any staging artifact is missing, any validation is unresolved, or rollback ownership is unclear.

---

## 13. Go / No-Go Decision Matrix

| Gate | Go Criteria | No-Go Criteria | Required Action |
|---|---|---|---|
| Repository state | Only expected migration/backfill artifacts exist; no unexpected schema/code changes | Unexpected local changes affect schema, migrations, APIs, auth, routes, or UI | Stop and review diff |
| Staging branch | Neon staging branch is verified from current production snapshot | Branch source, branch ID, or timestamp is uncertain | Recreate or verify branch before proceeding |
| `DATABASE_URL` | Terminal points to verified Neon staging branch | Any uncertainty that URL may point to production | Stop immediately and reset environment |
| Baseline migration | `000_baseline_existing_production_schema` exists, is reviewed, and matches existing production schema | Baseline missing, stale, destructive, or includes `001` tenant additions | Do not resolve; fix baseline process first |
| Prisma resolve | Only baseline is marked applied; `001` remains pending | `001` is marked applied manually or Prisma suggests reset | Stop and investigate migration history |
| `001` deployment | `migrate deploy` succeeds and tenant tables/columns exist | Migration fails or expected tenant objects are missing | Stop and inspect staging DB |
| Prisma/build validation | `npx prisma validate` and `npm run build` pass after `001` | Either command fails | Fix before backfill |
| Week 2 dry-run | Dry-run completes, reports schema ready, and planned writes match scope | `NOT_READY`, crash, production target, or unexpected planned writes | Stop before apply |
| Week 2 apply | Apply completes on staging, creates/reuses default tenant foundation, and deletes no business data | Apply fails, deletes data, or creates unexpected records | Stop and restore staging if needed |
| Idempotency | Second apply completes without duplicate tenant records | Duplicate organization/workspace/membership/role records appear | Fix script before production |
| Row counts | Business table counts do not decrease; tenant table counts are expected | Business row counts decrease or unexplained count changes occur | Stop and reconcile |
| Smoke tests | Core pages and existing records load successfully | Login, candidates, clients, jobs, or pipeline pages fail | Stop and fix before production |
| Rollback readiness | Production rollback owner, backup, and maintenance window are approved | Rollback plan is vague or untested | Do not schedule production |
| Production readiness | All staging outputs are saved and reviewed | Any artifact, validation, or sign-off missing | Hold production rollout |

Final decision:

```text
GO:     All required gates are green, staging evidence is saved, rollback is approved.
NO-GO:  Any required gate is red, uncertain, missing, or not independently reviewed.
```

