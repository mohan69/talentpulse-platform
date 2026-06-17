# Baseline And Staging Runbook

Purpose:

Create a safe, exact runbook to baseline the existing Neon schema, apply `001_tenant_foundation_additive` on a Neon staging branch, run the Week 2 tenant backfill script, capture validation output, and prepare for production rollout only after staging succeeds.

Current context:

- Week 1 schema migration exists:
  - `prisma/migrations/001_tenant_foundation_additive/migration.sql`
- Week 2 backfill script exists:
  - `scripts/week2-tenant-backfill.ts`
- Connected Neon DB does not yet have tenant foundation tables/columns.
- A baseline migration is needed before `001_tenant_foundation_additive` can be deployed safely with Prisma Migrate.

Hard rules:

- Do not run `prisma migrate reset`.
- Do not run `prisma db push` against staging or production.
- Do not run `prisma migrate dev` against staging or production.
- Do not apply anything to production until staging completes successfully.
- Use a Neon staging branch created from production for all first runs.
- Capture outputs before and after every production-impacting step.

## 1. Environment Setup

### 1.1 Git Bash Variables

Run from repo root:

```bash
cd /c/Users/mohan/development/cloudcxo/cloudcxo_recruitment/nextjs_space
```

Set staging database URL:

```bash
export DATABASE_URL='postgresql://USER:PASSWORD@HOST/neondb?sslmode=require'
```

Optional direct URL for `pg_dump` if Neon pooled URL is problematic:

```bash
export DIRECT_DATABASE_URL='postgresql://USER:PASSWORD@DIRECT_HOST/neondb?sslmode=require'
```

### 1.2 Windows PowerShell Variables

Run from repo root:

```powershell
Set-Location "C:\Users\mohan\development\cloudcxo\cloudcxo_recruitment\nextjs_space"
```

Set staging database URL:

```powershell
$env:DATABASE_URL = "postgresql://USER:PASSWORD@HOST/neondb?sslmode=require"
```

Optional direct URL:

```powershell
$env:DIRECT_DATABASE_URL = "postgresql://USER:PASSWORD@DIRECT_HOST/neondb?sslmode=require"
```

## 2. Preflight Safety Checks

### 2.1 Verify Current Git State

Git Bash:

```bash
git status --short
```

PowerShell:

```powershell
git status --short
```

Safety gate:

- Confirm expected local files are present.
- Do not continue if there are unexpected schema or migration changes.

Expected important files:

```text
prisma/schema.prisma
prisma/migrations/001_tenant_foundation_additive/migration.sql
scripts/week2-tenant-backfill.ts
```

### 2.2 Verify Target Database Is Staging

Git Bash:

```bash
npx prisma db execute --stdin <<'SQL'
select current_database() as database_name,
       current_schema() as schema_name,
       current_user as db_user,
       now() as checked_at;
SQL
```

PowerShell:

```powershell
@"
select current_database() as database_name,
       current_schema() as schema_name,
       current_user as db_user,
       now() as checked_at;
"@ | npx prisma db execute --stdin
```

Safety gate:

- Confirm this is the Neon staging branch, not production.
- Stop immediately if the host/branch is uncertain.

### 2.3 Verify Existing Tenant Foundation Is Not Present

Git Bash:

```bash
npx prisma db execute --stdin <<'SQL'
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
SQL
```

PowerShell:

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

Expected before `001`:

- No rows, or only rows from a previous staging attempt that has been intentionally reviewed.

### 2.4 Capture Pre-Run Row Counts

Git Bash:

```bash
mkdir -p artifacts/migration-staging
npx prisma db execute --stdin <<'SQL' | tee artifacts/migration-staging/pre_row_counts.txt
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
SQL
```

PowerShell:

```powershell
New-Item -ItemType Directory -Force "artifacts\migration-staging" | Out-Null
@"
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
"@ | npx prisma db execute --stdin | Tee-Object -FilePath "artifacts\migration-staging\pre_row_counts.txt"
```

Safety gate:

- Save this output.
- Do not continue if core tables are unexpectedly empty or inaccessible.

## 3. Create Or Verify `000_baseline_existing_production_schema`

The baseline migration represents the existing schema before Week 1 tenant changes.

### 3.1 Create Baseline Folder

Git Bash:

```bash
mkdir -p prisma/migrations/000_baseline_existing_production_schema
```

PowerShell:

```powershell
New-Item -ItemType Directory -Force "prisma\migrations\000_baseline_existing_production_schema" | Out-Null
```

### 3.2 Generate Baseline SQL From Staging Neon

Use this when staging is a fresh branch from production and is the source of truth.

Git Bash:

```bash
npx prisma migrate diff \
  --from-empty \
  --to-url "$DATABASE_URL" \
  --script > prisma/migrations/000_baseline_existing_production_schema/migration.sql
```

PowerShell:

```powershell
npx prisma migrate diff `
  --from-empty `
  --to-url "$env:DATABASE_URL" `
  --script > "prisma\migrations\000_baseline_existing_production_schema\migration.sql"
```

Safety gate:

- Open and review the generated baseline SQL.
- It should create the existing pre-tenant tables/enums/indexes.
- It should not contain tenant foundation additions from `001`.
- It should not be applied to the staging DB because the DB already has this schema.

### 3.3 Verify Migration Folder Order

Git Bash:

```bash
ls -1 prisma/migrations
```

PowerShell:

```powershell
Get-ChildItem "prisma\migrations" | Select-Object Name
```

Expected order:

```text
000_baseline_existing_production_schema
001_tenant_foundation_additive
```

Safety gate:

- Do not continue if `001_tenant_foundation_additive` sorts before the baseline.

### 3.4 Validate Prisma Schema Locally

Git Bash:

```bash
npx prisma validate
```

PowerShell:

```powershell
npx prisma validate
```

Safety gate:

- Must pass.

## 4. Mark Baseline As Applied On Neon Staging

This step writes only Prisma migration history. It must not create/drop application tables.

### 4.1 Check Migration Status Before Resolve

Git Bash:

```bash
npx prisma migrate status | tee artifacts/migration-staging/status_before_baseline_resolve.txt
```

PowerShell:

```powershell
npx prisma migrate status | Tee-Object -FilePath "artifacts\migration-staging\status_before_baseline_resolve.txt"
```

Expected:

- Prisma may report drift or pending migrations before baseline is resolved.
- Confirm target is still staging.

### 4.2 Mark Baseline Applied

Git Bash:

```bash
npx prisma migrate resolve --applied 000_baseline_existing_production_schema
```

PowerShell:

```powershell
npx prisma migrate resolve --applied 000_baseline_existing_production_schema
```

Safety gate:

- Run only on staging branch.
- Do not run this against production until staging has completed successfully and production rollout is approved.

### 4.3 Check Migration Status After Resolve

Git Bash:

```bash
npx prisma migrate status | tee artifacts/migration-staging/status_after_baseline_resolve.txt
```

PowerShell:

```powershell
npx prisma migrate status | Tee-Object -FilePath "artifacts\migration-staging\status_after_baseline_resolve.txt"
```

Expected:

- `000_baseline_existing_production_schema` is considered applied.
- `001_tenant_foundation_additive` is pending.
- Prisma must not ask to reset the database.

No-go:

- Stop if Prisma still reports unexplained drift or requests reset.

## 5. Apply `001_tenant_foundation_additive` On Staging

### 5.1 Review `001` Before Deploy

Git Bash:

```bash
grep -Ei 'drop table|drop column|truncate|delete from|alter table .* set not null' prisma/migrations/001_tenant_foundation_additive/migration.sql || true
```

PowerShell:

```powershell
Select-String -Path "prisma\migrations\001_tenant_foundation_additive\migration.sql" -Pattern "drop table|drop column|truncate|delete from|alter table .* set not null" -CaseSensitive:$false
```

Expected:

- No destructive statements.
- `001` should be additive: create enums/tables, add nullable columns, add indexes.

Safety gate:

- Stop if destructive statements appear unexpectedly.

### 5.2 Deploy Pending Migration

Git Bash:

```bash
npx prisma migrate deploy | tee artifacts/migration-staging/deploy_001_output.txt
```

PowerShell:

```powershell
npx prisma migrate deploy | Tee-Object -FilePath "artifacts\migration-staging\deploy_001_output.txt"
```

Expected:

- `001_tenant_foundation_additive` applies successfully.

### 5.3 Confirm Status After `001`

Git Bash:

```bash
npx prisma migrate status | tee artifacts/migration-staging/status_after_001.txt
```

PowerShell:

```powershell
npx prisma migrate status | Tee-Object -FilePath "artifacts\migration-staging\status_after_001.txt"
```

Expected:

- Database schema is up to date.
- No pending migrations.

### 5.4 Verify Tenant Tables And Columns Exist

Git Bash:

```bash
npx prisma db execute --stdin <<'SQL' | tee artifacts/migration-staging/tenant_schema_check.txt
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

select table_name, column_name, is_nullable
from information_schema.columns
where table_schema = 'public'
  and column_name in ('organizationId', 'workspaceId', 'defaultOrganizationId', 'defaultWorkspaceId')
order by table_name, column_name;
SQL
```

PowerShell:

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

select table_name, column_name, is_nullable
from information_schema.columns
where table_schema = 'public'
  and column_name in ('organizationId', 'workspaceId', 'defaultOrganizationId', 'defaultWorkspaceId')
order by table_name, column_name;
"@ | npx prisma db execute --stdin | Tee-Object -FilePath "artifacts\migration-staging\tenant_schema_check.txt"
```

Expected:

- Tenant foundation tables exist.
- Tenant columns exist.
- Tenant columns are nullable before Week 2 backfill.

## 6. Run Week 2 Backfill On Staging

Use the Week 2 script:

```text
scripts/week2-tenant-backfill.ts
```

Modes:

- `dry-run`: read-only plan preview
- `report`: read-only current state report
- `validate`: read-only validation checks
- `apply`: writes default tenant, memberships, and tenant IDs

### 6.1 Dry Run

Git Bash:

```bash
npx tsx --require dotenv/config scripts/week2-tenant-backfill.ts --mode=dry-run | tee artifacts/migration-staging/week2_dry_run.txt
```

PowerShell:

```powershell
npx tsx --require dotenv/config scripts/week2-tenant-backfill.ts --mode=dry-run | Tee-Object -FilePath "artifacts\migration-staging\week2_dry_run.txt"
```

Expected:

- Status is ready.
- Shows planned writes.
- Writes executed: zero.

No-go:

- Stop if it reports `NOT_READY` after `001` has supposedly applied.

### 6.2 Report Before Apply

Git Bash:

```bash
npx tsx --require dotenv/config scripts/week2-tenant-backfill.ts --mode=report | tee artifacts/migration-staging/week2_report_before_apply.txt
```

PowerShell:

```powershell
npx tsx --require dotenv/config scripts/week2-tenant-backfill.ts --mode=report | Tee-Object -FilePath "artifacts\migration-staging\week2_report_before_apply.txt"
```

Expected:

- Default organization may not exist yet.
- Rows missing `organizationId` and `workspaceId` are expected before apply.

### 6.3 Validate Before Apply

Git Bash:

```bash
npx tsx --require dotenv/config scripts/week2-tenant-backfill.ts --mode=validate | tee artifacts/migration-staging/week2_validate_before_apply.txt
```

PowerShell:

```powershell
npx tsx --require dotenv/config scripts/week2-tenant-backfill.ts --mode=validate | Tee-Object -FilePath "artifacts\migration-staging\week2_validate_before_apply.txt"
```

Expected:

- Validation should fail before apply because tenant IDs are not yet backfilled.
- This is useful baseline evidence.

### 6.4 Apply Backfill

Safety checks before apply:

- Confirm this is staging.
- Confirm Neon branch is disposable or restorable.
- Confirm pre-run row counts were captured.
- Confirm dry-run/report/validate outputs are saved.
- Confirm `001` is applied and migration status is clean.

Git Bash:

```bash
npx tsx --require dotenv/config scripts/week2-tenant-backfill.ts --mode=apply | tee artifacts/migration-staging/week2_apply.txt
```

PowerShell:

```powershell
npx tsx --require dotenv/config scripts/week2-tenant-backfill.ts --mode=apply | Tee-Object -FilePath "artifacts\migration-staging\week2_apply.txt"
```

Expected:

- Creates or reuses one default organization.
- Creates or reuses one default workspace.
- Creates or reuses roles, permissions, role-permission links.
- Creates or reuses organization/workspace memberships.
- Fills null tenant IDs.
- Prints validation result.

### 6.5 Re-Run Backfill To Prove Idempotency

Git Bash:

```bash
npx tsx --require dotenv/config scripts/week2-tenant-backfill.ts --mode=apply | tee artifacts/migration-staging/week2_apply_second_run.txt
```

PowerShell:

```powershell
npx tsx --require dotenv/config scripts/week2-tenant-backfill.ts --mode=apply | Tee-Object -FilePath "artifacts\migration-staging\week2_apply_second_run.txt"
```

Expected:

- No duplicate organization.
- No duplicate workspace.
- No duplicate memberships.
- Business row counts unchanged.
- Validation still passes.

### 6.6 Report After Apply

Git Bash:

```bash
npx tsx --require dotenv/config scripts/week2-tenant-backfill.ts --mode=report | tee artifacts/migration-staging/week2_report_after_apply.txt
```

PowerShell:

```powershell
npx tsx --require dotenv/config scripts/week2-tenant-backfill.ts --mode=report | Tee-Object -FilePath "artifacts\migration-staging\week2_report_after_apply.txt"
```

Expected:

- Default organization ID present.
- Default workspace ID present.
- Missing tenant fields should be zero.

### 6.7 Validate After Apply

Git Bash:

```bash
npx tsx --require dotenv/config scripts/week2-tenant-backfill.ts --mode=validate | tee artifacts/migration-staging/week2_validate_after_apply.txt
```

PowerShell:

```powershell
npx tsx --require dotenv/config scripts/week2-tenant-backfill.ts --mode=validate | Tee-Object -FilePath "artifacts\migration-staging\week2_validate_after_apply.txt"
```

Expected:

- `Validation result: PASS`
- All missing tenant checks pass.
- Membership checks pass.
- Duplicate checks pass.
- Parent/child consistency checks pass.

No-go:

- Stop if any validation check fails.

## 7. Capture Validation Output

### 7.1 Capture Post-Backfill Row Counts

Git Bash:

```bash
npx prisma db execute --stdin <<'SQL' | tee artifacts/migration-staging/post_row_counts.txt
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
SQL
```

PowerShell:

```powershell
@"
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
"@ | npx prisma db execute --stdin | Tee-Object -FilePath "artifacts\migration-staging\post_row_counts.txt"
```

Compare pre/post row counts manually.

Expected:

- Existing business table row counts are unchanged.
- New tenant tables have expected rows.

### 7.2 Capture Migration History

Git Bash:

```bash
npx prisma db execute --stdin <<'SQL' | tee artifacts/migration-staging/prisma_migration_history.txt
select migration_name, started_at, finished_at, rolled_back_at
from public._prisma_migrations
order by started_at;
SQL
```

PowerShell:

```powershell
@"
select migration_name, started_at, finished_at, rolled_back_at
from public._prisma_migrations
order by started_at;
"@ | npx prisma db execute --stdin | Tee-Object -FilePath "artifacts\migration-staging\prisma_migration_history.txt"
```

Expected:

- `000_baseline_existing_production_schema` present and applied.
- `001_tenant_foundation_additive` present and applied.
- No `rolled_back_at` values.

### 7.3 Run Prisma And Build Validation

Git Bash:

```bash
npx prisma validate | tee artifacts/migration-staging/prisma_validate.txt
npm run build | tee artifacts/migration-staging/npm_build.txt
```

PowerShell:

```powershell
npx prisma validate | Tee-Object -FilePath "artifacts\migration-staging\prisma_validate.txt"
npm run build | Tee-Object -FilePath "artifacts\migration-staging\npm_build.txt"
```

Expected:

- Prisma validation passes.
- Build passes.

## 8. Staging Smoke Tests

After migration and backfill:

- Login as admin.
- Open admin dashboard.
- List candidates.
- Open candidate detail.
- List clients.
- List jobs.
- Open job detail.
- Open pipeline.
- Open reports.
- Open analytics.
- Open recruiter portal.
- Open client portal.
- Open candidate portal.
- Confirm no obvious runtime errors.

Safety gate:

- Do not prepare production rollout if any current workflow breaks on staging.

## 9. Prepare Production Rollout Only After Staging Passes

Production rollout preparation begins only when all staging artifacts exist and pass review.

Required staging artifacts:

- `artifacts/migration-staging/pre_row_counts.txt`
- `artifacts/migration-staging/status_before_baseline_resolve.txt`
- `artifacts/migration-staging/status_after_baseline_resolve.txt`
- `artifacts/migration-staging/deploy_001_output.txt`
- `artifacts/migration-staging/status_after_001.txt`
- `artifacts/migration-staging/tenant_schema_check.txt`
- `artifacts/migration-staging/week2_dry_run.txt`
- `artifacts/migration-staging/week2_report_before_apply.txt`
- `artifacts/migration-staging/week2_validate_before_apply.txt`
- `artifacts/migration-staging/week2_apply.txt`
- `artifacts/migration-staging/week2_apply_second_run.txt`
- `artifacts/migration-staging/week2_report_after_apply.txt`
- `artifacts/migration-staging/week2_validate_after_apply.txt`
- `artifacts/migration-staging/post_row_counts.txt`
- `artifacts/migration-staging/prisma_migration_history.txt`
- `artifacts/migration-staging/prisma_validate.txt`
- `artifacts/migration-staging/npm_build.txt`

Production prep checklist:

- Staging `week2_validate_after_apply.txt` shows pass.
- Staging row counts are unchanged for existing business tables.
- Staging migration history is clean.
- Staging smoke tests pass.
- `000_baseline_existing_production_schema` and `001_tenant_foundation_additive` are committed and reviewed.
- Production Neon snapshot plan is confirmed.
- Production maintenance/low-traffic window is selected.
- Rollback owner is assigned.

No-go for production:

- Any staging validation failure.
- Any unexplained row count change.
- Any broken login or core workflow.
- Any uncertainty about production DB URL.
- Any missing production snapshot plan.

## 10. Production Rollout Outline

This runbook does not execute production rollout. It only prepares for it.

When approved, production should follow the same order:

1. Confirm production database target.
2. Capture production snapshot.
3. Capture production pre-row counts.
4. Mark baseline applied on production:

```bash
npx prisma migrate resolve --applied 000_baseline_existing_production_schema
```

5. Apply `001`:

```bash
npx prisma migrate deploy
```

6. Run Week 2:

```bash
npx tsx --require dotenv/config scripts/week2-tenant-backfill.ts --mode=dry-run
npx tsx --require dotenv/config scripts/week2-tenant-backfill.ts --mode=report
npx tsx --require dotenv/config scripts/week2-tenant-backfill.ts --mode=validate
npx tsx --require dotenv/config scripts/week2-tenant-backfill.ts --mode=apply
npx tsx --require dotenv/config scripts/week2-tenant-backfill.ts --mode=apply
npx tsx --require dotenv/config scripts/week2-tenant-backfill.ts --mode=report
npx tsx --require dotenv/config scripts/week2-tenant-backfill.ts --mode=validate
```

7. Capture post-row counts.
8. Run Prisma validation and build.
9. Smoke test production.

Production safety gate:

- Do not run production until staging artifacts are reviewed and accepted.

## 11. Emergency Stop Conditions

Stop immediately if:

- Command points to production while intending staging.
- Prisma requests database reset.
- `001` contains destructive SQL.
- `migrate deploy` fails.
- Week 2 dry-run reports `NOT_READY` after `001` is applied.
- Week 2 apply changes business row counts.
- Week 2 final validation fails.
- App login breaks.
- Candidate/job/application counts change unexpectedly.

Preferred recovery:

- Do not run manual destructive rollback.
- Restore Neon branch/snapshot if data integrity is at risk.
- If issue is application-only, keep additive schema in place and roll back app deployment.

## Final Go Criteria For Production Preparation

Production rollout can be prepared only when:

- Baseline migration exists and is reviewed.
- Staging baseline resolve succeeds.
- Staging `001` deploy succeeds.
- Week 2 dry-run/report/validate/apply sequence completes.
- Week 2 second apply proves idempotency.
- Final Week 2 validation passes.
- Existing row counts are unchanged.
- Prisma validation passes.
- Build passes.
- Staging smoke tests pass.
