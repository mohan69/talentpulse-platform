# WEEK 9 — RECRUITER REVENUE INTELLIGENCE PLAN

## Purpose

Week 9 builds a **recruiter revenue intelligence layer** that computes recruiter productivity, source effectiveness, revenue opportunity, client profitability, placement probability, and leaderboard rankings — all from existing data at query time.

The platform already has screening intelligence (Week 7), submission intelligence (Week 8), conversation capture (Week 6), institutional memory (Week 5), tenant-safe repositories (Weeks 3-4), and basic analytics/reporting (`/api/analytics`, `/api/reports`). What it lacks is **quantitative business intelligence** — the ability to answer: *Which recruiter generates the most revenue? Which source yields the best placements? Which clients are most profitable? What is the expected revenue from the current pipeline?*

Week 9 does **not** introduce billing, invoicing, payments, or financial transactions. It computes estimates and signals using existing `Offer.feePercent`, `Offer.feeAmount`, `Job.salaryMax`, `Candidate.source`, pipeline stages, and activity log entries — all at query time.

## Principles

1. **No schema changes** — All revenue intelligence is computed at query time from existing model fields. No new columns, tables, indexes, or migrations.
2. **Estimates, not accounting** — Revenue figures are estimates based on configured fee rates and offer data. Not a billing system.
3. **Query-time computation** — Every metric, score, and leaderboard position is recalculated on every request. No pre-computation, no materialized views, no caching layer.
4. **Tenant-safe** — All revenue queries go through the Week 3/4 repository layer with tenant context.
5. **Recruiter-centric** — The primary dimension for all metrics is the recruiter (user with role RECRUITER). Secondary dimensions: client, source, time period.
6. **Configurable fee model** — A default fee rate is configurable per organization; individual offers can override via `Offer.feePercent`.
7. **Historical window** — All metrics support date range filtering (from, to) and default to trailing 12 months.
8. **No financial data stored** — No new fields for cost, margin, or ROI. Source effectiveness uses proxy metrics (application-to-join rate, time-to-join).
9. **Memory-light** — Revenue events (offer accepted, candidate joined, fee configured) are captured as memory entries but are not the primary data source.

---

## 1. Recruiter Productivity Intelligence

### 1.1 Productivity Dimensions

A recruiter's productivity is measured across five dimensions:

| Dimension | Metric | Source |
|-----------|--------|--------|
| Pipeline velocity | Applications processed, stage transition speed | `Application.stage`, `Application.createdAt`, `Application.updatedAt` |
| Screening accuracy | Match score distribution, interview pass rate | `Application.matchScore`, `Interview.outcome` |
| Submission quality | Submission-to-interview rate, submission-to-offer rate | `Application.submittedAt`, `Interview`, `Offer` |
| Closure rate | Offer accept rate, time-to-offer, time-to-join | `Offer.status`, `Offer.acceptedAt`, `Offer.actualJoinedAt` |
| Revenue generation | Estimated fee revenue, fee per placement | `Offer.feePercent`, `Offer.feeAmount`, `Offer.offeredCtc` |

### 1.2 ProductivityScore Type

```typescript
export interface RecruiterProductivityScore {
  recruiterId: string;
  recruiterName: string;
  recruiterEmail: string;

  // Period
  period: { from: string; to: string };

  // Pipeline velocity
  applicationsProcessed: number;          // Applications where stage changed from NEW
  averageDaysInPipeline: number;          // Average days from NEW to JOINED or REJECTED
  stageTransitionCount: number;           // Total stage changes (from ActivityLog with action="stage_changed")
  activeApplications: number;             // Applications not in JOINED/REJECTED

  // Screening accuracy
  averageMatchScore: number | null;       // Average Application.matchScore across all apps
  highMatchCount: number;                 // Apps with matchScore >= 80
  interviewPassRate: number | null;       // Interviews with PROCEED outcome / total completed
  screeningToInterviewRate: number | null; // Apps reaching interview / total apps

  // Submission quality
  totalSubmissions: number;               // Apps with stage >= SUBMITTED
  submissionToOfferRate: number | null;   // Offers / submissions
  submissionToJoinRate: number | null;    // Joins / submissions

  // Closure rate
  offersExtended: number;
  offersAccepted: number;
  offersRejected: number;
  totalJoins: number;
  offerAcceptRate: number | null;         // Accepted / Extended
  averageDaysToOffer: number | null;      // Days from submission to offer
  averageDaysToJoin: number | null;       // Days from offer to join

  // Revenue
  estimatedRevenue: number;               // Sum of fee amounts for joined candidates
  averageFeePerPlacement: number | null;   // EstimatedRevenue / totalJoins
  totalFeeValue: number;                  // Sum of fee amounts (including pending offers)
  projectedQuarterlyRevenue: number;      // Estimated annual run-rate from last 3 months
}
```

### 1.3 Computation Engine

```typescript
// lib/revenue/productivity.ts

export async function computeRecruiterProductivity(
  ctx: TenantContext,
  recruiterId: string,
  options?: { from?: Date; to?: Date },
): Promise<RecruiterProductivityScore> {
  // 1. Fetch all jobs owned by this recruiter
  const jobs = await (tenantPrisma.job as any).withContext(ctx).findMany({
    where: { recruiterId, ...(options?.from ? { createdAt: { gte: options.from } } : {}) },
    select: { id: true },
  });
  const jobIds = jobs.map((j: any) => j.id);

  // 2. Fetch all applications for those jobs (with date filter)
  const appWhere: any = { jobId: { in: jobIds } };
  if (options?.from || options?.to) {
    appWhere.createdAt = {};
    if (options?.from) appWhere.createdAt.gte = options.from;
    if (options?.to) appWhere.createdAt.lte = options.to;
  }
  const applications = await (tenantPrisma.application as any).withContext(ctx).findMany({
    where: appWhere,
    include: {
      interviews: { select: { outcome: true } },
      offers: { select: { status: true, offeredCtc: true, feePercent: true, feeAmount: true, createdAt: true } },
    },
  });

  // 3. Fetch stage change memory entries for pipeline velocity
  const memory = await getMemory(ctx, {
    entityType: "application",
    entityId: undefined, // all applications
    action: "stage_changed",
    userId: recruiterId,
    since: options?.from,
    until: options?.to,
  });

  // 4. Compute each dimension from the fetched data
  // ... (mapping logic, averages, rates)

  // 5. Calculate revenue
  const totalFeeValue = computeTotalFee(applications, DEFAULT_FEE_PERCENT);

  // 6. Return aggregated RecruiterProductivityScore
}
```

### 1.4 Fee Estimation

```typescript
// lib/revenue/fees.ts

const DEFAULT_FEE_PERCENT = 8.33; // 1 month salary = 8.33% of annual CTC

export function estimateFeeAmount(
  offer: { offeredCtc: number; feePercent?: number | null; feeAmount?: number | null },
  defaultPercent: number = DEFAULT_FEE_PERCENT,
): number {
  // Prefer explicit feeAmount
  if (offer.feeAmount != null && offer.feeAmount > 0) return offer.feeAmount;
  // Compute from feePercent
  const percent = offer.feePercent ?? defaultPercent;
  return Math.round(offer.offeredCtc * (percent / 100));
}

export function computeTotalFee(
  applications: any[],
  defaultPercent: number = DEFAULT_FEE_PERCENT,
): number {
  let total = 0;
  for (const app of applications) {
    for (const offer of (app.offers ?? [])) {
      if (offer.status === "ACCEPTED" || offer.status === "EXTENDED") {
        total += estimateFeeAmount(offer, defaultPercent);
      }
    }
  }
  return total;
}
```

### 1.5 Productivity Aggregate — All Recruiters

```typescript
export async function computeAllRecruiterProductivity(
  ctx: TenantContext,
  options?: { from?: Date; to?: Date },
): Promise<RecruiterProductivityScore[]> {
  // 1. Get all RECRUITER users in the organization
  const users = await prisma.user.findMany({
    where: {
      role: "RECRUITER",
      organizationMemberships: { some: { organizationId: ctx.organizationId, status: "ACTIVE" } },
    },
    select: { id: true, name: true, email: true },
  });

  // 2. Compute productivity for each in parallel
  const results = await Promise.all(
    users.map((user) => computeRecruiterProductivity(ctx, user.id, options)),
  );

  // 3. Sort by totalJoins desc (or by any metric)
  return results.sort((a, b) => b.totalJoins - a.totalJoins);
}
```

---

## 2. Source Effectiveness Intelligence

### 2.1 Source Dimensions

| Source | Enum Value | Typical Cost Proxy |
|--------|-----------|-------------------|
| LinkedIn | `LINKEDIN` | High (premium sourcing) |
| Naukri | `NAUKRI` | Medium (portal subscription) |
| Referral | `REFERRAL` | Low (bonus if hired) |
| Internal DB | `INTERNAL_DB` | None |
| Direct | `DIRECT` | None (inbound) |
| Other | `OTHER` | Variable |

### 2.2 SourceEffectiveness Type

```typescript
export interface SourceEffectiveness {
  source: string;                   // "LINKEDIN", "NAUKRI", "REFERRAL", "INTERNAL_DB", "DIRECT", "OTHER"
  sourceLabel: string;              // Human-readable: "LinkedIn", "Naukri", "Referral", etc.

  // Volume
  totalCandidates: number;          // Candidates from this source
  totalApplications: number;        // Applications from these candidates
  activeCandidates: number;         // Candidates not rejected/joined

  // Funnel
  screened: number;                 // Applications that reached AI_SCREENING or beyond
  submitted: number;                // Applications that reached SUBMITTED or beyond
  interviewed: number;              // Applications with at least one interview
  offered: number;                  // Applications with an accepted offer
  joined: number;                   // Applications where candidate joined

  // Conversion rates
  applicationToScreen: number | null;
  screenToSubmit: number | null;
  submitToInterview: number | null;
  interviewToOffer: number | null;
  offerToJoin: number | null;
  overallConversion: number | null; // joined / totalApplications

  // Quality
  averageMatchScore: number | null;
  averageDaysToJoin: number | null;
  averageFeePerPlacement: number | null;

  // Revenue
  totalEstimatedRevenue: number;
  estimatedROI: string;             // "high" | "medium" | "low" — based on join count relative to assumed cost
}
```

### 2.3 Computation Engine

```typescript
// lib/revenue/sources.ts

export async function computeSourceEffectiveness(
  ctx: TenantContext,
  options?: { from?: Date; to?: Date },
): Promise<SourceEffectiveness[]> {
  // 1. Group candidates by source
  const candidateWhere: any = {};
  if (options?.from) candidateWhere.createdAt = { gte: options.from };
  if (options?.to) candidateWhere.createdAt = { ...candidateWhere.createdAt, lte: options.to };

  const candidates = await (tenantPrisma.candidate as any).withContext(ctx).findMany({
    where: candidateWhere,
    include: {
      applications: {
        include: {
          interviews: { select: { id: true } },
          offers: { select: { status: true, offeredCtc: true, feePercent: true, feeAmount: true } },
        },
      },
    },
  });

  // 2. Group by source
  const bySource = new Map<string, any[]>();
  for (const candidate of candidates) {
    const source = candidate.source ?? "OTHER";
    const bucket = bySource.get(source) ?? [];
    bucket.push(candidate);
    bySource.set(source, bucket);
  }

  // 3. Compute per-source metrics
  const results: SourceEffectiveness[] = [];
  for (const [source, group] of bySource) {
    const metrics = computeSourceMetrics(source, group);
    results.push(metrics);
  }

  // 4. Sort by totalApplications descending
  return results.sort((a, b) => b.totalCandidates - a.totalCandidates);
}
```

### 2.4 ROI Classification

```typescript
function classifyROI(source: string, joined: number, totalCandidates: number): "high" | "medium" | "low" {
  if (totalCandidates === 0) return "low";

  const joinRate = joined / totalCandidates;

  // High ROI: referral (free) or direct (inbound) with good join rate
  if (source === "REFERRAL" && joinRate >= 0.05) return "high";
  if (source === "DIRECT" && joinRate >= 0.03) return "high";
  if (source === "INTERNAL_DB" && joinRate >= 0.02) return "high";

  // Medium ROI
  if (joinRate >= 0.02) return "medium";

  // Low ROI
  return "low";
}
```

---

## 3. Revenue Opportunity Estimation

### 3.1 Revenue Types

```typescript
export interface RevenueOpportunity {
  // Realized revenue
  realizedRevenue: {
    total: number;                    // Sum of fees for joined candidates
    byRecruiter: { recruiterId: string; recruiterName: string; amount: number }[];
    byClient: { clientId: string; clientName: string; amount: number }[];
    byMonth: { month: string; amount: number }[];
  };

  // Pipeline revenue (probabilistic, based on stage conversion)
  pipelineRevenue: {
    total: number;                    // Sum of estimated fees * probability for active applications
    byStage: { stage: string; amount: number; probability: number }[];
    weightedTotal: number;            // Sum of amount * probability
    expectedValue: number;            // Most likely outcome
    optimisticValue: number;          // If all offers close
    pessimisticValue: number;         // If only joined-stage materializes
  };

  // At-risk revenue
  atRiskRevenue: {
    total: number;                    // Sum of fees for EXTENDED offers nearing decision deadline
    staleOffers: number;              // Offers EXTENDED > 14 days without response
    joiningAtRisk: number;            // ACCEPTED offers where joining date > 30 days away
  };

  // Revenue by client
  clientRevenue: {
    clientId: string;
    clientName: string;
    totalRevenue: number;
    activeJobs: number;
    filledJobs: number;
    estimatedAnnualRevenue: number;   // Run-rate from trailing 12 months
    revenueTrend: "growing" | "stable" | "declining" | "new";
  }[];
}
```

### 3.2 Stage-Based Conversion Probabilities

```typescript
// lib/revenue/opportunity.ts

// Default conversion probabilities (can be overridden per organization)
const STAGE_CONVERSION_PROBABILITIES: Record<string, number> = {
  NEW: 0.02,                    // 2% chance to ever reach JOINED
  AI_SCREENING: 0.05,           // 5%
  REVIEWED: 0.08,               // 8%
  SUBMITTED: 0.15,              // 15%
  INTERVIEW_SCHEDULED: 0.25,    // 25%
  INTERVIEW_COMPLETE: 0.35,     // 35%
  OFFER_EXTENDED: 0.60,         // 60%
  OFFER_ACCEPTED: 0.85,         // 85%
  JOINED: 1.0,                  // 100% (already realized)
};
```

### 3.3 Computation Engine

```typescript
export async function computeRevenueOpportunity(
  ctx: TenantContext,
  options?: { from?: Date; to?: Date },
): Promise<RevenueOpportunity> {
  // 1. Fetch all non-rejected applications with their offers
  const applications = await (tenantPrisma.application as any).withContext(ctx).findMany({
    where: {
      ...(options?.from ? { createdAt: { gte: options.from } } : {}),
    },
    include: {
      job: { select: { title: true, client: { select: { id: true, name: true } } } },
      offers: { select: { status: true, offeredCtc: true, feePercent: true, feeAmount: true, createdAt: true } },
    },
  });

  // 2. Separate realized (JOINED) vs pipeline (active) vs at-risk
  const realized = applications.filter((a) => a.stage === "JOINED");
  const active = applications.filter((a) =>
    !["JOINED", "REJECTED", "ON_HOLD"].includes(a.stage)
  );
  const atRisk = applications.filter((a) =>
    a.offers.some((o: any) => o.status === "EXTENDED" || o.status === "ACCEPTED")
  );

  // 3. Compute realized revenue
  const realizedRevenue = computeRealizedRevenue(realized);

  // 4. Compute pipeline revenue with probability weights
  const pipelineRevenue = computePipelineRevenue(active, STAGE_CONVERSION_PROBABILITIES);

  // 5. Compute at-risk signals
  const atRiskRevenue = computeAtRiskRevenue(atRisk);

  // 6. Client revenue breakdown
  const clientRevenue = computeClientRevenueBreakdown(applications);

  return { realizedRevenue, pipelineRevenue, atRiskRevenue, clientRevenue };
}
```

### 3.4 Pipeline Revenue Detail

```typescript
function computePipelineRevenue(
  applications: any[],
  probabilities: Record<string, number>,
): RevenueOpportunity["pipelineRevenue"] {
  const byStage = new Map<string, { count: number; totalFee: number }>();

  for (const app of applications) {
    const stage = app.stage;
    const fee = app.offers?.length > 0
      ? estimateFeeAmount(app.offers[0])
      : estimateFeeAmount({ offeredCtc: app.job?.salaryMax ?? 0 });
    const cur = byStage.get(stage) ?? { count: 0, totalFee: 0 };
    cur.count++;
    cur.totalFee += fee;
    byStage.set(stage, cur);
  }

  const stageItems = Array.from(byStage.entries())
    .filter(([stage]) => probabilities[stage] != null)
    .map(([stage, { count, totalFee }]) => ({
      stage,
      amount: Math.round(totalFee),
      probability: probabilities[stage],
    }));

  const weightedTotal = stageItems.reduce((sum, s) => sum + s.amount * s.probability, 0);
  const expectedValue = stageItems.reduce((sum, s) => sum + s.amount * s.probability, 0);
  const optimisticValue = stageItems.reduce((sum, s) => sum + s.amount * Math.min(1, s.probability + 0.2), 0);
  const pessimisticValue = stageItems.filter((s) => s.probability >= 0.6)
    .reduce((sum, s) => sum + s.amount * s.probability, 0);

  return {
    total: Math.round(stageItems.reduce((sum, s) => sum + s.amount, 0)),
    byStage: stageItems,
    weightedTotal: Math.round(weightedTotal),
    expectedValue: Math.round(expectedValue),
    optimisticValue: Math.round(optimisticValue),
    pessimisticValue: Math.round(pessimisticValue),
  };
}
```

---

## 4. Client Profitability Signals

### 4.1 ClientProfitability Type

```typescript
export interface ClientProfitabilitySignal {
  clientId: string;
  clientName: string;
  industry: string | null;
  isActive: boolean;

  // Engagement
  totalJobs: number;
  activeJobs: number;
  filledJobs: number;
  totalApplications: number;
  totalSubmissions: number;
  totalInterviews: number;

  // Revenue
  totalEstimatedRevenue: number;          // Sum of fees for joined candidates
  pendingPipelineValue: number;           // Weighted revenue from active pipeline
  totalOpportunityValue: number;          // TotalEstimatedRevenue + PendingPipelineValue
  averageFeePerFill: number | null;       // TotalEstimatedRevenue / filledJobs

  // Efficiency
  applicationsPerFill: number | null;     // TotalApplications / filledJobs
  interviewsPerFill: number | null;       // TotalInterviews / filledJobs
  submissionsPerFill: number | null;      // TotalSubmissions / filledJobs
  averageDaysToFill: number | null;       // Average days from job creation to JOINED

  // Health signals
  revenueTrend: "growing" | "stable" | "declining" | "new";
  engagementHealth: "high" | "medium" | "low";  // Based on active jobs, submission velocity
  churnRisk: "low" | "medium" | "high";          // Based on declining engagement or no recent submissions
  lastSubmissionDate: string | null;             // Date of last submission to this client
}
```

### 4.2 Computation Engine

```typescript
// lib/revenue/clients.ts

export async function computeClientProfitability(
  ctx: TenantContext,
  options?: { from?: Date; to?: Date; clientId?: string },
): Promise<ClientProfitabilitySignal[]> {
  // 1. Fetch clients with jobs and applications
  const clientWhere: any = {};
  if (options?.clientId) clientWhere.id = options.clientId;

  const clients = await (tenantPrisma.client as any).withContext(ctx).findMany({
    where: clientWhere,
    include: {
      jobs: {
        include: {
          applications: {
            include: {
              offers: { select: { status: true, offeredCtc: true, feePercent: true, feeAmount: true, createdAt: true } },
            },
            ...(options?.from ? { where: { createdAt: { gte: options.from } } } : {}),
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // 2. Compute per-client metrics
  return clients.map((client: any) => computeSingleClientProfitability(ctx, client));
}
```

### 4.3 Engagement Health Classification

```typescript
function classifyEngagementHealth(client: ClientProfitabilitySignal): "high" | "medium" | "low" {
  if (client.activeJobs >= 3 && client.lastSubmissionDate !== null) return "high";
  if (client.activeJobs >= 1) return "medium";
  return "low";
}

function classifyChurnRisk(client: ClientProfitabilitySignal): "low" | "medium" | "high" {
  if (!client.lastSubmissionDate) return "high";         // Never submitted
  const lastSub = new Date(client.lastSubmissionDate).getTime();
  const daysSinceLastSub = (Date.now() - lastSub) / (1000 * 60 * 60 * 24);
  if (daysSinceLastSub > 90) return "high";              // No submission in 3 months
  if (daysSinceLastSub > 30) return "medium";            // No submission in 1 month
  return "low";                                          // Active
}
```

---

## 5. Placement Probability Signals

### 5.1 PlacementProbability Type

```typescript
export interface PlacementProbabilitySignal {
  applicationId: string;
  candidateName: string;
  jobTitle: string;
  clientName: string;
  currentStage: string;

  // Core probability
  baseProbability: number;              // From STAGE_CONVERSION_PROBABILITIES
  adjustedProbability: number;          // After applying signal modifiers
  confidenceLevel: "high" | "medium" | "low";  // Based on data completeness

  // Signal modifiers (each can be -0.xx to +0.xx)
  modifiers: {
    name: string;
    label: string;
    delta: number;                      // Positive = increases probability
    reason: string;
  }[];

  // Estimated fee at placement
  estimatedFeeAtPlacement: number;      // If this candidate joins

  // Expected value
  expectedValue: number;                // adjustedProbability * estimatedFeeAtPlacement

  // Key drivers
  positiveDrivers: string[];            // What increases confidence
  concerns: string[];                   // What decreases confidence
  nextRecommendedAction: string;        // What to do to improve probability
}
```

### 5.2 Signal Modifiers

```typescript
const SIGNAL_MODIFIERS: Array<{
  name: string;
  evaluate: (app: any, facts?: ScreeningFacts) => { delta: number; reason: string } | null;
}> = [
  {
    // Strong skill match increases probability
    name: "skill_fit",
    evaluate: (app, facts) => {
      if (!facts?.skillFit) return null;
      if (facts.skillFit.score >= 80) return { delta: 0.10, reason: "Strong skill match (>80%)" };
      if (facts.skillFit.score < 40) return { delta: -0.10, reason: "Weak skill match (<40%)" };
      return null;
    },
  },
  {
    // Voice screening score boosts confidence
    name: "voice_screening",
    evaluate: (app, facts) => {
      if (!facts?.voiceScreeningSummary?.completed) return null;
      const score = facts.voiceScreeningSummary.score ?? 0;
      if (score >= 80) return { delta: 0.08, reason: `Voice screening score: ${score}/100` };
      if (score < 50) return { delta: -0.08, reason: `Voice screening concern: ${score}/100` };
      return null;
    },
  },
  {
    // Interview outcome history
    name: "interview_history",
    evaluate: (app, facts) => {
      if (!facts?.interviewOutcomes) return null;
      const { proceeded, rejected, total } = facts.interviewOutcomes;
      if (total === 0) return null;
      if (rejected > 0) return { delta: -0.10, reason: `${rejected} prior rejection(s) in pipeline` };
      if (proceeded === total && total >= 2) return { delta: 0.08, reason: "Consistent interview progression" };
      return null;
    },
  },
  {
    // CTC fit affects offer acceptance likelihood
    name: "ctc_fit",
    evaluate: (app, facts) => {
      if (!facts?.ctcFit) return null;
      if (facts.ctcFit.status === "ok") return { delta: 0.05, reason: "CTC within budget range" };
      if (facts.ctcFit.status === "mismatch") return { delta: -0.15, reason: "CTC mismatch with budget" };
      return null;
    },
  },
  {
    // Notice period affects joining timeline risk
    name: "notice_period",
    evaluate: (app, facts) => {
      if (!facts?.noticePeriod) return null;
      if (facts.noticePeriod.status === "immediate") return { delta: 0.05, reason: "Immediate availability" };
      if (facts.noticePeriod.status === "long") return { delta: -0.08, reason: "Extended notice period" };
      return null;
    },
  },
  {
    // Counter-offer risk reduces probability
    name: "counter_offer_risk",
    evaluate: (app, facts, risks) => {
      if (!risks?.some((r) => r.type === "counter_offer")) return null;
      return { delta: -0.12, reason: "Counter-offer risk identified" };
    },
  },
  {
    // Pipeline aging — longer in stage = lower probability
    name: "pipeline_age",
    evaluate: (app, facts) => {
      if (!facts?.pipelineHistory) return null;
      const days = facts.pipelineHistory.daysInStage;
      if (days > 30) return { delta: -0.08, reason: `Stalled: ${days} days in current stage` };
      if (days > 14) return { delta: -0.03, reason: `${days} days in current stage` };
      return null;
    },
  },
  {
    // Recruiter notes signal interest level
    name: "recruiter_interest",
    evaluate: (app, facts) => {
      if (!facts?.recruiterNotesSummary?.length) return null;
      const positiveNote = facts.recruiterNotesSummary.some(
        (n) => /\b(interested|strong|excellent|good fit|proceed)\b/i.test(n)
      );
      const negativeNote = facts.recruiterNotesSummary.some(
        (n) => /\b(concern|risk|unresponsive|declined|not interested)\b/i.test(n)
      );
      if (positiveNote) return { delta: 0.06, reason: "Recruiter notes indicate positive signal" };
      if (negativeNote) return { delta: -0.10, reason: "Recruiter notes indicate concern" };
      return null;
    },
  },
];
```

### 5.3 Computation Engine

```typescript
// lib/revenue/placement.ts

export async function computePlacementProbability(
  ctx: TenantContext,
  applicationId: string,
): Promise<PlacementProbabilitySignal | null> {
  // 1. Fetch the screening workbench (Week 7) for facts and risks
  const workbench = await getScreeningWorkbench(ctx, { applicationId });
  if (!workbench) return null;

  const { application, facts, risks } = workbench;
  const stage = application.stage;

  // 2. Get base probability
  const baseProbability = STAGE_CONVERSION_PROBABILITIES[stage] ?? 0.02;

  // 3. Evaluate signal modifiers
  const modifiers: PlacementProbabilitySignal["modifiers"] = [];
  for (const signal of SIGNAL_MODIFIERS) {
    const result = signal.evaluate(application, facts, risks);
    if (result) {
      modifiers.push({ name: signal.name, ...result });
    }
  }

  // 4. Compute adjusted probability
  const totalDelta = modifiers.reduce((sum, m) => sum + m.delta, 0);
  const adjustedProbability = Math.max(0.01, Math.min(0.99, baseProbability + totalDelta));

  // 5. Estimate fee at placement
  const offer = application.offers?.[0];
  const estimatedFeeAtPlacement = offer
    ? estimateFeeAmount(offer)
    : estimateFeeAmount({ offeredCtc: application.job?.salaryMax ?? 0 });

  const expectedValue = Math.round(adjustedProbability * estimatedFeeAtPlacement);

  // 6. Classify confidence level
  const confidenceLevel = facts.educationFit.assessed && facts.skillFit.matched.length > 0
    ? "high"
    : modifiers.length > 2
      ? "medium"
      : "low";

  // 7. Build drivers and concerns
  const positiveDrivers = modifiers.filter((m) => m.delta > 0).map((m) => m.reason);
  const concerns = modifiers.filter((m) => m.delta < 0).map((m) => m.reason);

  const nextRecommendedAction = stage === "SUBMITTED"
    ? "Follow up with client for feedback and interview scheduling"
    : stage === "INTERVIEW_SCHEDULED"
      ? "Prepare candidate for upcoming interview"
      : stage === "OFFER_EXTENDED"
        ? "Follow up with candidate for decision; address counter-offer concerns"
        : "Advance candidate to next pipeline stage";

  return {
    applicationId: application.id,
    candidateName: application.candidate?.name ?? "Unknown",
    jobTitle: application.job?.title ?? "Unknown",
    clientName: application.job?.client?.name ?? "Unknown",
    currentStage: stage,
    baseProbability,
    adjustedProbability: Math.round(adjustedProbability * 100) / 100,
    confidenceLevel,
    modifiers,
    estimatedFeeAtPlacement,
    expectedValue,
    positiveDrivers,
    concerns,
    nextRecommendedAction,
  };
}
```

---

## 6. Recruiter Leaderboard

### 6.1 LeaderboardEntry Type

```typescript
export interface LeaderboardEntry {
  rank: number;
  recruiterId: string;
  recruiterName: string;
  recruiterEmail: string;

  // Composite scores (each 0-100)
  scores: {
    overall: number;              // Weighted composite of all below
    velocity: number;             // Pipeline velocity score
    quality: number;              // Screening accuracy & submission quality
    closure: number;              // Offer closure rate & speed
    revenue: number;              // Revenue generated (scaled to 0-100)
  };

  // Raw metrics (for display)
  raw: {
    totalApplications: number;
    totalSubmissions: number;
    totalInterviews: number;
    totalOffers: number;
    totalJoins: number;
    estimatedRevenue: number;
    averageDaysToJoin: number | null;
  };

  // Trend
  trend: "up" | "down" | "stable";
  previousRank: number | null;    // Rank in previous period for trend calculation

  // Badges
  badges: string[];               // ["top-performer", "rising-star", "revenue-leader", "quality-champion"]
}
```

### 6.2 Composite Score Weights

```typescript
const LEADERBOARD_WEIGHTS = {
  velocity: 0.15,     // 15% — how fast they process candidates
  quality: 0.25,      // 25% — how accurate their screening is
  closure: 0.30,      // 30% — how often they close
  revenue: 0.30,      // 30% — how much revenue they generate
};
```

### 6.3 Scoring Functions

```typescript
function scoreVelocity(metrics: RecruiterProductivityScore): number {
  // Score based on applicationsProcessed relative to max
  // and averageDaysInPipeline (faster = better)
  const appScore = Math.min(100, metrics.applicationsProcessed * 5);
  const daysScore = metrics.averageDaysInPipeline != null
    ? Math.max(0, 100 - metrics.averageDaysInPipeline)
    : 50;
  return Math.round(appScore * 0.4 + daysScore * 0.6);
}

function scoreQuality(metrics: RecruiterProductivityScore): number {
  // Score based on interview pass rate, match score, submission quality
  const passRate = metrics.interviewPassRate ?? 50;
  const matchScore = metrics.averageMatchScore ?? 50;
  const submitToOffer = metrics.submissionToOfferRate ?? 0;
  return Math.round(passRate * 0.3 + matchScore * 0.3 + submitToOffer * 0.4);
}

function scoreClosure(metrics: RecruiterProductivityScore): number {
  // Score based on totalJoins, offerAcceptRate, speed
  const joinScore = Math.min(100, metrics.totalJoins * 20);
  const acceptRate = metrics.offerAcceptRate ?? 0;
  const speedScore = metrics.averageDaysToJoin != null
    ? Math.max(0, 100 - metrics.averageDaysToJoin)
    : 50;
  return Math.round(joinScore * 0.4 + acceptRate * 0.3 + speedScore * 0.3);
}

function scoreRevenue(metrics: RecruiterProductivityScore): number {
  // Score based on estimatedRevenue relative to max across all recruiters
  // Scaled to 0-100 (normalized against peers)
  return Math.min(100, Math.round(metrics.estimatedRevenue / 100000));
}
```

### 6.4 Composite Computation

```typescript
export async function computeLeaderboard(
  ctx: TenantContext,
  options?: { from?: Date; to?: Date },
): Promise<LeaderboardEntry[]> {
  // 1. Compute productivity for all recruiters
  const scores = await computeAllRecruiterProductivity(ctx, options);

  // 2. Compute per-recruiter dimension scores
  const entries: LeaderboardEntry[] = scores.map((metrics) => ({
    velocity: scoreVelocity(metrics),
    quality: scoreQuality(metrics),
    closure: scoreClosure(metrics),
    revenue: scoreRevenue(metrics),
  })).map((dimScores, i) => {
    const overall = Math.round(
      dimScores.velocity * LEADERBOARD_WEIGHTS.velocity +
      dimScores.quality * LEADERBOARD_WEIGHTS.quality +
      dimScores.closure * LEADERBOARD_WEIGHTS.closure +
      dimScores.revenue * LEADERBOARD_WEIGHTS.revenue
    );
    return {
      rank: 0, // assigned after sorting
      recruiterId: scores[i].recruiterId,
      recruiterName: scores[i].recruiterName,
      recruiterEmail: scores[i].recruiterEmail,
      scores: { overall, ...dimScores },
      raw: {
        totalApplications: scores[i].applicationsProcessed,
        totalSubmissions: scores[i].totalSubmissions,
        totalInterviews: scores[i].offersExtended,
        totalOffers: scores[i].offersAccepted,
        totalJoins: scores[i].totalJoins,
        estimatedRevenue: scores[i].estimatedRevenue,
        averageDaysToJoin: scores[i].averageDaysToJoin,
      },
      trend: "stable",
      previousRank: null,
      badges: assignBadges(scores[i], dimScores),
    };
  });

  // 3. Sort by overall score descending, assign ranks
  entries.sort((a, b) => b.scores.overall - a.scores.overall);
  entries.forEach((entry, i) => { entry.rank = i + 1; });

  return entries;
}
```

### 6.5 Badge Assignment

```typescript
function assignBadges(
  metrics: RecruiterProductivityScore,
  scores: { velocity: number; quality: number; closure: number; revenue: number },
): string[] {
  const badges: string[] = [];

  if (scores.overall >= 85) badges.push("top-performer");
  if (scores.revenue >= 80) badges.push("revenue-leader");
  if (scores.quality >= 80) badges.push("quality-champion");
  if (scores.closure >= 70 && scores.closure < 85) badges.push("closing-expert");
  if (scores.velocity >= 80) badges.push("speed-demon");
  if (metrics.totalJoins >= 5 && scores.overall < 60) badges.push("rising-star");

  return badges;
}
```

---

## 7. Owner Dashboard Metrics

### 7.1 OwnerDashboard Type

```typescript
export interface OwnerDashboardMetrics {
  // Scope
  ownerId: string;                                // Recruiter ID
  ownerName: string;
  ownerRole: string;
  period: { from: string; to: string };

  // Personal metrics
  personal: RecruiterProductivityScore;

  // Rank among peers
  rank: {
    overall: number;
    totalRecruiters: number;
    percentile: number;                           // 0-100
    previousRank?: number | null;
    trend: "up" | "down" | "stable";
  };

  // Personal leaderboard position
  leaderboardEntry: LeaderboardEntry;

  // Pipeline health
  pipeline: {
    totalActive: number;
    byStage: { stage: string; count: number; value: number }[];
    aging: { stale: number; warning: number; healthy: number };
    expectedRevenue: number;
    topProspect: {
      applicationId: string;
      candidateName: string;
      jobTitle: string;
      probability: number;
      expectedValue: number;
    } | null;
  };

  // Client health (clients this recruiter works with)
  clients: {
    totalClients: number;
    activeClients: number;
    topClients: { clientId: string; name: string; revenue: number }[];
    atRiskClients: { clientId: string; name: string; reason: string }[];
  };

  // Source effectiveness (for this recruiter)
  sources: SourceEffectiveness[];

  // Revenue summary
  revenue: {
    realizedThisPeriod: number;
    pipelineExpected: number;
    projectedQuarterly: number;
    yoyGrowth: number | null;                     // Year-over-year revenue growth
  };

  // Recent activity
  recentActivity: {
    type: string;
    summary: string;
    timestamp: string;
    entityId: string;
  }[];
}
```

### 7.2 Computation Engine

```typescript
// lib/revenue/dashboard.ts

export async function getOwnerDashboard(
  ctx: TenantContext,
  userId: string,
  options?: { from?: Date; to?: Date },
): Promise<OwnerDashboardMetrics | null> {
  // 1. Compute personal productivity
  const personal = await computeRecruiterProductivity(ctx, userId, options);

  // 2. Compute leaderboard to get rank
  const leaderboard = await computeLeaderboard(ctx, options);
  const leaderboardEntry = leaderboard.find((e) => e.recruiterId === userId);
  if (!leaderboardEntry) return null;

  // 3. Compute placement probabilities for active applications
  const activeApps = await (tenantPrisma.application as any).withContext(ctx).findMany({
    where: {
      stage: { notIn: ["JOINED", "REJECTED", "ON_HOLD"] },
      job: { recruiterId: userId },
    },
    include: { candidate: { select: { name: true } }, job: { select: { title: true } } },
  });

  // 4. Compute pipeline health
  const pipeline = await computePipelineHealth(ctx, userId, activeApps);

  // 5. Compute client health for this recruiter's clients
  const clients = await computeRecruiterClientHealth(ctx, userId);

  // 6. Compute sources for this recruiter's candidates
  const sources = await computeSourceEffectiveness(ctx, {
    ...options,
    recruiterId: userId,
  } as any);

  // 7. Fetch recent memory activity
  const recentMemory = await getMemoryByUser(ctx, userId, { limit: 10 });

  return {
    ownerId: userId,
    ownerName: personal.recruiterName,
    ownerRole: "RECRUITER",
    period: {
      from: (options?.from ?? new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)).toISOString().split("T")[0],
      to: (options?.to ?? new Date()).toISOString().split("T")[0],
    },
    personal,
    rank: {
      overall: leaderboardEntry.rank,
      totalRecruiters: leaderboard.length,
      percentile: Math.round((1 - leaderboardEntry.rank / leaderboard.length) * 100),
      previousRank: leaderboardEntry.previousRank,
      trend: leaderboardEntry.trend,
    },
    leaderboardEntry,
    pipeline,
    clients,
    sources,
    revenue: {
      realizedThisPeriod: personal.estimatedRevenue,
      pipelineExpected: pipeline.expectedRevenue,
      projectedQuarterly: personal.projectedQuarterlyRevenue,
      yoyGrowth: null, // Requires prior period data
    },
    recentActivity: recentMemory.entries.slice(0, 10).map((e) => ({
      type: e.action,
      summary: e.metadata.summary ?? e.action,
      timestamp: e.createdAt.toISOString(),
      entityId: e.entityId,
    })),
  };
}
```

---

## 8. Query-Time Revenue Calculations Using Existing Fields

### 8.1 Calculation Inventory

Every revenue calculation is derived entirely from existing fields. No new data collection.

| Calculation | Formula | Existing Fields Used |
|------------|---------|---------------------|
| Fee per placement | `feeAmount ?? (offeredCtc * feePercent / 100)` | `Offer.feeAmount`, `Offer.feePercent`, `Offer.offeredCtc` |
| Total realized revenue | `SUM(fee of JOINED applications)` | `Application.stage`, `Offer.*` |
| Pipeline weighted revenue | `SUM(fee * stageProbability)` | `Application.stage`, `Offer.*`, `STAGE_CONVERSION_PROBABILITIES` |
| Revenue by recruiter | `SUM(fee) WHERE job.recruiterId = X` | `Job.recruiterId`, `Application.*`, `Offer.*` |
| Revenue by client | `SUM(fee) WHERE job.clientId = X` | `Job.clientId`, `Application.*`, `Offer.*` |
| Revenue by month | `SUM(fee) GROUP BY MONTH(Offer.createdAt)` | `Offer.createdAt`, `Offer.*` |
| Average fee per placement | `totalRevenue / totalJoins` | (computed) |
| Projected quarterly revenue | `SUM(fee) * 3 WHERE month in last 3 months` | `Offer.createdAt`, `Application.stage` |
| Source conversion rate | `(joined / totalApplications) * 100` | `Candidate.source`, `Application.*` |
| Average days to fill | `AVG(JOINED.createdAt - Job.createdAt)` | `Application.createdAt`, `Application.updatedAt`, `Job.createdAt` |
| Stage conversion probability | `(count at stage N+1) / (count at stage N)` | `Application.stage` across all applications |

### 8.2 Fee Estimation Strategy

```typescript
// lib/revenue/fees.ts

export type FeeCalculationMethod = "explicit" | "percentage" | "estimated";

export interface FeeDetail {
  method: FeeCalculationMethod;
  amount: number;
  percentUsed: number;
  source: string;  // "offer.feeAmount" | "offer.feePercent" | "defaultPercent"
}

export function calculateFeeDetail(
  offer: { feeAmount?: number | null; feePercent?: number | null; offeredCtc: number },
  defaultPercent: number = DEFAULT_FEE_PERCENT,
): FeeDetail {
  // Priority 1: Explicit fee amount
  if (offer.feeAmount != null && offer.feeAmount > 0) {
    return {
      method: "explicit",
      amount: offer.feeAmount,
      percentUsed: Math.round((offer.feeAmount / offer.offeredCtc) * 10000) / 100,
      source: "offer.feeAmount",
    };
  }

  // Priority 2: Percentage of offered CTC
  if (offer.feePercent != null && offer.feePercent > 0) {
    return {
      method: "percentage",
      amount: Math.round(offer.offeredCtc * (offer.feePercent / 100)),
      percentUsed: offer.feePercent,
      source: "offer.feePercent",
    };
  }

  // Priority 3: Default percentage
  return {
    method: "estimated",
    amount: Math.round(offer.offeredCtc * (defaultPercent / 100)),
    percentUsed: defaultPercent,
    source: "defaultPercent",
  };
}
```

### 8.3 Organization-Level Default Fee Rate

```typescript
// Configurable via Organization.securityPolicy JSON or env var
export function getDefaultFeePercent(ctx: TenantContext): number {
  // Could be stored in Organization.securityPolicy or a .env override
  if (process.env.DEFAULT_FEE_PERCENT) {
    return parseFloat(process.env.DEFAULT_FEE_PERCENT);
  }
  return DEFAULT_FEE_PERCENT; // 8.33%
}
```

---

## 9. Institutional Memory Capture for Revenue/Productivity Events

### 9.1 Capture Points

| Event | `action` | `entityType` | Tags | `memoryType` |
|-------|----------|-------------|------|-------------|
| Revenue calculation viewed | `summary_updated` | `organization` | `["revenue", "report-viewed"]` | `decision` |
| Fee configured on offer | `offer_extended` | `offer` | `["revenue", "fee", "offer-config"]` | `outcome` |
| Placement completed | `candidate_joined` | `application` | `["revenue", "placement", "success"]` | `outcome` |
| Leaderboard viewed | `summary_updated` | `user` | `["revenue", "leaderboard-viewed"]` | `decision` |
| Source report viewed | `summary_updated` | `organization` | `["revenue", "source-report-viewed"]` | `decision` |
| Client profitability viewed | `summary_updated` | `client` | `["revenue", "client-report-viewed"]` | `decision` |
| Revenue opportunity analyzed | `action_completed` | `organization` | `["revenue", "opportunity-analysis"]` | `decision` |

### 9.2 Capture Implementation

```typescript
// lib/revenue/memory.ts

export async function captureRevenueMemory(
  ctx: TenantContext,
  params: {
    userId: string | null;
    entityType: "organization" | "user" | "client" | "offer" | "application";
    entityId: string;
    action: string;
    summary: string;
    details?: string | null;
    tags?: string[];
    importance?: "low" | "medium" | "high";
    newValue?: Record<string, any>;
  },
) {
  // Fire-and-forget — never blocks the response
  captureMemoryWithContext(ctx, {
    userId: params.userId,
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action as any,
    metadata: {
      memoryType: "recruiter",
      summary: params.summary,
      details: params.details ?? null,
      sourceModel: params.entityType,
      sourceId: params.entityId,
      tags: ["revenue", ...(params.tags ?? [])],
      confidence: "auto",
      importance: params.importance ?? "low",
      channel: "screening",
      direction: "internal",
      newValue: params.newValue ?? undefined,
    },
  });
}
```

---

## 10. Tenant-Safe APIs

### 10.1 API Overview

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/revenue/productivity` | GET | ADMIN | All recruiters' productivity scores |
| `/api/revenue/productivity/:userId` | GET | ADMIN, RECRUITER | Single recruiter's productivity |
| `/api/revenue/sources` | GET | ADMIN | Source effectiveness analysis |
| `/api/revenue/opportunity` | GET | ADMIN | Revenue opportunity estimation |
| `/api/revenue/clients` | GET | ADMIN | Client profitability signals |
| `/api/revenue/placement/:applicationId` | GET | ADMIN, RECRUITER | Placement probability signal |
| `/api/revenue/leaderboard` | GET | ADMIN | Recruiter leaderboard |
| `/api/revenue/dashboard` | GET | ADMIN, RECRUITER | Owner dashboard (self or admin view) |

### 10.2 Route Patterns

Every route follows the established pattern from Weeks 5-8:

```typescript
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/guards";
import { resolveTenantContext } from "@/lib/tenant/context";
import { revenueIntelligenceEnabled } from "@/lib/revenue/flag";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!revenueIntelligenceEnabled)
    return NextResponse.json({ enabled: false }, { status: 404 });

  const user = await requireRole(["ADMIN", "RECRUITER"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await resolveTenantContext();
  if (!ctx) return NextResponse.json({ error: "No tenant context" }, { status: 403 });

  // ... route-specific computation
}
```

### 10.3 Route Details

#### GET /api/revenue/productivity

Query params: `recruiterId` (optional), `from`, `to`

```typescript
// If recruiterId provided: return single RecruiterProductivityScore (accessible by the recruiter or any admin)
// If no recruiterId: return all (admin only), sorted by joins desc
// Date filtering: from=2026-01-01&to=2026-06-18
```

#### GET /api/revenue/sources

Query params: `from`, `to`

```typescript
// Returns SourceEffectiveness[] sorted by totalCandidates desc
// Admin only
```

#### GET /api/revenue/opportunity

Query params: `from`, `to`

```typescript
// Returns RevenueOpportunity with realized, pipeline, at-risk, and client breakdown
// Admin only
```

#### GET /api/revenue/clients

Query params: `clientId` (optional), `from`, `to`

```typescript
// If clientId provided: return single ClientProfitabilitySignal
// If no clientId: return all sorted by totalEstimatedRevenue desc
// Admin only
```

#### GET /api/revenue/placement/:applicationId

No additional query params.

```typescript
// Returns PlacementProbabilitySignal for a single application
// Accessible by the application's recruiter or any admin
```

#### GET /api/revenue/leaderboard

Query params: `from`, `to`

```typescript
// Returns LeaderboardEntry[] sorted by overall score desc
// Admin only (recruiters see their own position via /dashboard)
```

#### GET /api/revenue/dashboard

Query params: `userId` (optional, admin only), `from`, `to`

```typescript
// If userId provided (admin only): return OwnerDashboardMetrics for that user
// If no userId: return for the authenticated user
// Accessible by any recruiter (self) or admin (any)
```

### 10.4 Middleware

Add to middleware matcher:

```typescript
// middleware.ts — add to matcher array
"/api/revenue/:path*",
```

### 10.5 Error Responses

| HTTP | Condition |
|------|-----------|
| 404 | Feature disabled (SUBMISSION_INTELLIGENCE_ENABLED=false) |
| 401 | Not authenticated |
| 403 | Not authorized (wrong role for endpoint) |
| 400 | Missing required params |

---

## 11. Tests (70+ test cases)

### 11.1 Test Structure

```
tests/week9-revenue-intelligence.test.ts

Group 1: Fee Estimation (8 tests)
  - estimateFeeAmount uses explicit feeAmount when available
  - estimateFeeAmount computes from feePercent when feeAmount is null
  - estimateFeeAmount falls back to default percent when neither is set
  - estimateFeeAmount returns 0 for zero CTC
  - computeTotalFee sums across joined applications only
  - computeTotalFee excludes rejected offers
  - calculateFeeDetail returns correct method and source
  - getDefaultFeePercent returns env override when set

Group 2: Recruiter Productivity (10 tests)
  - computeRecruiterProductivity returns all required fields
  - computeAllRecruiterProductivity returns array sorted by joins desc
  - Productivity metrics correctly count applications by stage
  - Pipeline velocity includes stage change count from memory
  - Screening accuracy includes match score average
  - Submission quality includes submission-to-offer rate
  - Closure rate includes offer accept rate
  - Revenue includes fee estimates
  - Date filtering affects results correctly
  - Recruiter with no data returns zeros, not errors

Group 3: Source Effectiveness (8 tests)
  - computeSourceEffectiveness returns per-source breakdown
  - Source conversion rates are computed correctly
  - REFERRAL source shows "high" ROI with good join rate
  - LINKEDIN source shows "medium" ROI
  - Empty source data returns empty array
  - Date filtering affects source metrics
  - Source stats include revenue estimates
  - Source label mapping is correct

Group 4: Revenue Opportunity (10 tests)
  - computeRevenueOpportunity returns realized revenue
  - Pipeline revenue uses stage conversion probabilities
  - Weighted total is less than total for early stages
  - Expected value is reasonable for mixed-stage pipeline
  - At-risk revenue identifies stale offers
  - Client revenue breakdown matches expectations
  - Revenue by month is chronological
  - Empty pipeline returns zero values
  - Only non-rejected applications contribute to pipeline
  - atRiskRevenue correctly flags offers > 14 days old

Group 5: Client Profitability (8 tests)
  - computeClientProfitability returns per-client metrics
  - Revenue calculations match fee estimates
  - Engagement health classification is correct
  - Churn risk classification is correct
  - Date filtering affects client metrics
  - Single client query returns one result
  - Client with no activity returns zeros
  - Revenue trend is computed

Group 6: Placement Probability (8 tests)
  - computePlacementProbability returns valid signal
  - Base probability matches stage conversion table
  - Skill fit modifier adjusts probability correctly
  - Counter-offer risk modifier reduces probability
  - Multiple modifiers stack correctly
  - Probability is clamped between 0.01 and 0.99
  - Expected value is probability * fee
  - Next recommended action is stage-appropriate

Group 7: Recruiter Leaderboard (8 tests)
  - computeLeaderboard returns ranked entries
  - All dimension scores are between 0 and 100
  - Overall score is weighted composite
  - Top recruiter has rank 1
  - Badges are assigned correctly
  - Trend defaults to "stable"
  - Empty data returns empty array
  - Revenue score scales correctly

Group 8: Owner Dashboard (6 tests)
  - getOwnerDashboard returns all required sections
  - Personal metrics match productivity computation
  - Rank is consistent with leaderboard
  - Pipeline health is computed from active applications
  - Recent activity comes from memory
  - Revenue summary matches opportunity computation

Group 9: Memory Capture (4 tests)
  - captureRevenueMemory stores entries with revenue tag
  - View events are captured correctly
  - Placement events have "success" tag
  - Memory capture is fire-and-forget (does not throw)
```

### 11.2 Test Implementation Pattern

```typescript
import assert from "node:assert/strict";
import { estimateFeeAmount, computeTotalFee, calculateFeeDetail } from "../lib/revenue/fees";
// ... other imports

const DEFAULT_PCT = 8.33;
const OFFER_WITH_FEE_AMOUNT = { offeredCtc: 3000000, feePercent: null, feeAmount: 250000 };
const OFFER_WITH_PERCENT = { offeredCtc: 3000000, feePercent: 10, feeAmount: null };
const OFFER_WITH_NEITHER = { offeredCtc: 3000000, feePercent: null, feeAmount: null };

// Group 1
assert.equal(estimateFeeAmount(OFFER_WITH_FEE_AMOUNT), 250000);
assert.equal(estimateFeeAmount(OFFER_WITH_PERCENT), 300000);
assert.equal(estimateFeeAmount(OFFER_WITH_NEITHER), Math.round(3000000 * 0.0833));
assert.equal(estimateFeeAmount(OFFER_WITH_NEITHER, 10), 300000);

// ... ~70+ total assertions

console.log("Week 9 revenue intelligence tests passed");
```

---

## 12. Rollback Plan

### 12.1 Reversibility

All Week 9 changes are additive and fully reversible:

| Change | Reversal |
|--------|----------|
| New `lib/revenue/` directory | Delete directory |
| New `/api/revenue/` routes | Delete directory |
| New test file `week9-revenue-intelligence.test.ts` | Delete file |
| `middleware.ts` matcher addition | Remove `/api/revenue/:path*` from matcher |
| `.env` feature flag | Remove `REVENUE_INTELLIGENCE_ENABLED` from env |

### 12.2 No-Schema-Change Guarantee

Week 9 introduces **zero** schema changes:
- No new Prisma models
- No new columns
- No new migrations
- No new indexes
- All computation from existing fields at query time

### 12.3 Safe Rollback Sequence

```bash
# Step 1: Disable feature flag
# Set REVENUE_INTELLIGENCE_ENABLED=false in .env

# Step 2: Verify no impact to existing endpoints
# All existing analytics, reports, screening, submission, memory APIs continue working
# No compilation errors (feature flag gates all new code)

# Step 3: Remove code (optional)
git checkout -- lib/revenue/
git checkout -- app/api/revenue/
git checkout -- tests/week9-revenue-intelligence.test.ts
# Manually revert middleware.ts matcher addition

# Step 4: Verify build
npm run build
```

### 12.4 Rollback Success Criteria

- [ ] `npm run build` passes
- [ ] `/api/analytics` works (no dependency on revenue module)
- [ ] `/api/reports` works
- [ ] `/api/screening/workbench` works
- [ ] `/api/submission/package` works
- [ ] `/api/memory/*` works
- [ ] All existing pipeline stage changes work
- [ ] No dangling imports pointing to deleted modules

---

## 13. Acceptance Criteria (62 total)

### 13.1 Fee Estimation (AC-1 to AC-6)

- [ ] AC-1: Fee estimate uses explicit `Offer.feeAmount` when present
- [ ] AC-2: Fee estimate computes from `Offer.feePercent` when `feeAmount` is null
- [ ] AC-3: Fee estimate falls back to default percent when neither is set
- [ ] AC-4: `calculateFeeDetail` returns the calculation method used
- [ ] AC-5: Default fee percent is configurable per organization (env var)
- [ ] AC-6: Zero or null CTC returns a fee of 0

### 13.2 Recruiter Productivity (AC-7 to AC-15)

- [ ] AC-7: GET `/api/revenue/productivity` returns per-recruiter scores
- [ ] AC-8: Productivity includes all 5 dimensions (velocity, accuracy, quality, closure, revenue)
- [ ] AC-9: Applications processed counts only NEW-stage-changed applications
- [ ] AC-10: Interview pass rate is (PROCEED outcomes / total completed interviews)
- [ ] AC-11: Submission-to-offer rate is (offers / submissions) * 100
- [ ] AC-12: Offer accept rate is (accepted / extended) * 100
- [ ] AC-13: Total estimated revenue sums fee estimates for joined candidates
- [ ] AC-14: Date filtering (from, to) correctly limits the computation window
- [ ] AC-15: A recruiter with no data returns zeros, not errors

### 13.3 Source Effectiveness (AC-16 to AC-23)

- [ ] AC-16: GET `/api/revenue/sources` returns per-source breakdown
- [ ] AC-17: Each source shows total candidates, applications, screened, submitted, interviewed, offered, joined
- [ ] AC-18: Conversion rates (application-to-screen, screen-to-submit, etc.) are computed
- [ ] AC-19: Average match score per source is shown
- [ ] AC-20: Estimated ROI is classified as high/medium/low
- [ ] AC-21: All 6 source enum values are represented if data exists
- [ ] AC-22: Sources are sorted by total candidates descending
- [ ] AC-23: Empty data returns empty array, not an error

### 13.4 Revenue Opportunity (AC-24 to AC-33)

- [ ] AC-24: GET `/api/revenue/opportunity` returns realized revenue section
- [ ] AC-25: Pipeline revenue uses stage-based probability weights
- [ ] AC-26: Weighted pipeline total is lower than raw pipeline total
- [ ] AC-27: At-risk revenue identifies offers extended > 14 days without status change
- [ ] AC-28: Client revenue shows per-client realized and projected amounts
- [ ] AC-29: Monthly revenue trend is chronological with correct amounts
- [ ] AC-30: Revenue by recruiter is included
- [ ] AC-31: Expected/Optimistic/Pessimistic values are properly bounded
- [ ] AC-32: Offers with ACCEPTED status contribute to at-risk if joining date > 30 days away
- [ ] AC-33: Only non-rejected, non-withdrawn offers count in pipeline

### 13.5 Client Profitability (AC-34 to AC-41)

- [ ] AC-34: GET `/api/revenue/clients` returns per-client profitability signals
- [ ] AC-35: Revenue per client sums fees for all joined candidates at that client
- [ ] AC-36: Efficiency metrics (apps/fill, interviews/fill) are computed
- [ ] AC-37: Engagement health is "high" when activeJobs >= 3, "medium" when >= 1, "low" otherwise
- [ ] AC-38: Churn risk is "high" when last submission > 90 days ago
- [ ] AC-39: Clients are sortable by revenue descending
- [ ] AC-40: Single client query (clientId param) returns one result
- [ ] AC-41: Client with no jobs/applications returns zero metrics

### 13.6 Placement Probability (AC-42 to AC-50)

- [ ] AC-42: GET `/api/revenue/placement/:applicationId` returns probability signal
- [ ] AC-43: Base probability matches the stage conversion table
- [ ] AC-44: At least 3 signal modifiers are evaluated per application
- [ ] AC-45: Adjusted probability is clamped between 0.01 and 0.99
- [ ] AC-46: Expected value = adjustedProbability * estimatedFee
- [ ] AC-47: Positive drivers list modifiers that increased probability
- [ ] AC-48: Concerns list modifiers that decreased probability
- [ ] AC-49: Next recommended action is appropriate for the current stage
- [ ] AC-50: Unknown applicationId returns null (404)

### 13.7 Recruiter Leaderboard (AC-51 to AC-56)

- [ ] AC-51: GET `/api/revenue/leaderboard` returns ranked recruiter entries
- [ ] AC-52: Each entry has 4 dimension scores (velocity, quality, closure, revenue) plus overall
- [ ] AC-53: Overall score is a weighted composite (velocity 15%, quality 25%, closure 30%, revenue 30%)
- [ ] AC-54: Badges are assigned based on score thresholds
- [ ] AC-55: Raw metrics (apps, subs, interviews, offers, joins, revenue) are included
- [ ] AC-56: Rank starts at 1 and has no gaps

### 13.8 Owner Dashboard (AC-57 to AC-62)

- [ ] AC-57: GET `/api/revenue/dashboard` returns all 8 sections for the authenticated recruiter
- [ ] AC-58: Personal section matches standalone productivity computation
- [ ] AC-59: Rank section includes overall, totalRecruiters, percentile, and trend
- [ ] AC-60: Pipeline section includes total active, by-stage breakdown, aging info, expected revenue
- [ ] AC-61: Client section includes total clients, active clients, top clients, at-risk clients
- [ ] AC-62: Recent activity shows last 10 memory entries with type, summary, timestamp

---

## Appendix A: File Manifest

| File | Lines (est.) | Purpose |
|------|-------------|---------|
| `lib/revenue/flag.ts` | 2 | Feature flag |
| `lib/revenue/types.ts` | 250 | All types: RecruiterProductivityScore, SourceEffectiveness, RevenueOpportunity, ClientProfitabilitySignal, PlacementProbabilitySignal, LeaderboardEntry, OwnerDashboardMetrics |
| `lib/revenue/fees.ts` | 80 | estimateFeeAmount(), computeTotalFee(), calculateFeeDetail(), getDefaultFeePercent() |
| `lib/revenue/productivity.ts` | 180 | computeRecruiterProductivity(), computeAllRecruiterProductivity() |
| `lib/revenue/sources.ts` | 140 | computeSourceEffectiveness(), classifyROI() |
| `lib/revenue/opportunity.ts` | 160 | computeRevenueOpportunity(), computePipelineRevenue(), computeAtRiskRevenue() |
| `lib/revenue/clients.ts` | 120 | computeClientProfitability(), classifyEngagementHealth(), classifyChurnRisk() |
| `lib/revenue/placement.ts` | 140 | computePlacementProbability(), SIGNAL_MODIFIERS array |
| `lib/revenue/leaderboard.ts` | 120 | computeLeaderboard(), scoring functions, assignBadges() |
| `lib/revenue/dashboard.ts` | 130 | getOwnerDashboard(), computePipelineHealth() |
| `lib/revenue/memory.ts` | 40 | captureRevenueMemory() |
| `app/api/revenue/productivity/route.ts` | 50 | GET productivity |
| `app/api/revenue/sources/route.ts` | 35 | GET sources |
| `app/api/revenue/opportunity/route.ts` | 35 | GET opportunity |
| `app/api/revenue/clients/route.ts` | 40 | GET clients |
| `app/api/revenue/placement/[applicationId]/route.ts` | 40 | GET placement probability |
| `app/api/revenue/leaderboard/route.ts` | 35 | GET leaderboard |
| `app/api/revenue/dashboard/route.ts` | 45 | GET dashboard |
| `tests/week9-revenue-intelligence.test.ts` | 400 | 70+ test cases across 9 groups |
| `middleware.ts` | +1 line | Add `/api/revenue/:path*` to matcher |

**Total estimated: ~2,200 lines added, 0 lines modified in existing files (except middleware.ts)**

---

## Appendix B: Integration Points

### B.1 Week 7 Screening Intelligence

| Week 7 Source | Used By Week 9 |
|---------------|----------------|
| `ScreeningFacts` | Placement probability signal modifiers (skillFit, voiceScreening, ctcFit, noticePeriod, interviewOutcomes, pipelineHistory, recruiterNotesSummary) |
| `RiskSignal` | Counter-offer risk modifier in placement probability |
| `ReadinessScore` | Correlation analysis between readiness and placement probability |
| `getScreeningWorkbench()` | Primary data source for `computePlacementProbability()` |

### B.2 Week 8 Submission Intelligence

| Week 8 Source | Used By Week 9 |
|---------------|----------------|
| `SubmissionPackage` | Revenue opportunity uses submission status for pipeline value estimates |
| `SubmissionStatus` | Differentiates submitted vs unsubmitted in pipeline calculations |
| `TrackerRow` | Revenue data is a superset of tracker fields for financial reporting |

### B.3 Week 5 Institutional Memory

| Week 5 Source | Used By Week 9 |
|---------------|----------------|
| `captureMemoryWithContext()` | All revenue event capture |
| `getMemoryByUser()` | Recruiter activity for dashboard, stage change count for velocity |
| `getMemory()` | Stage change history for pipeline velocity computation |

### B.4 Week 4 Tenant Enforcement

| Week 4 Source | Used By Week 9 |
|---------------|----------------|
| `tenantPrisma.model.withContext(ctx)` | All database access in revenue endpoints |
| `TenantContext` | Passed through all revenue service functions |
| `resolveTenantContext()` | Called at start of every revenue API route |
| `prisma.user.findMany()` | Recruiter list (cross-tenant; used for org membership query) |

### B.5 Existing Analytics & Reports

| Existing Source | Used By Week 9 |
|-----------------|---------------|
| `/api/analytics` recruiterStats | Baseline for recruiter productivity (Week 9 extends with revenue) |
| `/api/analytics` conversion rates | Baseline for pipeline probability estimates |
| `/api/analytics` sourceStats | Baseline for source effectiveness (Week 9 adds revenue and ROI) |
| `/api/analytics` trend | Baseline for revenue trend computation |
| `/api/reports` client-wise | Baseline for client profitability (Week 9 adds revenue) |
| `/api/reports` recruiter-performance | Baseline for leaderboard (Week 9 adds scoring) |

### B.6 Prisma Models Used

| Model | Fields Used |
|-------|-------------|
| `User` | id, name, email, role, organizationMemberships |
| `Candidate` | id, source, ownerId, createdAt |
| `Application` | id, candidateId, jobId, stage, matchScore, submittedAt, createdAt, updatedAt |
| `Interview` | id, applicationId, outcome, rating, createdAt |
| `Offer` | id, applicationId, candidateId, offeredCtc, feePercent, feeAmount, paymentStatus, status, createdAt |
| `Job` | id, title, clientId, recruiterId, salaryMin, salaryMax, status, openings, createdAt |
| `Client` | id, name, industry, isActive, createdAt |
| `ActivityLog` | entityType, entityId, action, userId, metadata, createdAt |

---

## Appendix C: Error Handling Strategy

All revenue service functions follow the **never throw, always return** pattern:

```typescript
// Functions return null or empty arrays instead of throwing
const productivity = await computeRecruiterProductivity(ctx, userId);
if (!productivity) {
  return NextResponse.json({
    recruiterId: userId,
    error: "No data available for this recruiter in the selected period",
    metrics: defaultEmptyMetrics(),
  });
}
```

Pipeline value computations gracefully handle missing offers:
```typescript
function estimateFeeForApplication(app: any): number {
  const offer = app.offers?.[0];
  if (!offer) {
    // No offer yet — estimate based on job budget
    const budgetMid = ((app.job?.salaryMin ?? 0) + (app.job?.salaryMax ?? 0)) / 2;
    if (budgetMid <= 0) return 0;
    return estimateFeeAmount({ offeredCtc: budgetMid });
  }
  return estimateFeeAmount(offer);
}
```

## Appendix D: Dependencies

Week 9 depends on these existing modules (all already implemented):

- `lib/tenant/context.ts` — Week 4
- `lib/tenant/prisma.ts` — Week 4
- `lib/memory/service.ts` (captureMemoryWithContext, getMemory, getMemoryByUser) — Week 5
- `lib/memory/types.ts` — Week 5
- `lib/screening/service.ts` (getScreeningWorkbench) — Week 7
- `lib/screening/types.ts` (ScreeningFacts, RiskSignal, ScreeningWorkbench) — Week 7
- `lib/guards.ts` — Pre-existing
- `lib/format.ts` — Pre-existing (formatCurrency for display)
- `prisma` / `tenantPrisma` — Pre-existing

**No changes required to any existing modules.**
