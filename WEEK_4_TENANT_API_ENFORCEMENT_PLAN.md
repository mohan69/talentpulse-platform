# WEEK 4 — TENANT API ENFORCEMENT PLAN

## Purpose

Week 4 transitions the tenant architecture from **observe mode** (Week 3) to **enforce mode**. Week 3 built the tenant context resolver, the `tenantPrisma` proxy for 8 core models, and the repository pattern. Week 4 closes every gap that allows cross-tenant data access:

- Expands the `tenantPrisma` proxy to cover all 25 tenant-owned models.
- Switches the default enforcement mode from `observe` to `enforce`.
- Converts every API route that still uses raw `prisma` to use `tenantPrisma`.
- Adds tenant-context validation at session creation time.
- Hardens client portal, candidate portal, reports, analytics, provider callbacks, and upload/download routes.

All changes are application-layer only. No schema changes, no migrations, no Prisma schema edits.

## Current State

| Aspect | Status |
|--------|--------|
| Tenant context resolver | ✅ Exists (`lib/tenant/context.ts`) — resolves org/workspace from session |
| Tenant proxy (`tenantPrisma`) | ✅ Covers 8 models: candidate, client, job, application, interview, project, note, activityLog |
| Enforcement mode | ⚠️ Defaults to `"observe"` — logs only, does not block |
| API routes using `tenantPrisma` | ~25 routes migrated (jobs, candidates, applications, interviews, clients, offers, search, ai screening) |
| API routes still using raw `prisma` | ❌ ~25 routes across 17 models (prospect, voiceScreening, whatsApp, emailCampaign, etc.) |
| Provider callbacks (Twilio, webhooks) | ❌ No session → no tenant context → full access to any record by ID |
| Upload/download | ❌ Listed in middleware matcher but has no tenant boundary |
| Client portal | ⚠️ Role-gated but uses raw `prisma` calls |
| Candidate portal | ⚠️ Role-gated but uses raw `prisma` calls |
| Reports/analytics | ⚠️ Mix of `tenantPrisma` and raw `prisma` |
| Auth session tenant validation | ❌ No validation at login that user has active org membership |

---

## 1. Expand Tenant Proxy to Cover All Models

### Problem

The `RepositoryModel` union in `lib/tenant/prisma.ts` only covers 8 of 25 tenant-owned models. Routes for the other 17 models use raw `prisma` directly, obtaining zero tenant filtering.

### Action

Add every tenant-owned model to the `RepositoryModel` union and its corresponding `scopeByModel` entry and `delegateByModel` entry.

### Models to Add

Grouped by scope:

**Workspace-scoped models** (require `organizationId` + `workspaceId`):

| Model | Schema Name | Delegate Key |
|-------|-------------|-------------|
| Offer | `Offer` | `offer` |
| JobPosting | `JobPosting` | `jobPosting` |
| PlatformSubscription | `PlatformSubscription` | `platformSubscription` |
| IntegrationSetting | `IntegrationSetting` | `integrationSetting` |
| VoiceScreening | `VoiceScreening` | `voiceScreening` |
| WhatsAppTemplate | `WhatsAppTemplate` | `whatsAppTemplate` |
| WhatsAppMessage | `WhatsAppMessage` | `whatsAppMessage` |
| EmailCampaign | `EmailCampaign` | `emailCampaign` |
| CampaignRecipient | `CampaignRecipient` | `campaignRecipient` |
| EmailTemplate | `EmailTemplate` | `emailTemplate` |
| EmailLog | `EmailLog` | `emailLog` |
| CalendarConnection | `CalendarConnection` | `calendarConnection` |
| Prospect | `Prospect` | `prospect` |
| SavedSearch | `SavedSearch` | `savedSearch` |
| NaukriImport | `NaukriImport` | `naukriImport` |
| NaukriCandidate | `NaukriCandidate` | `naukriCandidate` |

**Organization-scoped models** (`organizationId` only):

| Model | Schema Name | Delegate Key |
|-------|-------------|-------------|
| CompanyProfile | `CompanyProfile` | `companyProfile` |

**Global models** (no tenant columns, not added):

| Model | Reason |
|-------|--------|
| `RecruitingPlatform` | Global catalog — no `organizationId` column |
| `User` | Cross-tenant identity — tenant via memberships, not direct column |
| `Organization`, `Workspace`, `Role`, `Permission`, `RolePermission` | Tenant infrastructure — managed by tenant context layer itself |
| `OrganizationMembership`, `WorkspaceMembership` | Tenant infrastructure |
| `TenantAuditLog` | Tenant infrastructure |

### Files to Modify

**`lib/tenant/prisma.ts`:**

```typescript
type RepositoryModel =
  // Week 3 models
  | "candidate" | "client" | "job" | "application" | "interview"
  | "project" | "note" | "activityLog"
  // Week 4 additions
  | "offer" | "jobPosting" | "platformSubscription" | "integrationSetting"
  | "voiceScreening" | "whatsAppTemplate" | "whatsAppMessage"
  | "emailCampaign" | "campaignRecipient" | "emailTemplate" | "emailLog"
  | "calendarConnection" | "prospect" | "savedSearch"
  | "naukriImport" | "naukriCandidate"
  | "companyProfile";

const scopeByModel: Record<RepositoryModel, TenantScope> = {
  // Week 3 entries
  candidate: "workspace",
  client: "organization",
  job: "workspace",
  application: "workspace",
  interview: "workspace",
  project: "workspace",
  note: "workspace",
  activityLog: "workspace",
  // Week 4 entries
  offer: "workspace",
  jobPosting: "workspace",
  platformSubscription: "workspace",
  integrationSetting: "workspace",
  voiceScreening: "workspace",
  whatsAppTemplate: "workspace",
  whatsAppMessage: "workspace",
  emailCampaign: "workspace",
  campaignRecipient: "workspace",
  emailTemplate: "workspace",
  emailLog: "workspace",
  calendarConnection: "workspace",
  prospect: "workspace",
  savedSearch: "workspace",
  naukriImport: "workspace",
  naukriCandidate: "workspace",
  companyProfile: "organization",
};
```

Add a `delegateByModel` entry for each new model. Follow the existing pattern:

```typescript
const delegateByModel: Record<RepositoryModel, PrismaDelegate> = {
  // ... Week 3 entries ...
  // Week 4 additions
  offer: prisma["offer"],
  jobPosting: prisma["jobPosting"],
  // ... etc for all 17 models ...
};
```

### Exports

Update the `tenantPrisma` export object to include all new models:

```typescript
export const tenantPrisma = {
  // Week 3
  candidate: createRepository("candidate", delegateByModel.candidate),
  // ... etc ...
  // Week 4
  offer: createRepository("offer", delegateByModel.offer),
  // ...
} as Pick<typeof prisma, RepositoryModel>;
```

### Verification

After expansion, every `tenantPrisma.<model>` call for any of the 25 models will:
- Resolve tenant context.
- Inject `organizationId` on all queries and creates.
- Inject `workspaceId` for workspace-scoped models.
- Log mismatches in observe mode.
- Throw in enforce mode for missing scoped records on update/delete.

---

## 2. API-by-API Enforcement Plan

### 2.1 Routes Already Using `tenantPrisma`

These routes already go through the proxy but may still use raw `prisma` for excluded models. Audit each for mixed usage:

| Route | Audit Fix |
|-------|-----------|
| `app/api/analytics/route.ts` | Replace `prisma.offer.groupBy` → `tenantPrisma.offer.groupBy`, `prisma.prospect.groupBy` → `tenantPrisma.prospect.groupBy` |
| `app/api/prospects/route.ts` | Replace `prisma.prospect` → `tenantPrisma.prospect` |
| `app/api/prospects/[id]/route.ts` | Replace `prisma.prospect` → `tenantPrisma.prospect` |
| `app/api/prospects/convert/route.ts` | Replace `prisma.prospect` → `tenantPrisma.prospect` |
| `app/api/prospects/bulk-import/route.ts` | Replace `prisma.prospect` → `tenantPrisma.prospect` |
| `app/api/prospects/bulk-update/route.ts` | Replace `prisma.prospect` → `tenantPrisma.prospect` |
| `app/api/search/route.ts` | Already uses `tenantPrisma` for candidates; verify no raw `prisma` calls remain |
| `app/api/search/import/route.ts` | Already uses `tenantPrisma` for candidates; verify |

### 2.2 Routes Using Raw `prisma` for Unproxied Models (Now Proxied)

These routes need their imports changed from `prisma` to `tenantPrisma` for tenant-owned models:

| Route | Current Model(s) | Replace With |
|-------|-----------------|--------------|
| `app/api/integrations/route.ts` | `integrationSetting` | `tenantPrisma.integrationSetting` |
| `app/api/integrations/[provider]/route.ts` | `integrationSetting` | `tenantPrisma.integrationSetting` |
| `app/api/integrations/test/route.ts` | `integrationSetting` | `tenantPrisma.integrationSetting` |
| `app/api/voice-screening/route.ts` | `voiceScreening`, `integrationSetting` | `tenantPrisma.voiceScreening`, `tenantPrisma.integrationSetting` |
| `app/api/voice-screening/[id]/route.ts` | `voiceScreening` | `tenantPrisma.voiceScreening` |
| `app/api/voice-screening/fetch-transcript/route.ts` | `voiceScreening`, `integrationSetting` | `tenantPrisma.voiceScreening`, `tenantPrisma.integrationSetting` |
| `app/api/voice-screening/send-jd-email/route.ts` | `voiceScreening` | `tenantPrisma.voiceScreening` |
| `app/api/voice-screening/debug/route.ts` | `integrationSetting` | `tenantPrisma.integrationSetting` |
| `app/api/whatsapp/send/route.ts` | `integrationSetting`, `whatsAppMessage` | `tenantPrisma.integrationSetting`, `tenantPrisma.whatsAppMessage` |
| `app/api/whatsapp/messages/route.ts` | `whatsAppMessage` | `tenantPrisma.whatsAppMessage` |
| `app/api/whatsapp/templates/route.ts` | `whatsAppTemplate` | `tenantPrisma.whatsAppTemplate` |
| `app/api/whatsapp/templates/[id]/route.ts` | `whatsAppTemplate` | `tenantPrisma.whatsAppTemplate` |
| `app/api/email-campaigns/route.ts` | `emailCampaign` | `tenantPrisma.emailCampaign` |
| `app/api/email-campaigns/[id]/route.ts` | `emailCampaign` | `tenantPrisma.emailCampaign` |
| `app/api/email-campaigns/[id]/send/route.ts` | `emailCampaign`, `campaignRecipient` | `tenantPrisma.emailCampaign`, `tenantPrisma.campaignRecipient` |
| `app/api/email/send/route.ts` | `emailLog` | `tenantPrisma.emailLog` |
| `app/api/email-templates/route.ts` | `emailTemplate` | `tenantPrisma.emailTemplate` |
| `app/api/email-templates/[id]/route.ts` | `emailTemplate` | `tenantPrisma.emailTemplate` |
| `app/api/calendar/connections/route.ts` | `calendarConnection`, `integrationSetting` | `tenantPrisma.calendarConnection`, `tenantPrisma.integrationSetting` |
| `app/api/calendar/connections/[id]/route.ts` | `calendarConnection` | `tenantPrisma.calendarConnection` |
| `app/api/platform-subscriptions/route.ts` | `platformSubscription` | `tenantPrisma.platformSubscription` |
| `app/api/platform-subscriptions/[id]/route.ts` | `platformSubscription` | `tenantPrisma.platformSubscription` |
| `app/api/job-postings/route.ts` | `jobPosting` | `tenantPrisma.jobPosting` |
| `app/api/job-postings/[id]/route.ts` | `jobPosting` | `tenantPrisma.jobPosting` |
| `app/api/naukri-assistant/route.ts` | `naukriImport` | `tenantPrisma.naukriImport` |
| `app/api/naukri-assistant/parse/route.ts` | `naukriImport`, `naukriCandidate` | `tenantPrisma.naukriImport`, `tenantPrisma.naukriCandidate` |
| `app/api/naukri-assistant/[id]/route.ts` | `naukriImport`, `naukriCandidate` | `tenantPrisma.naukriImport`, `tenantPrisma.naukriCandidate` |
| `app/api/naukri-assistant/match/route.ts` | `naukriCandidate` | `tenantPrisma.naukriCandidate` |
| `app/api/naukri-assistant/import-to-pipeline/route.ts` | `naukriCandidate` | `tenantPrisma.naukriCandidate` |
| `app/api/call-analytics/route.ts` | `voiceScreening` | `tenantPrisma.voiceScreening` |
| `app/api/company-profile/route.ts` | `companyProfile` | `tenantPrisma.companyProfile` |
| `app/api/saved-searches/route.ts` | `savedSearch` | `tenantPrisma.savedSearch` |
| `app/api/reports/route.ts` | mixed | Audit and migrate remaining raw calls |

### 2.3 Enforcement Mode Switch

**`lib/tenant/prisma.ts`** — The proxy already supports enforce mode:

```typescript
// Already implemented in update() and delete():
if (ctx.enforcementMode === "enforce") {
  throw new Prisma.PrismaClientKnownRequestError("Record not found in tenant scope", ...);
}
```

**`lib/tenant/context.ts`** — Change the default mode:

```typescript
// Before:
export const tenantEnforcementMode: TenantEnforcementMode =
  process.env.TENANT_ENFORCEMENT_MODE === "enforce" ? "enforce" : "observe";

// After:
export const tenantEnforcementMode: TenantEnforcementMode =
  process.env.TENANT_ENFORCEMENT_MODE === "observe" ? "observe" : "enforce";
```

This makes `"enforce"` the default. Operators can still opt into `"observe"` by setting `TENANT_ENFORCEMENT_MODE=observe`.

### 2.4 Tenant-Safe `upload` Route

The `/api/upload/*` routes are in the middleware matcher but currently have no tenant boundary enforcement. The upload route typically references `candidateId` or other entities that are tenant-scoped. After the proxy expansion, the upload route's downstream queries (e.g., verifying a candidate exists before uploading a resume) will use `tenantPrisma` and inherit tenant filtering.

Verify that the upload route's pre-upload existence checks use `tenantPrisma` and not raw `prisma`.

---

## 3. Auth/Session Tenant Context Validation

### Problem

Currently, a user can log in and receive a valid session token even if:
- They have no active `OrganizationMembership`.
- Their default organization is suspended or archived.
- Their membership status is `INACTIVE` or `SUSPENDED`.

The session carries `role`, `clientId`, and `candidateId` but does not validate that the user has a current, active organization context.

### Action

Add a **session-level tenant validation** in the NextAuth `jwt` callback. After the user authenticates via credentials, verify that they have at least one active `OrganizationMembership` in the database. If they do not, reject the session.

### Implementation

**`lib/auth.ts`** — Add validation in `jwt` callback:

```typescript
async jwt({ token, user }) {
  if (user) {
    // Validate user has active organization membership before minting session token
    const membership = await prisma.organizationMembership.findFirst({
      where: { userId: user.id, status: "ACTIVE" },
      select: { organizationId: true, organization: { select: { status: true } } },
    });

    if (!membership || membership.organization.status !== "ACTIVE") {
      // Log and return token without role — middleware will reject
      console.warn(`[tenant-auth] User ${user.id} has no active organization membership`);
      return { ...token, id: user.id, role: null, clientId: null, candidateId: null };
    }

    token.id = user.id;
    token.role = user.role;
    token.clientId = user.clientId;
    token.candidateId = user.candidateId;
    token.organizationId = membership.organizationId;
  }
  return token;
}
```

Add `organizationId` to the JWT token type so middleware and API routes can reference it without a DB call:

**`types/next-auth.d.ts`:**

```typescript
interface JWT {
  organizationId?: string;
}
interface Session {
  user: {
    organizationId?: string;
  };
}
```

Update the `session` callback to propagate `organizationId`:

```typescript
async session({ session, token }) {
  if (session?.user) {
    (session.user as any).id = token.id;
    (session.user as any).role = token.role;
    (session.user as any).clientId = token.clientId;
    (session.user as any).candidateId = token.candidateId;
    (session.user as any).organizationId = token.organizationId;
  }
  return session;
}
```

### Middleware Enhancement

**`middleware.ts`** — Optionally add a `token.organizationId` check in the `authorized` callback to short-circuit unauthenticated sessions:

```typescript
callbacks: {
  authorized: ({ token }) => !!token && !!token.organizationId,
}
```

This prevents users whose org membership was revoked while logged in from accessing protected routes until they re-authenticate.

---

## 4. Client Portal Restrictions

### Current State

Client portal routes are protected by middleware role check (`role !== "CLIENT"`) and by page-level checks on `user.clientId`. However, the API calls from these pages use `tenantPrisma` which scopes by `organizationId` but does not additionally restrict by `clientId`.

### Problem

A client user in Organization A can see all jobs, applications, and interviews within Organization A that are associated with their `clientId` only if the query explicitly uses `clientId` as a filter. If a page omits the `clientId` filter, the client user sees all records in the org.

### Action

Instrument the `tenantPrisma` proxy to support **portal-level sub-scoping**. Add an optional `portalContext` to `TenantContext`:

**`lib/tenant/context.ts`:**

```typescript
export type TenantContext = {
  // ... existing fields ...
  portalContext?: {
    type: "client" | "candidate";
    id: string; // clientId or candidateId
  };
};
```

**`lib/tenant/prisma.ts`** — When `ctx.portalContext` is `{ type: "client", id }`, automatically inject `clientId` into queries for models that support it:

```typescript
function getPortalWhere(ctx: TenantContext, where: any, model: RepositoryModel): any {
  if (!ctx.portalContext) return where;

  switch (ctx.portalContext.type) {
    case "client":
      // Models where clientId can be directly filtered
      if (["job", "application", "interview", "offer"].includes(model)) {
        return { ...where, clientId: ctx.portalContext.id };
      }
      // Application/interview are scoped through job clientId
      return where;

    case "candidate":
      if (["application", "interview", "project", "note"].includes(model)) {
        return { ...where, candidateId: ctx.portalContext.id };
      }
      return where;
  }
}
```

The `TenantContext` resolver should set `portalContext` based on session role:

```typescript
if (user.role === "CLIENT" && user.clientId) {
  context.portalContext = { type: "client", id: user.clientId };
} else if (user.role === "CANDIDATE" && user.candidateId) {
  context.portalContext = { type: "candidate", id: user.candidateId };
}
```

### Client Portal Page Audit

Each client portal page should be audited to ensure its queries are covered by the proxy:

- `app/client-portal/page.tsx` — Dashboard with counts (uses `tenantPrisma`)
- `app/client-portal/jobs/page.tsx` — Job list (uses `tenantPrisma.job`)
- `app/client-portal/pipeline/page.tsx` — Pipeline (uses `tenantPrisma`)
- `app/client-portal/interviews/page.tsx` — Interview list (uses `tenantPrisma`)
- `app/client-portal/analytics/page.tsx` — Analytics (uses `tenantPrisma`)

---

## 5. Candidate Portal Restrictions

### Current State

Same as client portal — role-gated by middleware and page-level `candidateId` checks. The `tenantPrisma` proxy does not automatically scope by `candidateId`.

### Action

The portal context approach from Section 4 covers both portals. When `ctx.portalContext.type === "candidate"`, the proxy automatically adds `candidateId` to applicable query where clauses.

### Candidate Portal Page Audit

- `app/candidate-portal/page.tsx` — Dashboard
- `app/candidate-portal/profile/page.tsx` — Candidate profile
- `app/candidate-portal/interviews/page.tsx` — Interview list

All use `tenantPrisma` for queries. With the portal context in place, these will automatically scope to `candidateId`.

---

## 6. Reports/Analytics Tenant Enforcement

### Current State

`app/api/analytics/route.ts` mixes `tenantPrisma` and raw `prisma`:

```typescript
// Already tenant-scoped:
tenantPrisma.job.groupBy(...)
tenantPrisma.application.groupBy(...)
tenantPrisma.candidate.count()
tenantPrisma.client.count()

// NOT tenant-scoped (raw prisma):
prisma.offer.groupBy(...)   // → must use tenantPrisma.offer
prisma.prospect.groupBy(...) // → must use tenantPrisma.prospect
```

### Action

After the proxy expansion (Section 1), replace every raw `prisma.*` call in analytics and reports with the corresponding `tenantPrisma.*` call.

**`app/api/analytics/route.ts`:**

```typescript
// Before:
prisma.offer.groupBy({ by: ["status"], _count: true, where: ... })
// After:
tenantPrisma.offer.groupBy({ by: ["status"], _count: true, where: ... })

// Before:
prisma.prospect.groupBy({ by: ["status"], _count: true })
// After:
tenantPrisma.prospect.groupBy({ by: ["status"], _count: true })
```

**`app/api/reports/route.ts`:**

Audit for any remaining raw `prisma` calls against tenant-owned models. The report route builds complex filters for CSV export — ensure every `where` clause goes through `tenantPrisma`.

**`app/api/call-analytics/route.ts`:**

This uses `tenantPrisma` for `voiceScreening` (already proxied after expansion). Verify.

---

## 7. Provider Callback Handling

### Problem

Provider callbacks do not have a user session. Examples:

- `POST /api/voice-screening/twiml` — Called by Twilio during outbound call setup. Extracts `screeningId` from URL params.
- `POST /api/voice-screening/webhook` — Called by ElevenLabs agent during a call. Extracts `screeningId` from request body.
- `POST /api/voice-screening/callback` — Called by ElevenLabs after call completion.
- `POST /api/voice-screening/send-jd-email` — Called by the agent or a scheduled job.

These routes call `prisma.voiceScreening.findUnique({ where: { id } })` without any tenant filter. If a caller knows a valid `screeningId` from another organization, they can access that screening's data.

### Action

Replace provider-callback reads with **record-derived tenant resolution**. Instead of calling `resolveTenantContext()` (which returns a default tenant for unauthenticated callers), look up the record first, then verify the record belongs to an active organization.

Create a helper: **`lib/tenant/provider-context.ts`**

```typescript
import { prisma } from "@/lib/db";
import type { TenantContext } from "@/lib/tenant/context";

/**
 * For provider callbacks and webhooks that have no user session.
 * Resolves tenant context from the record itself after lookup.
 */
export async function resolveRecordTenantContext(
  model: string,
  recordId: string,
): Promise<{ record: any; tenantContext: TenantContext | null }> {
  // Look up the record to find its organizationId
  const record = await (prisma as any)[model].findUnique({
    where: { id: recordId },
    select: {
      id: true,
      organizationId: true,
      workspaceId: true,
      candidateId: true,
      applicationId: true,
      jobId: true,
    },
  });

  if (!record || !record.organizationId) {
    return { record: null, tenantContext: null };
  }

  // Verify the organization is still active
  const org = await prisma.organization.findUnique({
    where: { id: record.organizationId },
    select: { status: true },
  });

  if (!org || org.status !== "ACTIVE") {
    return { record, tenantContext: null };
  }

  return {
    record,
    tenantContext: {
      organizationId: record.organizationId,
      workspaceId: record.workspaceId ?? null,
      userId: null,
      organizationRole: null,
      workspaceRole: null,
      userRole: "SYSTEM",
      clientId: null,
      candidateId: record.candidateId ?? null,
      permissions: [],
      enforcementMode: "enforce",
    },
  };
}
```

**Refactored callback pattern:**

```typescript
// Before (voice-screening/twiml/route.ts):
const screening = await prisma.voiceScreening.findUnique({
  where: { id: screeningId },
});

// After:
const { record: screening, tenantContext } = await resolveRecordTenantContext("voiceScreening", screeningId);
if (!screening || !tenantContext) {
  return new Response("Not found", { status: 404 });
}
// Use tenantContext for subsequent tenantPrisma calls
const tenant = tenantPrisma.voiceScreening.withContext(tenantContext);
```

Since the current proxy resolves tenant context per-call (not accepting an external context), add a **`withContext(ctx)`** method to the repository/proxy that accepts a pre-resolved `TenantContext` instead of calling `resolveTenantContext()`:

**`lib/tenant/prisma.ts`** enhancement:

```typescript
function createRepository(model: RepositoryModel, delegate: PrismaDelegate) {
  return {
    // ... existing methods use resolveTenantContext() internally ...
    
    // New: Create a scoped instance with a pre-resolved context
    withContext(ctx: TenantContext | null) {
      const scope = scopeByModel[model];
      return {
        findMany: (args: any = {}) =>
          delegate.findMany({ ...args, where: getTenantWhere(ctx, args.where, scope) }),
        findFirst: (args: any = {}) =>
          delegate.findFirst({ ...args, where: getTenantWhere(ctx, args.where, scope) }),
        findUnique: (args: any) =>
          delegate.findFirst({ ...args, where: getScopedUniqueWhere(args.where, ctx, scope) }),
        count: (args: any = {}) =>
          delegate.count({ ...args, where: getTenantWhere(ctx, args.where, scope) }),
        // ... all other methods following the same pattern ...
      };
    },
  };
}
```

Provider callback routes must continue to use the raw delegate for the initial record lookup (to discover `organizationId`), but all subsequent queries use the `withContext`-scoped instance.

**Routes requiring provider-context refactor:**

| Route | Caller | Pattern |
|-------|--------|---------|
| `POST /api/voice-screening/twiml` | Twilio | Record-derived context from `screeningId` |
| `POST /api/voice-screening/webhook` | ElevenLabs | Record-derived context from `screeningId` |
| `POST /api/voice-screening/callback` | ElevenLabs | Record-derived context from `screeningId` |
| `POST /api/voice-screening/fetch-transcript` | Internal/server | Use session if available, fallback to record-derived |
| `POST /api/voice-screening/send-jd-email` | Internal/server | Use session (authenticated endpoint) |

---

## 8. Upload/Download Tenant Safety

### Current State

The `/api/upload/*` routes are listed in the middleware matcher, meaning they are auth-protected. However:

- Pre-upload existence checks (e.g., "does this candidate exist?") may use raw `prisma`.
- Download URLs are typically presigned S3 URLs with no tenant context.
- The candidate ID in the upload path could be from another tenant.

### Action

**Pre-upload validation** — Before generating a presigned URL, verify the referenced entity belongs to the caller's tenant:

- For candidate document uploads: `tenantPrisma.candidate.findUnique({ where: { id: candidateId } })` — the proxy handles tenant scoping.
- For client document uploads: `tenantPrisma.client.findUnique({ where: { id: clientId } })`.

**Download safety** — Presigned URLs are time-limited and entity-specific. The download route (`/api/upload/download`) should accept a token or entity ID and verify tenant access through the proxy before returning a presigned S3 URL for the file.

---

## 9. Test Cases

### 9.1 Unit Tests

Add to `tests/week3-tenant-repositories.test.ts` (expand to Week 4):

| Test ID | Description | Expected |
|---------|-------------|----------|
| T4-001 | `tenantPrisma.offer.findMany` injects `organizationId` | Where clause contains `organizationId` |
| T4-002 | `tenantPrisma.offer.create` writes `organizationId` and `workspaceId` | Create data contains both IDs |
| T4-003 | `tenantPrisma.prospect.findMany` scoped to organization | Only org-A prospects returned |
| T4-004 | `tenantPrisma.prospect.update` with cross-org ID returns error in enforce mode | Throws P2025 |
| T4-005 | `tenantPrisma.integrationSetting.findMany` with workspace scope | Where includes both org and workspace IDs |
| T4-006 | `tenantPrisma.voiceScreening.create` writes tenant IDs | Create data contains IDs |
| T4-007 | `withContext(ctx)` accepts pre-resolved context and scopes queries | All queries use provided context |
| T4-008 | Portal context adds `clientId` for CLIENT role on job queries | Where clause includes `clientId` |
| T4-009 | Portal context adds `candidateId` for CANDIDATE role on application queries | Where clause includes `candidateId` |
| T4-010 | `resolveRecordTenantContext` returns correct context from record | org ID matches the record's org |
| T4-011 | `resolveRecordTenantContext` returns null for inactive org | Null, no records leaked |

### 9.2 Cross-Tenant Isolation Tests (Integration)

Extend the two-tenant integration setup from Week 3:

| Test ID | Description | Expected |
|---------|-------------|----------|
| T4-020 | Admin in Org A lists prospects → only Org A prospects returned | 0 Org B prospects in results |
| T4-021 | Admin in Org A reads voice screening by ID from Org B | 404 or 403, never 200 |
| T4-022 | Client user in Org A accesses job from Org B client | 404 or access denied |
| T4-023 | Candidate user in Org A accesses application from Org B | 404 or access denied |
| T4-024 | Provider callback with valid screeningId returns correct org context | Context matches screening's org |
| T4-025 | Provider callback with invalid screeningId returns 404 | 404, no stack trace exposure |
| T4-026 | Email campaign created in Org A is not visible in Org B | 0 results |
| T4-027 | WhatsApp template in Org A not accessible from Org B | 404 |
| T4-028 | Platform subscription scoped to Org A workspace | Org B workspace sees different data |
| T4-029 | CompanyProfile is org-scoped, not global | Org A and Org B have separate profiles |

### 9.3 Enforcement Mode Tests

| Test ID | Description | Expected |
|---------|-------------|----------|
| T4-030 | Update with wrong org ID in enforce mode | P2025 error thrown |
| T4-031 | Update with wrong org ID in observe mode | Logged, update succeeds (backward compat) |
| T4-032 | Delete with wrong org ID in enforce mode | P2025 error thrown |
| T4-033 | Cross-tenant upsert in enforce mode | Only creates within caller's tenant |

### 9.4 Auth / Session Tests

| Test ID | Description | Expected |
|---------|-------------|----------|
| T4-040 | User with no active org membership logs in | Session token has `role: null`; middleware redirects |
| T4-041 | User with suspended org membership logs in | Session token has `role: null` |
| T4-042 | Admin with valid membership logs in | Session includes `organizationId` in token |
| T4-043 | Middleware rejects token with null role | Redirects to login |

### 9.5 Provider Callback Tests

| Test ID | Description | Expected |
|---------|-------------|----------|
| T4-050 | Twilio webhook with valid screening ID returns TwiML | Call proceeds normally |
| T4-051 | Twilio webhook with deleted screening ID returns 404 | Call rejected |
| T4-052 | ElevenLabs webhook with valid screening ID returns context | Job/candidate data returned |
| T4-053 | ElevenLabs webhook with cross-org screening ID returns 404 | No data leak |

---

## 10. Rollback Plan

### Soft Rollback (Configuration Change)

If enforcement causes breakage, set the env var and redeploy:

```env
TENANT_ENFORCEMENT_MODE=observe
```

This puts all 25 models back into observe mode (logging only, no blocking). The proxy expansion and API route migration remain in place; only the enforcement behavior changes.

### Hard Rollback (Code Revert)

If expanding the proxy causes performance or correctness issues:

1. Revert `lib/tenant/prisma.ts` to its Week 3 state (8 models only, observe default).
2. Revert `lib/tenant/context.ts` to Week 3 context resolution (no portal context).
3. Revert `lib/auth.ts` to Week 3 auth callbacks (no session org validation).
4. Revert `types/next-auth.d.ts` to Week 3 types.
5. Revert each API route that was changed from `prisma` to `tenantPrisma` back to raw `prisma`.
6. Revert `middleware.ts` to Week 3 middleware.
7. Remove `lib/tenant/provider-context.ts` if added.

Do **not** revert schema changes, migrations, or backfilled data. Week 4 makes no schema changes.

### Rollback Triggers

| Trigger | Action |
|---------|--------|
| Any API route returns 500 for authenticated users after proxy expansion | Soft rollback to observe mode |
| Client or candidate portal shows empty data for a valid user | Soft rollback, investigate portal context logic |
| Provider callbacks fail for valid screening records | Hard rollback provider-context changes only |
| Login fails for users with valid credentials | Hard rollback auth/session validation |
| Build fails after proxy expansion | Fix issue before proceeding; do not merge broken builds |
| Cross-tenant isolation test fails in staging | Investigate and fix before switching default to enforce |
| P95 API latency increases >20% | Investigate `resolveTenantContext()` call overhead; consider caching |

### Monitoring During Rollout

Log and alert on (each metric should be <1% of requests after the first hour):

- `tenant.enforce.blocked_update` — Cross-org update blocked in enforce mode
- `tenant.enforce.blocked_delete` — Cross-org delete blocked in enforce mode
- `tenant.context.missing` — No org context resolved for an authenticated request
- `tenant.context.default_fallback` — Unauthenticated request fell back to default tenant
- `tenant.portal.client.missing_id` — CLIENT role session has no `clientId`
- `tenant.portal.candidate.missing_id` — CANDIDATE role session has no `candidateId`
- `tenant.provider.record_not_found` — Provider callback with unrecognized record ID
- `tenant.provider.org_inactive` — Provider callback record belongs to inactive org

---

## 11. Acceptance Criteria

Week 4 is complete when:

### Proxy Coverage
1. All 25 tenant-owned models are in the `RepositoryModel` union.
2. Each model has an entry in `scopeByModel` with correct scope.
3. Each model has an entry in `delegateByModel` mapping to the raw Prisma delegate.
4. The `tenantPrisma` export object exposes all 25 models.

### API Route Migration
5. Every API route that reads/writes tenant-owned data uses `tenantPrisma` instead of raw `prisma`.
6. The analytics route no longer uses raw `prisma` for `offer` or `prospect` queries.
7. The reports route uses `tenantPrisma` for all tenant-owned model queries.

### Enforcement Mode
8. Default `TENANT_ENFORCEMENT_MODE` is `"enforce"`.
9. Observe mode is available as an opt-out (`TENANT_ENFORCEMENT_MODE=observe`).
10. Cross-tenant `update` and `delete` operations throw `P2025` in enforce mode.
11. Cross-tenant reads silently exclude records (no error — the record does not exist from the caller's perspective).

### Auth/Session Validation
12. Users with no active `OrganizationMembership` receive a limited session token.
13. The middleware checks for `organizationId` in the token.
14. Users whose org membership was revoked are blocked at the middleware level after re-auth.
15. The `session` object exposes `organizationId` for use in server components.

### Portal Sub-Scoping
16. Client portal users automatically see only records where `clientId` matches their session.
17. Candidate portal users automatically see only records where `candidateId` matches their session.
18. Client users cannot list all jobs — only jobs for their client.
19. Candidate users cannot list all applications — only their own.

### Provider Callback Safety
20. Provider callbacks use `resolveRecordTenantContext` for initial record lookup.
21. Provider callbacks use `withContext(ctx)` for subsequent tenant-scoped queries.
22. Provider callbacks return 404 for records that belong to inactive organizations.
23. Provider callbacks return 404 for records that do not exist.

### Upload Safety
24. Pre-upload existence checks use `tenantPrisma` for candidate/client lookups.
25. Download route validates tenant access before generating presigned URLs.

### Testing
26. Unit tests exist for all new proxy model entries (T4-001 through T4-011).
27. Cross-tenant isolation tests pass for Offer, Prospect, VoiceScreening, WhatsApp, EmailCampaign, CalendarConnection, PlatformSubscription, JobPosting, NaukriImport, NaukriCandidate, SavedSearch, CompanyProfile, and IntegrationSetting.
28. Enforcement mode tests confirm observe → enforce transition works.
29. Auth/session validation tests confirm blocked users cannot access protected routes.

### Rollback Readiness
30. Rollback can be triggered by setting `TENANT_ENFORCEMENT_MODE=observe` and redeploying.
31. No schema changes, Prisma schema changes, or migrations exist in Week 4.
32. All API routes still function correctly in observe mode.

---

## Implementation Order

1. **Expand proxy** — Add all 17 models to `RepositoryModel`, `scopeByModel`, `delegateByModel`, and the `tenantPrisma` export object in `lib/tenant/prisma.ts`.
2. **Add `withContext`** — Implement the method that accepts a pre-resolved `TenantContext` so provider callbacks and other sessionless code paths can use scoped queries.
3. **Create `lib/tenant/provider-context.ts`** — Implement `resolveRecordTenantContext` helper.
4. **Add portal context** — Extend `TenantContext` with `portalContext` and populate it in the resolver based on session role. Update `getTenantWhere` to use portal context.
5. **Migrate API routes** — Convert each route from raw `prisma` to `tenantPrisma`, grouped by domain:
   - Integration settings (5 routes)
   - Voice screening (5 routes, avoid provider-callback routes — handle separately)
   - WhatsApp (4 routes)
   - Email campaigns + templates (6 routes)
   - Calendar connections (2 routes)
   - Platform subscriptions (2 routes)
   - Job postings (2 routes)
   - Prospects (4 routes)
   - Naukri assistant (5 routes)
   - Analytics/reports (2 routes)
   - Company profile (1 route)
   - Saved searches (1 route)
   - Call analytics (1 route)
6. **Refactor provider callbacks** — Update Twilio/ ElevenLabs webhooks to use `resolveRecordTenantContext` + `withContext`.
7. **Add auth/session validation** — Update `lib/auth.ts` jwt callback and `middleware.ts`.
8. **Switch default to enforce** — Update `lib/tenant/context.ts` default mode.
9. **Add unit tests** — T4-001 to T4-011.
10. **Add integration tests** — T4-020 to T4-053.
11. **Run two-tenant isolation tests** — Verify cross-tenant boundaries.
12. **Run full build and smoke test** — `npm run build`, manual page testing.
13. **Document env var** — Update `.env.example` or deploy docs with `TENANT_ENFORCEMENT_MODE` options.
