import assert from "node:assert/strict";
import { getTenantCreateData, getTenantWhere } from "../lib/tenant/prisma";
import { tenantEnforcementMode, type TenantContext } from "../lib/tenant/context";

const ctx: TenantContext = {
  organizationId: "org_1",
  workspaceId: "ws_1",
  userId: "user_1",
  organizationRole: "admin",
  workspaceRole: "recruiter",
  userRole: "ADMIN",
  clientId: null,
  candidateId: null,
  permissions: [],
  enforcementMode: "observe",
};

assert.equal(tenantEnforcementMode, "observe");

assert.deepEqual(getTenantWhere(ctx, { status: "OPEN" }, "organization"), {
  status: "OPEN",
  organizationId: "org_1",
});

assert.deepEqual(getTenantWhere(ctx, { status: "OPEN" }, "workspace"), {
  status: "OPEN",
  organizationId: "org_1",
});

assert.deepEqual(getTenantWhere(ctx, { status: "OPEN", workspaceId: "ws_explicit" }, "workspace"), {
  status: "OPEN",
  organizationId: "org_1",
  workspaceId: "ws_explicit",
});

assert.deepEqual(getTenantCreateData(ctx, { name: "Asha" }, "workspace"), {
  name: "Asha",
  organizationId: "org_1",
  workspaceId: "ws_1",
});

assert.deepEqual(getTenantCreateData(ctx, { name: "Acme" }, "organization"), {
  name: "Acme",
  organizationId: "org_1",
  workspaceId: undefined,
});

assert.deepEqual(getTenantWhere(null, { id: "candidate_1" }, "workspace"), {
  id: "candidate_1",
});

console.log("Week 3 tenant repository helper tests passed");

