# Migration Baseline Plan

Purpose:

Define a safe Prisma/Neon migration baseline strategy before applying `001_tenant_foundation_additive`.

Current state:

- The application uses Prisma with PostgreSQL on Neon.
- The connected Neon database already contains the existing production schema.
- The local `prisma/migrations` folder currently contains `001_tenant_foundation_additive`.
- `001_tenant_foundation_additive` was generated via offline Prisma diff after Week 1 schema changes.
- `001_tenant_foundation_additive` is not a full initial schema migration. It assumes the existing production tables already exist.
- `prisma migrate dev --create-only` previously detected drift/no migration history because the Neon DB schema existed while Prisma Migrate had no baseline history.

Do not apply migrations until the baseline strategy below is completed and validated in staging.

## 1. Inspect Current Database Schema Safely

Inspection must be read-only. Do not run `prisma migrate reset`, `prisma migrate dev`, destructive SQL, or any command that applies schema changes against production.

### 1.1 Confirm Database Target

Local command:

```bash
npx prisma db execute --stdin <<'SQL'
select current_database() as database_name, current_schema() as schema_name, current_user as db_user, now() as inspected_at;
SQL
```

PowerShell equivalent:

```powershell
@"
select current_database() as database_name, current_schema() as schema_name, current_user as db_user, now() as inspected_at;
"@ | npx prisma db execute --stdin
```

Expected:

- Database is the intended Neon database.
- Schema is `public` unless the deployment explicitly uses another schema.

### 1.2 Inspect Existing Tables

PowerShell:

```powershell
@"
select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE'
order by table_name;
"@ | npx prisma db execute --stdin
```

### 1.3 Inspect Existing Prisma Migration History

PowerShell:

```powershell
@"
select to_regclass('public._prisma_migrations') as prisma_migrations_table;
"@ | npx prisma db execute --stdin
```

If `_prisma_migrations` exists:

```powershell
@"
select migration_name, started_at, finished_at, rolled_back_at, logs
from public._prisma_migrations
order by started_at;
"@ | npx prisma db execute --stdin
```

Expected current finding:

- Either `_prisma_migrations` does not exist, or it does not contain a baseline migration.
- `001_tenant_foundation_additive` is not applied.

### 1.4 Capture A Read-Only Schema Snapshot

Use `pg_dump` schema-only if available:

```bash
pg_dump "$DATABASE_URL" --schema=public --schema-only --no-owner --no-privileges > neon_schema_before_baseline.sql
```

If using Neon pooled URL causes issues, use the direct Neon connection string for `pg_dump`.

Also capture table counts:

```powershell
@"
select schemaname, relname as table_name, n_live_tup as estimated_rows
from pg_stat_user_tables
order by relname;
"@ | npx prisma db execute --stdin
```

Store outputs as deployment artifacts. Do not commit credentials.

## 2. Compare Current Prisma Schema vs Neon DB

There are two comparisons needed:

1. Existing Neon DB vs current production Prisma schema before Week 1 changes.
2. Existing Neon DB plus baseline vs Week 1 schema with `001_tenant_foundation_additive`.

### 2.1 Preserve Pre-Week-1 Schema

Because the current working `schema.prisma` already includes Week 1 tenant additions, reconstruct the pre-Week-1 schema from Git:

```powershell
git show HEAD:prisma/schema.prisma > .\tmp_schema_pre_m1.prisma
```

If HEAD already includes the Week 1 schema, use the last deployed commit SHA instead:

```powershell
git show <last_deployed_sha>:prisma/schema.prisma > .\tmp_schema_pre_m1.prisma
```

### 2.2 Compare Neon DB To Pre-Week-1 Prisma Schema

Use Prisma diff from live DB to pre-Milestone schema:

```bash
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel ./tmp_schema_pre_m1.prisma \
  --script > diff_neon_to_pre_m1.sql
```

PowerShell:

```powershell
npx prisma migrate diff `
  --from-url "$env:DATABASE_URL" `
  --to-schema-datamodel ".\tmp_schema_pre_m1.prisma" `
  --script > diff_neon_to_pre_m1.sql
```

Interpretation:

- Empty or near-empty diff means Neon matches the pre-Week-1 Prisma schema.
- Non-empty diff means the baseline must represent the actual Neon schema, not assumptions from the local schema.

### 2.3 Compare Pre-Week-1 Schema To Current Week-1 Schema

This should match the existing `001_tenant_foundation_additive` migration.

```powershell
npx prisma migrate diff `
  --from-schema-datamodel ".\tmp_schema_pre_m1.prisma" `
  --to-schema-datamodel ".\prisma\schema.prisma" `
  --script > diff_pre_m1_to_current.sql
```

Compare:

```powershell
fc .\diff_pre_m1_to_current.sql .\prisma\migrations\001_tenant_foundation_additive\migration.sql
```

Expected:

- The generated diff should materially match `001_tenant_foundation_additive`.
- Minor formatting differences are acceptable.
- Structural differences require review before deployment.

## 3. Tool Choice: migrate diff, db pull, migrate resolve

### Use `prisma migrate diff`

Use for:

- Generating a baseline SQL migration from an existing schema.
- Comparing Neon DB to Prisma datamodels.
- Verifying that `001_tenant_foundation_additive` represents only Week 1 additive changes.

Recommended:

```bash
npx prisma migrate diff --from-empty --to-url "$DATABASE_URL" --script
```

This generates a SQL representation of the current database schema from empty.

### Use `prisma db pull` Only For Inspection, Not As The Main Baseline Tool

`prisma db pull` introspects the database and writes a Prisma schema file. It is useful to inspect the actual Neon schema, but it can overwrite `prisma/schema.prisma` if used carelessly.

Safe pattern:

```powershell
Copy-Item .\prisma\schema.prisma .\tmp_introspect_schema.prisma
npx prisma db pull --schema .\tmp_introspect_schema.prisma
```

Use it to inspect differences manually. Do not replace the application schema with introspected output unless a separate review approves it.

### Use `prisma migrate resolve`

Use for:

- Marking the baseline migration as already applied on databases that already have the production schema.

Do not use `migrate resolve` for `001_tenant_foundation_additive` until it has actually been applied, unless applying it manually through reviewed SQL in an emergency.

Correct baseline command:

```bash
npx prisma migrate resolve --applied 000_baseline_existing_production_schema
```

## 4. Baseline Existing Production Schema Without Data Loss

### 4.1 Why A Baseline Is Needed

Prisma Migrate needs migration history. The current Neon DB already has tables, enums, indexes, and constraints, but the repo migration folder does not contain the migration that created them.

`001_tenant_foundation_additive` only adds tenant foundation changes. It is not valid as the first migration for a new empty database because it contains `ALTER TABLE` statements against tables that must already exist.

Therefore, create a baseline migration:

```text
prisma/migrations/000_baseline_existing_production_schema/migration.sql
```

This baseline migration must represent the current pre-Week-1 production schema.

### 4.2 Generate Baseline SQL

Preferred if Neon DB is authoritative:

```bash
npx prisma migrate diff \
  --from-empty \
  --to-url "$DATABASE_URL" \
  --script > prisma/migrations/000_baseline_existing_production_schema/migration.sql
```

PowerShell:

```powershell
New-Item -ItemType Directory -Force .\prisma\migrations\000_baseline_existing_production_schema
npx prisma migrate diff `
  --from-empty `
  --to-url "$env:DATABASE_URL" `
  --script > .\prisma\migrations\000_baseline_existing_production_schema\migration.sql
```

Alternative if the last deployed Prisma schema is authoritative:

```powershell
npx prisma migrate diff `
  --from-empty `
  --to-schema-datamodel ".\tmp_schema_pre_m1.prisma" `
  --script > .\prisma\migrations\000_baseline_existing_production_schema\migration.sql
```

Recommendation:

- If Neon is production truth, baseline from Neon.
- If Neon has accidental manual drift, baseline from the approved last deployed schema and create separate reviewed correction migrations.

### 4.3 Mark Baseline As Applied

On existing staging/production databases that already contain the baseline schema:

```bash
npx prisma migrate resolve --applied 000_baseline_existing_production_schema
```

PowerShell:

```powershell
npx prisma migrate resolve --applied 000_baseline_existing_production_schema
```

This writes migration history only. It does not create/drop application tables.

### 4.4 Validate Baseline Status

```bash
npx prisma migrate status
```

Expected after baseline resolve and before applying Week 1:

- `000_baseline_existing_production_schema` is applied.
- `001_tenant_foundation_additive` is pending.
- No reset prompt.

## 5. Apply `001_tenant_foundation_additive` Safely After Baseline

### 5.1 Preconditions

Before applying `001`:

- Baseline migration exists in repo.
- Baseline is marked applied in target DB.
- `prisma migrate status` shows only `001_tenant_foundation_additive` pending.
- `npx prisma validate` passes.
- `npm run build` passes.
- Staging snapshot exists.
- Production snapshot exists before production deploy.

### 5.2 Apply In Staging First

```bash
npx prisma migrate deploy
```

Expected:

- Prisma applies `001_tenant_foundation_additive`.
- No existing data is modified except nullable columns added with null values.
- New tenant foundation tables are created empty.

### 5.3 Validate Applied Migration

```bash
npx prisma migrate status
npx prisma validate
npm run build
```

Check `_prisma_migrations`:

```powershell
@"
select migration_name, finished_at, rolled_back_at
from public._prisma_migrations
order by started_at;
"@ | npx prisma db execute --stdin
```

Expected:

- `000_baseline_existing_production_schema` has an applied record.
- `001_tenant_foundation_additive` has a finished record.
- `rolled_back_at` is null.

## 6. Staging-First Validation Strategy

### 6.1 Use A Neon Branch

Create a Neon staging branch from production before testing:

```text
production -> staging-migration-baseline-test
```

Use the staging branch connection string in `.env.staging` or the deployment environment.

### 6.2 Staging Steps

1. Capture schema-only dump.
2. Capture row counts.
3. Generate or verify `000_baseline_existing_production_schema`.
4. Run `migrate resolve --applied 000_baseline_existing_production_schema`.
5. Run `prisma migrate status`.
6. Run `prisma migrate deploy`.
7. Run `prisma migrate status`.
8. Run `npx prisma validate`.
9. Run `npm run build`.
10. Smoke test existing application flows.

### 6.3 Staging SQL Validation

Verify new tables:

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

Verify new nullable columns:

```powershell
@"
select table_name, column_name, is_nullable
from information_schema.columns
where table_schema = 'public'
  and column_name in ('organizationId', 'workspaceId', 'defaultOrganizationId', 'defaultWorkspaceId')
order by table_name, column_name;
"@ | npx prisma db execute --stdin
```

Expected:

- Tenant columns exist.
- Tenant columns are nullable.
- Existing row counts are unchanged.

### 6.4 Staging Application Smoke Tests

Existing behavior must still work because Week 1 does not change APIs:

- Login as admin.
- View admin dashboard.
- List candidates.
- View candidate detail.
- List jobs.
- View job detail.
- View pipeline.
- View analytics.
- View reports.
- View recruiter portal.
- View client portal.
- View candidate portal.

## 7. Production Rollout Strategy

### 7.1 Production Preconditions

Go to production only if staging proves:

- Baseline resolve works.
- `001` deploys successfully.
- Build passes.
- Existing pages/API flows still work.
- No data loss.
- Row counts unchanged.
- No destructive SQL appears in `001`.

### 7.2 Production Steps

1. Freeze schema changes.
2. Confirm current deployed commit SHA.
3. Confirm target production `DATABASE_URL`.
4. Capture database snapshot in Neon.
5. Capture schema-only dump.
6. Capture row counts.
7. Deploy repo containing:
   - `000_baseline_existing_production_schema`
   - `001_tenant_foundation_additive`
   - Week 1 `schema.prisma`
8. Mark baseline applied:

```bash
npx prisma migrate resolve --applied 000_baseline_existing_production_schema
```

9. Confirm status:

```bash
npx prisma migrate status
```

10. Apply pending migration:

```bash
npx prisma migrate deploy
```

11. Confirm status again:

```bash
npx prisma migrate status
```

12. Run application smoke tests.
13. Monitor application logs and database metrics.

### 7.3 Production Deployment Notes

- Do not run `prisma migrate dev` in production.
- Do not run `prisma migrate reset`.
- Do not run `prisma db push` against production.
- Use `prisma migrate deploy` only after baseline is resolved.
- Keep maintenance window available even though `001` should be additive.

## 8. Rollback Strategy

### 8.1 Before `001` Is Applied

If baseline resolve causes concern:

- Do not apply `001`.
- Review `_prisma_migrations`.
- If needed, restore from snapshot or manually remove only the baseline row after DBA review.

### 8.2 After `001` Is Applied

Because `001` is additive, preferred rollback is application rollback:

1. Roll back application deployment to previous commit if needed.
2. Leave added nullable columns and empty tenant foundation tables in place.
3. Do not drop columns/tables during an incident unless absolutely necessary.

Reason:

- Existing application code should ignore the new nullable columns/tables.
- Dropping schema during an incident increases risk.

### 8.3 Database Snapshot Restore

Use snapshot restore only if:

- Migration partially applied.
- Database becomes inconsistent.
- Existing workflows fail due to database schema change.
- Data loss/corruption is suspected.

Restore process:

1. Stop writes or put app in maintenance mode.
2. Restore Neon snapshot to a new branch.
3. Validate restored branch.
4. Promote restored branch or update connection string.
5. Re-run smoke tests.

### 8.4 Manual Down Migration

Avoid manual down migrations in production.

If required, a reviewed down script would remove:

- New tenant indexes.
- New tenant columns.
- New tenant foundation tables.
- New tenant enums.
- `001` row from `_prisma_migrations`.

This should be treated as an emergency DBA procedure, not the normal rollback path.

## 9. Exact Commands

## 9.1 Local Commands

Validate Prisma schema:

```bash
npx prisma validate
```

Build:

```bash
npm run build
```

Check migration status:

```bash
npx prisma migrate status
```

Create pre-Milestone schema file:

```powershell
git show HEAD:prisma/schema.prisma > .\tmp_schema_pre_m1.prisma
```

Compare DB to pre-Milestone schema:

```powershell
npx prisma migrate diff `
  --from-url "$env:DATABASE_URL" `
  --to-schema-datamodel ".\tmp_schema_pre_m1.prisma" `
  --script > .\diff_neon_to_pre_m1.sql
```

Compare pre-Milestone schema to current schema:

```powershell
npx prisma migrate diff `
  --from-schema-datamodel ".\tmp_schema_pre_m1.prisma" `
  --to-schema-datamodel ".\prisma\schema.prisma" `
  --script > .\diff_pre_m1_to_current.sql
```

Generate baseline migration SQL:

```powershell
New-Item -ItemType Directory -Force .\prisma\migrations\000_baseline_existing_production_schema
npx prisma migrate diff `
  --from-empty `
  --to-url "$env:DATABASE_URL" `
  --script > .\prisma\migrations\000_baseline_existing_production_schema\migration.sql
```

## 9.2 Staging Commands

Set staging DB:

```bash
export DATABASE_URL="<neon_staging_branch_direct_or_pooled_url>"
```

PowerShell:

```powershell
$env:DATABASE_URL="<neon_staging_branch_direct_or_pooled_url>"
```

Inspect status:

```bash
npx prisma migrate status
```

Mark baseline applied:

```bash
npx prisma migrate resolve --applied 000_baseline_existing_production_schema
```

Confirm only `001` is pending:

```bash
npx prisma migrate status
```

Apply `001`:

```bash
npx prisma migrate deploy
```

Validate:

```bash
npx prisma migrate status
npx prisma validate
npm run build
```

## 9.3 Production Commands

Set production DB:

```bash
export DATABASE_URL="<neon_production_url>"
```

PowerShell:

```powershell
$env:DATABASE_URL="<neon_production_url>"
```

Confirm target:

```powershell
@"
select current_database() as database_name, current_schema() as schema_name, now() as checked_at;
"@ | npx prisma db execute --stdin
```

Check status:

```bash
npx prisma migrate status
```

Mark baseline applied:

```bash
npx prisma migrate resolve --applied 000_baseline_existing_production_schema
```

Confirm pending migration:

```bash
npx prisma migrate status
```

Apply pending migration:

```bash
npx prisma migrate deploy
```

Final status:

```bash
npx prisma migrate status
```

Post-deploy validation:

```bash
npx prisma validate
npm run build
```

## 10. Risks And Go/No-Go Checklist

### 10.1 Risks

Baseline mismatch:

- If baseline SQL does not match actual Neon schema, future migrations may drift again.

Mitigation:

- Generate baseline from the authoritative Neon schema or reconcile differences before baseline.

Accidental destructive command:

- `migrate reset`, `db push`, or unmanaged SQL could cause data loss.

Mitigation:

- Use `migrate resolve` for baseline and `migrate deploy` for migrations.

Migration order risk:

- `001_tenant_foundation_additive` depends on existing tables. It must come after `000_baseline_existing_production_schema`.

Mitigation:

- Ensure lexical migration order:
  - `000_baseline_existing_production_schema`
  - `001_tenant_foundation_additive`

Pooled connection issues:

- Some schema inspection tools work better with Neon direct connection strings than pooled URLs.

Mitigation:

- Use direct connection string for `pg_dump` and migration operations where recommended by Neon.

Uncommitted migration history:

- If baseline is not committed, another environment cannot reproduce schema history.

Mitigation:

- Commit baseline and `001` together before staging/production rollout.

Existing manual drift:

- Neon may contain schema changes that differ from the expected app schema.

Mitigation:

- Inspect and classify every non-empty diff before baseline.

### 10.2 Go Checklist

Proceed only if all are true:

- Production/staging snapshot is available.
- `000_baseline_existing_production_schema` exists locally and is reviewed.
- `001_tenant_foundation_additive` exists locally and is reviewed.
- `001` contains no drops, destructive alters, or non-null columns requiring backfill.
- `npx prisma validate` passes.
- `npm run build` passes.
- Staging branch baseline resolve succeeds.
- Staging `migrate deploy` succeeds.
- Staging row counts are unchanged.
- Staging app smoke tests pass.
- `migrate status` is clean after staging deploy.

### 10.3 No-Go Checklist

Do not proceed if any are true:

- No fresh database snapshot exists.
- `migrate status` asks for reset in staging after baseline resolve.
- Diff shows unexpected drops or destructive changes.
- Baseline generated from Neon does not match expected app schema and differences are unexplained.
- `001` fails on staging.
- Existing app workflows fail after staging deploy.
- Production target database is uncertain.
- Commands are pointed at pooled/direct URLs inconsistently without verification.

## Final Recommendation

Create a committed baseline migration as `000_baseline_existing_production_schema`, mark it applied on existing Neon databases with `prisma migrate resolve`, then apply `001_tenant_foundation_additive` using `prisma migrate deploy`.

Do this on a Neon staging branch first. Move to production only after staging proves that migration history is clean, row counts are unchanged, build passes, and existing workflows continue to work.
