import { PrismaClient } from "@prisma/client";

type Mode = "dry-run" | "apply" | "report" | "validate";

type CountRow = {
  table_name: string;
  count: bigint | number;
};

type ValidationRow = {
  check_name: string;
  issue_count: bigint | number;
};

const prisma = new PrismaClient();

const DEFAULT_ORG_SLUG = "careerpaths";
const DEFAULT_WORKSPACE_SLUG = "default";
const DEFAULT_WORKSPACE_NAME = "Default Workspace";

const tenantOwnedTables = [
  "Client",
  "Job",
  "Candidate",
  "Project",
  "Application",
  "Interview",
  "Offer",
  "Prospect",
  "JobPosting",
  "PlatformSubscription",
  "IntegrationSetting",
  "NaukriImport",
  "NaukriCandidate",
  "SavedSearch",
  "VoiceScreening",
  "WhatsAppTemplate",
  "WhatsAppMessage",
  "EmailCampaign",
  "CampaignRecipient",
  "CalendarConnection",
  "EmailTemplate",
  "EmailLog",
  "Note",
  "ActivityLog",
  "CompanyProfile",
];

const workspaceScopedTables = [
  "Job",
  "Candidate",
  "Project",
  "Application",
  "Interview",
  "Offer",
  "Prospect",
  "JobPosting",
  "PlatformSubscription",
  "IntegrationSetting",
  "NaukriImport",
  "NaukriCandidate",
  "SavedSearch",
  "VoiceScreening",
  "WhatsAppTemplate",
  "WhatsAppMessage",
  "EmailCampaign",
  "CampaignRecipient",
  "CalendarConnection",
  "EmailTemplate",
  "EmailLog",
  "Note",
  "ActivityLog",
];

const businessTables = [
  "User",
  "Client",
  "Job",
  "Candidate",
  "Application",
  "Interview",
  "Offer",
  "Prospect",
  "Project",
  "Note",
  "ActivityLog",
  "NaukriImport",
  "NaukriCandidate",
  "VoiceScreening",
  "WhatsAppMessage",
  "EmailCampaign",
  "EmailLog",
];

const permissions = [
  ["tenant.read", "tenant", "read", "Read tenant details"],
  ["tenant.manage", "tenant", "manage", "Manage tenant details"],
  ["workspace.read", "workspace", "read", "Read workspaces"],
  ["workspace.manage", "workspace", "manage", "Manage workspaces"],
  ["users.read", "users", "read", "Read users"],
  ["users.manage", "users", "manage", "Manage users"],
  ["candidates.read", "candidates", "read", "Read candidates"],
  ["candidates.manage", "candidates", "manage", "Manage candidates"],
  ["clients.read", "clients", "read", "Read clients"],
  ["clients.manage", "clients", "manage", "Manage clients"],
  ["jobs.read", "jobs", "read", "Read jobs"],
  ["jobs.manage", "jobs", "manage", "Manage jobs"],
  ["pipeline.read", "pipeline", "read", "Read pipeline"],
  ["pipeline.manage", "pipeline", "manage", "Manage pipeline"],
  ["reports.read", "reports", "read", "Read reports"],
  ["settings.manage", "settings", "manage", "Manage settings"],
] as const;

const roleDefinitions = [
  {
    systemKey: "organization_admin",
    name: "Organization Admin",
    scope: "ORGANIZATION",
    userRole: "ADMIN",
    permissionKeys: permissions.map(([key]) => key),
  },
  {
    systemKey: "recruiter",
    name: "Recruiter",
    scope: "WORKSPACE",
    userRole: "RECRUITER",
    permissionKeys: [
      "workspace.read",
      "candidates.read",
      "candidates.manage",
      "clients.read",
      "jobs.read",
      "jobs.manage",
      "pipeline.read",
      "pipeline.manage",
      "reports.read",
    ],
  },
  {
    systemKey: "client",
    name: "Client",
    scope: "ORGANIZATION",
    userRole: "CLIENT",
    permissionKeys: ["workspace.read", "jobs.read", "pipeline.read", "reports.read"],
  },
  {
    systemKey: "candidate",
    name: "Candidate",
    scope: "ORGANIZATION",
    userRole: "CANDIDATE",
    permissionKeys: ["workspace.read"],
  },
] as const;

function parseMode(): Mode {
  const raw = process.argv.find((arg) => arg.startsWith("--mode="))?.split("=")[1] ?? "dry-run";
  if (raw === "dry-run" || raw === "apply" || raw === "report" || raw === "validate") return raw;
  throw new Error(`Invalid --mode=${raw}. Use dry-run, apply, report, or validate.`);
}

function isConnectivityError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Can't reach database server") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ETIMEDOUT") ||
    message.includes("ENOTFOUND") ||
    message.includes("Connection terminated")
  );
}

function asNumber(value: bigint | number): number {
  return typeof value === "bigint" ? Number(value) : value;
}

async function tableExists(tableName: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `select exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = $1
    ) as exists`,
    tableName,
  );
  return Boolean(rows[0]?.exists);
}

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = $1
        and column_name = $2
    ) as exists`,
    tableName,
    columnName,
  );
  return Boolean(rows[0]?.exists);
}

async function assertSchemaReady() {
  const requiredTables = [
    "Organization",
    "Workspace",
    "Role",
    "Permission",
    "RolePermission",
    "OrganizationMembership",
    "WorkspaceMembership",
    "TenantAuditLog",
  ];
  const missingTables: string[] = [];
  for (const table of requiredTables) {
    if (!(await tableExists(table))) missingTables.push(table);
  }

  const missingColumns: string[] = [];
  for (const table of tenantOwnedTables) {
    if (!(await columnExists(table, "organizationId"))) missingColumns.push(`${table}.organizationId`);
  }
  for (const table of workspaceScopedTables) {
    if (!(await columnExists(table, "workspaceId"))) missingColumns.push(`${table}.workspaceId`);
  }
  for (const column of ["defaultOrganizationId", "defaultWorkspaceId"]) {
    if (!(await columnExists("User", column))) missingColumns.push(`User.${column}`);
  }

  return {
    ready: missingTables.length === 0 && missingColumns.length === 0,
    missingTables,
    missingColumns,
  };
}

async function getCompanyName(): Promise<string> {
  const rows = await prisma.$queryRawUnsafe<Array<{ name: string | null }>>(
    `select nullif(trim(name), '') as name
     from "CompanyProfile"
     where id = 'default'
     limit 1`,
  );
  if (rows[0]?.name) return rows[0].name;

  const fallbackRows = await prisma.$queryRawUnsafe<Array<{ name: string | null }>>(
    `select nullif(trim(name), '') as name
     from "CompanyProfile"
     where nullif(trim(name), '') is not null
     order by "createdAt" asc
     limit 1`,
  );
  return fallbackRows[0]?.name ?? "CareerPaths India";
}

async function getCounts(tables: string[]): Promise<CountRow[]> {
  const rows: CountRow[] = [];
  for (const table of tables) {
    const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`select count(*)::bigint as count from "${table}"`);
    rows.push({ table_name: table, count: result[0]?.count ?? 0 });
  }
  return rows;
}

async function getMissingOrganizationCounts(): Promise<CountRow[]> {
  const rows: CountRow[] = [];
  for (const table of tenantOwnedTables) {
    const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `select count(*)::bigint as count from "${table}" where "organizationId" is null`,
    );
    rows.push({ table_name: table, count: result[0]?.count ?? 0 });
  }
  return rows;
}

async function getMissingWorkspaceCounts(): Promise<CountRow[]> {
  const rows: CountRow[] = [];
  for (const table of workspaceScopedTables) {
    const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `select count(*)::bigint as count from "${table}" where "workspaceId" is null`,
    );
    rows.push({ table_name: table, count: result[0]?.count ?? 0 });
  }
  return rows;
}

async function getDefaultTenant() {
  const orgRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `select id from "Organization" where slug = $1 limit 1`,
    DEFAULT_ORG_SLUG,
  );
  const orgId = orgRows[0]?.id ?? null;
  if (!orgId) return { organizationId: null, workspaceId: null };

  const workspaceRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `select id from "Workspace" where "organizationId" = $1 and slug = $2 limit 1`,
    orgId,
    DEFAULT_WORKSPACE_SLUG,
  );
  return { organizationId: orgId, workspaceId: workspaceRows[0]?.id ?? null };
}

async function printReadinessFailure(mode: Mode, readiness: Awaited<ReturnType<typeof assertSchemaReady>>) {
  console.log(`Week 2 tenant backfill ${mode}`);
  console.log("Status: NOT_READY");
  console.log("Reason: Week 1 tenant foundation schema is not fully present in the connected database.");
  console.log(`Missing tables: ${readiness.missingTables.length ? readiness.missingTables.join(", ") : "none"}`);
  console.log(`Missing columns: ${readiness.missingColumns.length ? readiness.missingColumns.join(", ") : "none"}`);
  console.log("Next step: apply/baseline 001_tenant_foundation_additive in staging before running Week 2 apply.");
}

async function printReport(title: string) {
  const companyName = await getCompanyName();
  const tenant = await getDefaultTenant();
  const businessCounts = await getCounts(businessTables);
  const missingOrg = await getMissingOrganizationCounts();
  const missingWorkspace = await getMissingWorkspaceCounts();
  const userCount = await prisma.user.count();
  const orgMembershipCount = await prisma.organizationMembership.count();
  const workspaceMembershipCount = await prisma.workspaceMembership.count();

  console.log(title);
  console.log(`Default organization slug: ${DEFAULT_ORG_SLUG}`);
  console.log(`Default organization name source/result: ${companyName}`);
  console.log(`Default organization id: ${tenant.organizationId ?? "(not created)"}`);
  console.log(`Default workspace slug: ${DEFAULT_WORKSPACE_SLUG}`);
  console.log(`Default workspace id: ${tenant.workspaceId ?? "(not created)"}`);
  console.log(`Users: ${userCount}`);
  console.log(`Organization memberships: ${orgMembershipCount}`);
  console.log(`Workspace memberships: ${workspaceMembershipCount}`);
  console.log("Business row counts:");
  for (const row of businessCounts) console.log(`  ${row.table_name}: ${asNumber(row.count)}`);
  console.log("Rows missing organizationId:");
  for (const row of missingOrg) console.log(`  ${row.table_name}: ${asNumber(row.count)}`);
  console.log("Rows missing workspaceId:");
  for (const row of missingWorkspace) console.log(`  ${row.table_name}: ${asNumber(row.count)}`);
}

async function dryRun() {
  await printReport("Week 2 tenant backfill dry-run");
  const missingOrg = await getMissingOrganizationCounts();
  const missingWorkspace = await getMissingWorkspaceCounts();
  const totalOrgUpdates = missingOrg.reduce((sum, row) => sum + asNumber(row.count), 0);
  const totalWorkspaceUpdates = missingWorkspace.reduce((sum, row) => sum + asNumber(row.count), 0);
  console.log("Planned writes if --mode=apply is used:");
  console.log("  Upsert 1 default organization.");
  console.log("  Upsert 1 default workspace.");
  console.log(`  Upsert ${roleDefinitions.length} roles and ${permissions.length} permissions.`);
  console.log("  Upsert role-permission links.");
  console.log("  Upsert one organization membership per user.");
  console.log("  Upsert one workspace membership per user.");
  console.log(`  Fill organizationId on ${totalOrgUpdates} existing rows.`);
  console.log(`  Fill workspaceId on ${totalWorkspaceUpdates} existing rows.`);
  console.log("No writes were executed in dry-run mode.");
}

async function upsertDefaultTenant() {
  const organizationName = await getCompanyName();
  const organization = await prisma.organization.upsert({
    where: { slug: DEFAULT_ORG_SLUG },
    update: {},
    create: {
      name: organizationName,
      slug: DEFAULT_ORG_SLUG,
      type: "AGENCY",
      status: "ACTIVE",
      region: "IN",
      defaultCurrency: "INR",
      timezone: "Asia/Kolkata",
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: { organizationId_slug: { organizationId: organization.id, slug: DEFAULT_WORKSPACE_SLUG } },
    update: {},
    create: {
      organizationId: organization.id,
      name: DEFAULT_WORKSPACE_NAME,
      slug: DEFAULT_WORKSPACE_SLUG,
      type: "DEFAULT",
      status: "ACTIVE",
    },
  });

  return { organization, workspace };
}

async function upsertRolesAndPermissions(organizationId: string) {
  const permissionByKey = new Map<string, string>();
  for (const [key, resource, action, description] of permissions) {
    const permission = await prisma.permission.upsert({
      where: { key },
      update: { resource, action, description },
      create: { key, resource, action, description },
    });
    permissionByKey.set(key, permission.id);
  }

  const roleByUserRole = new Map<string, string>();
  for (const roleDef of roleDefinitions) {
    const role = await prisma.role.upsert({
      where: { organizationId_systemKey: { organizationId, systemKey: roleDef.systemKey } },
      update: { name: roleDef.name, scope: roleDef.scope, isSystemRole: true },
      create: {
        organizationId,
        systemKey: roleDef.systemKey,
        name: roleDef.name,
        scope: roleDef.scope,
        isSystemRole: true,
      },
    });
    roleByUserRole.set(roleDef.userRole, role.id);

    for (const permissionKey of roleDef.permissionKeys) {
      const permissionId = permissionByKey.get(permissionKey);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }
  }

  return roleByUserRole;
}

async function backfillUsers(organizationId: string, workspaceId: string, roleByUserRole: Map<string, string>) {
  await prisma.user.updateMany({
    where: { OR: [{ defaultOrganizationId: null }, { defaultWorkspaceId: null }] },
    data: { defaultOrganizationId: organizationId, defaultWorkspaceId: workspaceId },
  });

  const users = await prisma.user.findMany({ select: { id: true, role: true, isActive: true, createdAt: true } });
  for (const user of users) {
    const roleId = roleByUserRole.get(user.role);
    if (!roleId) throw new Error(`No mapped role for user role ${user.role}`);
    const status = user.isActive ? "ACTIVE" : "SUSPENDED";

    await prisma.organizationMembership.upsert({
      where: { organizationId_userId: { organizationId, userId: user.id } },
      update: { roleId, status },
      create: { organizationId, userId: user.id, roleId, status, joinedAt: user.createdAt },
    });

    await prisma.workspaceMembership.upsert({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
      update: { organizationId, roleId, status },
      create: { organizationId, workspaceId, userId: user.id, roleId, status },
    });
  }
}

async function updateTableTenant(table: string, organizationId: string, workspaceId: string | null, includeWorkspace: boolean) {
  if (includeWorkspace) {
    await prisma.$executeRawUnsafe(
      `update "${table}"
       set "organizationId" = coalesce("organizationId", $1),
           "workspaceId" = coalesce("workspaceId", $2)
       where "organizationId" is null
          or "workspaceId" is null`,
      organizationId,
      workspaceId,
    );
  } else {
    await prisma.$executeRawUnsafe(
      `update "${table}"
       set "organizationId" = coalesce("organizationId", $1)
       where "organizationId" is null`,
      organizationId,
    );
  }
}

async function applyBackfill() {
  const beforeCounts = await getCounts(businessTables);
  const { organization, workspace } = await upsertDefaultTenant();
  const roleByUserRole = await upsertRolesAndPermissions(organization.id);
  await backfillUsers(organization.id, workspace.id, roleByUserRole);

  for (const table of tenantOwnedTables) {
    await updateTableTenant(table, organization.id, workspace.id, workspaceScopedTables.includes(table));
  }

  const afterCounts = await getCounts(businessTables);
  const changedCounts = beforeCounts.filter((before) => {
    const after = afterCounts.find((row) => row.table_name === before.table_name);
    return asNumber(after?.count ?? 0) !== asNumber(before.count);
  });

  console.log("Week 2 tenant backfill apply");
  console.log(`Default organization: ${organization.id} (${organization.slug})`);
  console.log(`Default workspace: ${workspace.id} (${workspace.slug})`);
  console.log(`Business row count changes: ${changedCounts.length}`);
  if (changedCounts.length) {
    for (const row of changedCounts) console.log(`  ${row.table_name}: row count changed`);
  }
  await validate();
}

async function duplicateChecks(): Promise<ValidationRow[]> {
  const queries: Array<[string, string]> = [
    [
      "candidate_email_duplicates",
      `select count(*)::bigint as issue_count
       from (
         select "organizationId", lower(email)
         from "Candidate"
         where email is not null
         group by "organizationId", lower(email)
         having count(*) > 1
       ) duplicates`,
    ],
    [
      "client_name_duplicates",
      `select count(*)::bigint as issue_count
       from (
         select "organizationId", lower(name)
         from "Client"
         where name is not null
         group by "organizationId", lower(name)
         having count(*) > 1
       ) duplicates`,
    ],
    [
      "integration_provider_duplicates",
      `select count(*)::bigint as issue_count
       from (
         select "organizationId", "workspaceId", provider
         from "IntegrationSetting"
         group by "organizationId", "workspaceId", provider
         having count(*) > 1
       ) duplicates`,
    ],
    [
      "whatsapp_template_duplicates",
      `select count(*)::bigint as issue_count
       from (
         select "organizationId", lower(name)
         from "WhatsAppTemplate"
         group by "organizationId", lower(name)
         having count(*) > 1
       ) duplicates`,
    ],
    [
      "email_template_duplicates",
      `select count(*)::bigint as issue_count
       from (
         select "organizationId", lower(name)
         from "EmailTemplate"
         group by "organizationId", lower(name)
         having count(*) > 1
       ) duplicates`,
    ],
  ];

  const results: ValidationRow[] = [];
  for (const [checkName, sql] of queries) {
    const rows = await prisma.$queryRawUnsafe<Array<{ issue_count: bigint }>>(sql);
    results.push({ check_name: checkName, issue_count: rows[0]?.issue_count ?? 0 });
  }
  return results;
}

async function consistencyChecks(): Promise<ValidationRow[]> {
  const queries: Array<[string, string]> = [
    [
      "jobs_with_client_org_mismatch",
      `select count(*)::bigint as issue_count
       from "Job" j
       join "Client" c on c.id = j."clientId"
       where j."organizationId" is distinct from c."organizationId"`,
    ],
    [
      "applications_with_candidate_or_job_org_mismatch",
      `select count(*)::bigint as issue_count
       from "Application" a
       join "Candidate" c on c.id = a."candidateId"
       join "Job" j on j.id = a."jobId"
       where a."organizationId" is distinct from c."organizationId"
          or a."organizationId" is distinct from j."organizationId"`,
    ],
    [
      "interviews_with_application_org_mismatch",
      `select count(*)::bigint as issue_count
       from "Interview" i
       join "Application" a on a.id = i."applicationId"
       where i."organizationId" is distinct from a."organizationId"`,
    ],
    [
      "offers_with_application_org_mismatch",
      `select count(*)::bigint as issue_count
       from "Offer" o
       join "Application" a on a.id = o."applicationId"
       where o."organizationId" is distinct from a."organizationId"`,
    ],
  ];

  const results: ValidationRow[] = [];
  for (const [checkName, sql] of queries) {
    const rows = await prisma.$queryRawUnsafe<Array<{ issue_count: bigint }>>(sql);
    results.push({ check_name: checkName, issue_count: rows[0]?.issue_count ?? 0 });
  }
  return results;
}

async function validate() {
  const missingOrg = (await getMissingOrganizationCounts()).map((row) => ({
    check_name: `${row.table_name}_missing_organizationId`,
    issue_count: row.count,
  }));
  const missingWorkspace = (await getMissingWorkspaceCounts()).map((row) => ({
    check_name: `${row.table_name}_missing_workspaceId`,
    issue_count: row.count,
  }));
  const membershipChecks: ValidationRow[] = [
    {
      check_name: "users_missing_default_tenant",
      issue_count: (
        await prisma.$queryRawUnsafe<Array<{ issue_count: bigint }>>(
          `select count(*)::bigint as issue_count from "User" where "defaultOrganizationId" is null or "defaultWorkspaceId" is null`,
        )
      )[0]?.issue_count ?? 0,
    },
    {
      check_name: "users_without_org_membership",
      issue_count: (
        await prisma.$queryRawUnsafe<Array<{ issue_count: bigint }>>(
          `select count(*)::bigint as issue_count
           from "User" u
           left join "OrganizationMembership" om
             on om."userId" = u.id
            and om."organizationId" = u."defaultOrganizationId"
           where om.id is null`,
        )
      )[0]?.issue_count ?? 0,
    },
    {
      check_name: "users_without_workspace_membership",
      issue_count: (
        await prisma.$queryRawUnsafe<Array<{ issue_count: bigint }>>(
          `select count(*)::bigint as issue_count
           from "User" u
           left join "WorkspaceMembership" wm
             on wm."userId" = u.id
            and wm."workspaceId" = u."defaultWorkspaceId"
           where wm.id is null`,
        )
      )[0]?.issue_count ?? 0,
    },
  ];

  const checks = [
    ...membershipChecks,
    ...missingOrg,
    ...missingWorkspace,
    ...(await consistencyChecks()),
    ...(await duplicateChecks()),
  ];

  console.log("Week 2 tenant backfill validation");
  let failures = 0;
  for (const check of checks) {
    const count = asNumber(check.issue_count);
    if (count > 0) failures += 1;
    console.log(`${count === 0 ? "PASS" : "FAIL"} ${check.check_name}: ${count}`);
  }
  console.log(`Validation result: ${failures === 0 ? "PASS" : "FAIL"} (${failures} failing checks)`);
}

async function main() {
  const mode = parseMode();
  const readiness = await assertSchemaReady();
  if (!readiness.ready) {
    await printReadinessFailure(mode, readiness);
    return;
  }

  if (mode === "dry-run") await dryRun();
  else if (mode === "report") await printReport("Week 2 tenant backfill report");
  else if (mode === "validate") await validate();
  else if (mode === "apply") await applyBackfill();
}

main()
  .catch((error) => {
    const mode = parseMode();
    if (mode !== "apply" && isConnectivityError(error)) {
      console.log(`Week 2 tenant backfill ${mode}`);
      console.log("Status: DB_UNREACHABLE");
      console.log("Reason: Could not connect to the configured database, so no validation or backfill queries could be completed.");
      console.log("Writes executed: 0");
      console.log("Next step: verify DATABASE_URL, Neon branch status, network access, and whether a direct Neon connection string is required.");
      return;
    }
    console.error("Week 2 tenant backfill failed");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
