import assert from "node:assert/strict";
import { getTenantCreateData, getTenantWhere, tenantPrisma } from "../lib/tenant/prisma";
import { tenantEnforcementMode, type TenantContext } from "../lib/tenant/context";

const baseCtx: TenantContext = {
  organizationId: "org_a",
  workspaceId: "ws_a",
  userId: "user_a",
  organizationRole: "admin",
  workspaceRole: "admin",
  userRole: "ADMIN",
  clientId: null,
  candidateId: null,
  permissions: [],
  enforcementMode: "observe",
};

assert.equal(tenantEnforcementMode, "observe");

assert.deepEqual(getTenantWhere(baseCtx, { status: "OPEN" }, "workspace", "offer" as any), {
  status: "OPEN",
  organizationId: "org_a",
});

assert.deepEqual(getTenantCreateData(baseCtx, { status: "OPEN" }, "workspace"), {
  status: "OPEN",
  organizationId: "org_a",
  workspaceId: "ws_a",
});

const clientCtx: TenantContext = {
  ...baseCtx,
  userRole: "CLIENT",
  clientId: "client_a",
  portalContext: { type: "client", id: "client_a" },
};

assert.deepEqual(getTenantWhere(clientCtx, { status: "OPEN" }, "workspace", "job" as any), {
  status: "OPEN",
  clientId: "client_a",
  organizationId: "org_a",
});

assert.deepEqual(getTenantWhere(clientCtx, {}, "workspace", "application" as any), {
  application: { job: { clientId: "client_a" } },
  organizationId: "org_a",
});

const candidateCtx: TenantContext = {
  ...baseCtx,
  userRole: "CANDIDATE",
  candidateId: "candidate_a",
  portalContext: { type: "candidate", id: "candidate_a" },
};

assert.deepEqual(getTenantWhere(candidateCtx, {}, "workspace", "interview" as any), {
  candidateId: "candidate_a",
  organizationId: "org_a",
});

assert.equal(typeof (tenantPrisma.voiceScreening as any).withContext, "function");
assert.equal(typeof (tenantPrisma.integrationSetting as any).withContext, "function");
assert.equal(typeof (tenantPrisma.offer as any).withContext, "function");

console.log("Week 4 tenant enforcement helper tests passed");

