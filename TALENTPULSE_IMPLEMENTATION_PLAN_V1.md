# TalentPulse Implementation Plan V1

This document converts the TalentPulse architecture and schema planning work into a practical production implementation roadmap for the current Next.js and Prisma application.

Reviewed planning inputs:

- `TALENTPULSE_ARCHITECTURE_V1.md`
- `TALENTPULSE_ARCHITECTURE_V1_1.md`
- `TALENTPULSE_ARCHITECTURE_V1_2.md`
- `TALENTPULSE_SCHEMA_PLAN_V1.md`

Reviewed current application areas:

- Prisma schema
- NextAuth authentication and role guards
- Candidate, job, application, interview, offer, prospect, Naukri, voice, WhatsApp, analytics, reports, copilot, and integration routes
- Admin, recruiter, client portal, and candidate portal surfaces

No code, Prisma schema, migrations, or UI changes are made by this plan.

## 1. Current State Assessment

### Platform Summary

The current TalentPulse application is a functional recruitment MVP built on:

- Next.js App Router
- Prisma with PostgreSQL
- NextAuth credentials authentication
- Role-based portals for admin, recruiter, client, and candidate users
- Prisma-backed operational entities for candidates, clients, jobs, applications, interviews, offers, prospects, Naukri imports, recruiting platforms, WhatsApp, voice screening, email campaigns, templates, reports, and analytics
- AI-assisted screening, copilot, JD parsing, resume parsing, Naukri parsing, and heuristic match scoring

This is a valuable foundation. It already contains many business workflows that should be preserved and evolved rather than replaced. The main gap is that the current application is still mostly single-tenant and workflow-specific, while the target architecture requires a secure, configurable, multi-tenant Talent Intelligence Operating System.

### What Already Exists

Candidate management:

- Candidate profile creation, listing, search, notes, projects, resume fields, profile details, owner assignment, and application mapping exist.
- Candidate data includes phone numbers, compensation, notice period, skills, preferred locations, resume links, source, LinkedIn URL, AI summary, and AI screening data.
- Candidate portal/profile surfaces exist.

Requisitions/jobs:

- Job creation and listing exist.
- Jobs include client, location, job type, experience range, skills, salary range, openings, priority, status, recruiter assignment, source preferences, and parsed JD data.
- Admin, recruiter, and client job views exist.

Pipeline:

- `Application` already represents candidate-job mapping.
- Fixed pipeline stages exist from `NEW` through `JOINED`, `REJECTED`, and `ON_HOLD`.
- Pipeline boards, application lists, stage movement, AI screening, interviews, and offers exist.

Copilot and AI:

- Copilot route exists using OpenRouter/OpenAI-compatible API settings.
- AI screening route exists and combines heuristic scoring with model-generated screening reports.
- Resume parsing, JD parsing, Naukri parsing, search import, and matching routes exist.
- Current model calls are useful but not governed by agent records, budgets, model usage logs, approval records, or recommendation feedback.

Analytics and reports:

- Analytics route computes operational metrics from current tables.
- Reports route supports summary, client-wise, recruiter performance, and pipeline aging reports.
- Admin analytics and report pages exist.

Voice and WhatsApp:

- Voice screening models and routes exist with Twilio and ElevenLabs integration paths.
- WhatsApp templates and messages exist.
- WhatsApp send route records outbound messages but currently leaves actual provider delivery as a TODO.

Auth and roles:

- NextAuth credentials login exists.
- User role enum supports `ADMIN`, `RECRUITER`, `CLIENT`, and `CANDIDATE`.
- Basic route guards exist.

Admin dashboard:

- Admin portal exists with clients, jobs, candidates, pipeline, interviews, analytics, reports, templates, platforms, settings, WhatsApp, voice screening, and team surfaces.
- This is an operational admin, not yet a platform super-admin or tenant administration layer.

### What Can Be Reused

Reusable product surfaces:

- Admin and recruiter shells
- Candidate, job, application, interview, offer, prospect, and pipeline UI patterns
- Client and candidate portals
- Current analytics/reporting screens as first operational dashboards
- Voice and WhatsApp admin screens
- Naukri assistant and platform subscription screens
- Templates, outreach, and settings screens

Reusable backend patterns:

- Prisma service access through `lib/db`
- NextAuth session extraction through `lib/guards`
- Existing API route conventions
- Current activity logging pattern as the seed of the future activity/event layer
- AI screening heuristic as the first deterministic scoring baseline
- Existing provider configuration through integration settings, with refactoring
- Existing S3/upload helpers

Reusable data:

- Candidate, job, application, interview, offer, prospect, platform, voice, WhatsApp, email, and activity data should be migrated forward.
- Current `Application` should map to the future `pipeline` entity or be renamed only after migration safety is proven.
- Current `Client` should map to `company` with type `client`.

### What Should Be Refactored

Multi-tenancy:

- Add `organization_id` and `workspace_id` across tenant-owned tables.
- Replace global unique constraints such as candidate email and client name with tenant-scoped uniqueness.
- Add organization and workspace membership instead of one global user role.
- Enforce tenant scope in every repository/API query.

Configuration:

- Replace hard-coded pipeline stage enum with configurable stage definitions.
- Replace fixed role enum with tenant-configurable roles and permissions while preserving compatibility roles during migration.
- Replace global integration settings with organization/workspace connector instances.
- Expand candidate source support beyond the current enum into source attribution records.

Governance:

- Add first-class audit logs, decisions, approval requests, and event store.
- Add agent run, model usage, cost, recommendation, and feedback records.
- Add human approval gates before external messages, submissions, offer changes, bulk updates, and sensitive memory changes.

Intelligence:

- Convert `Note`, `ActivityLog`, `aiReport`, `aiSummary`, and voice/WhatsApp transcripts into structured memory candidates.
- Introduce Knowledge Vault for curated SOPs, playbooks, interview guides, and submission templates.
- Introduce risk signals, revenue forecasts, and Talent Graph edges incrementally.

Analytics:

- Move from live aggregate queries only to event-backed analytics snapshots and views.
- Preserve current report APIs as early reporting outputs, but back them with tenant-scoped analytics views over time.

Security:

- Add SSO readiness, MFA readiness, API keys, service accounts, retention policies, export controls, and break-glass super-admin audit.
- Reduce sensitive data in logs and provider payloads.

### What Should Be Retired Or Reworked

Retire as long-term foundations:

- Global single-company settings as the only company profile model.
- Global integration settings keyed only by provider.
- Global candidate email uniqueness.
- Static role enum as the only authorization system.
- Fixed pipeline stage enum as the only pipeline model.
- Activity log without organization, workspace, correlation, event version, or audit requirements.
- AI calls that do not record model usage, cost, prompt version, input context, output, and human feedback.

Rework rather than delete:

- `Application` should be evolved into the canonical candidate-job pipeline relationship.
- `Client` should be evolved into the broader `Company` model.
- `PlatformSubscription` should be evolved into the connector and source framework.
- `Note` should be evolved into activity, memory, and decision capture.
- Reports and analytics should be evolved into event-backed intelligence.

### Current State Summary

TalentPulse already has a strong recruitment workflow MVP with real operational surfaces for candidates, jobs, pipelines, AI screening, voice, WhatsApp, Naukri imports, reports, and role-specific portals. The product should not be rebuilt from scratch.

The implementation priority is to harden the foundation:

1. Add tenant, workspace, role, and permission architecture.
2. Make all APIs tenant-safe.
3. Preserve and migrate existing operational data.
4. Add event, audit, decision, approval, and memory foundations.
5. Convert current AI features into governed agents with cost controls and feedback loops.
6. Expand into revenue, risk, graph, analytics, APIs, and enterprise readiness after core operations are stable.

## 2. Phased Implementation Roadmap

## Phase 1: Foundation

Deliverables:

- Tenant model
- Organization model
- Role model
- Permission model
- Workspace model
- Organization and workspace memberships
- Tenant-safe repositories
- Tenant-safe APIs
- Tenant-aware seed and migration backfill strategy

Business outcome:

- Secure multi-tenant platform.

Implementation notes:

- Create a default organization and workspace for existing data.
- Preserve current role enum temporarily as a compatibility layer.
- Introduce repository helpers that require tenant context before any new feature work.
- Block new intelligence work until candidate, job, application, analytics, and reports are tenant-safe.

## Phase 2: Core Talent Operations

Deliverables:

- Candidate enhancements
- Company/client enhancements
- Contact enhancements
- Job/requirement enhancements
- Configurable pipeline stages
- Pipeline improvements
- Source attribution
- Candidate deduplication rules

Business outcome:

- Agency-ready operational platform.

Implementation notes:

- Map current `Client` to future `Company` type `client`.
- Add `Contact` for client stakeholders and hiring managers.
- Evolve `Application` into the canonical pipeline record.
- Add stage transition history with reason, actor, and evidence.

## Phase 3: Institutional Memory

Deliverables:

- Memory engine
- Decision engine
- Activity engine
- Audit framework
- Memory capture workflows
- Evidence-linked memories
- Memory correction and confirmation

Business outcome:

- Knowledge retention despite recruiter attrition.

Implementation notes:

- Use current notes, activities, AI summaries, screening reports, voice transcripts, WhatsApp messages, and email logs as memory sources.
- Require sensitive or consequential memories to be confirmable by humans.
- Every stage change and rejection should capture why.

## Phase 4: Knowledge Vault

Deliverables:

- SOPs
- Client playbooks
- Interview guides
- Submission templates
- Market intelligence assets
- Reusable organization knowledge
- Versioning, owner, approver, review date, and applicability scope

Business outcome:

- Standardized recruiter quality.

Implementation notes:

- Reuse current email/template screens as a starting point.
- Add governed knowledge asset types instead of treating templates as isolated records.
- Make Knowledge Vault retrievable by agents with permission and version awareness.

## Phase 5: Agent Platform

Deliverables:

- Agent framework
- Model abstraction
- OpenRouter integration
- Agent runs
- Recommendations
- Human feedback loops
- AI cost governance
- Model usage tracking
- Budget policies

Business outcome:

- AI-assisted recruiting.

Implementation notes:

- Wrap existing copilot, AI screening, JD parsing, resume parsing, and Naukri matching as agent runs.
- Record prompt version, provider, model, tokens, estimated cost, output, confidence, and feedback.
- Keep OpenRouter first because the app already has OpenRouter-compatible code.

## Phase 6: Screening Intelligence

Deliverables:

- Note capture
- WhatsApp note capture
- Transcript processing
- Structured screening extraction
- Recruiter copilot workflows
- Screening scorecards
- Voice screening memory extraction

Business outcome:

- Higher recruiter productivity.

Implementation notes:

- Build on current AI screening and voice screening features.
- Convert unstructured call/transcript/chat data into structured candidate facts, risks, decisions, and next steps.
- Require recruiter confirmation for compensation, availability, notice period, and risk facts.

## Phase 7: Match Intelligence

Deliverables:

- Candidate ranking
- Fit scoring
- Gap analysis
- Recommendation engine
- Evidence-backed match reasons
- Source-aware and revenue-aware ranking inputs

Business outcome:

- Better shortlist quality.

Implementation notes:

- Preserve existing heuristic score as the transparent baseline.
- Add model-generated recommendations only after agent runs and feedback tracking exist.
- Attach all scores to candidate-job pipeline records.

## Phase 8: Submission Intelligence

Deliverables:

- Submission drafts
- Client summaries
- Approval workflows
- Decision capture
- Duplicate checks
- Client-specific submission templates

Business outcome:

- Faster client submissions.

Implementation notes:

- Introduce submission as a first-class record if current pipeline stage `SUBMITTED` is insufficient.
- Require approval before external client submission.
- Generate client-ready summaries from candidate profile, screening, match reasons, and Knowledge Vault templates.

## Phase 9: Revenue Intelligence

Deliverables:

- Fee configuration
- Commercial terms
- Revenue forecasts
- Weighted revenue
- Expected margin
- Recruiter contribution
- Client profitability
- Placement revenue lifecycle

Business outcome:

- Owner-level visibility.

Implementation notes:

- Start with offer and joined placements because current `Offer` already has fee percent, fee amount, and payment status.
- Add forecasts earlier in the funnel once stage history and probability models are available.
- Tie revenue to candidate, submission, offer, placement, client, recruiter, and source.

## Phase 10: Risk Intelligence

Deliverables:

- Candidate risk
- Offer risk
- Joining risk
- Client risk
- Revenue risk
- Risk signals
- Risk assessments
- Mitigation task generation

Business outcome:

- Higher placement success.

Implementation notes:

- Start with no-show risk already produced by screening.
- Expand to compensation mismatch, notice period, joining delay, client feedback delay, payment risk, and guarantee risk.
- Risk must always include evidence and mitigation.

## Phase 11: Voice and WhatsApp

Deliverables:

- Conversation model
- Messaging model
- WhatsApp integration architecture
- Voice capture architecture
- Consent and opt-out tracking
- Human handoff
- Transcript and memory extraction

Business outcome:

- India-first communication workflows.

Implementation notes:

- Current VoiceScreening and WhatsAppMessage models are good starting points.
- Implement provider delivery logs, inbound webhooks, template approval state, consent, and conversation threading.
- Keep human approval for consequential outbound messaging.

## Phase 12: Talent Graph

Deliverables:

- Graph nodes
- Graph edges
- Referral intelligence
- Relationship intelligence
- Placement intelligence
- Source-to-outcome graph signals

Business outcome:

- Long-term competitive moat.

Implementation notes:

- Generate initial graph edges from existing candidates, applications, jobs, clients, interviews, offers, placements, notes, referrals, and source attribution.
- Do not build complex graph UI first. Build graph records and service queries.
- Use graph intelligence to power recommendations and recruiter relationship context.

## Phase 13: Analytics Platform

Deliverables:

- Analytics snapshots
- Event-backed dashboards
- Reports
- AI performance metrics
- Revenue analytics
- Recruiter analytics
- Client analytics
- Source ROI

Business outcome:

- Operating intelligence.

Implementation notes:

- Preserve current analytics and report pages.
- Move high-value metrics onto event-backed analytics views.
- Add snapshots for daily/weekly/monthly trends and performance.

## Phase 14: API Platform

Deliverables:

- API keys
- Webhooks
- Service accounts
- Rate limits
- Integration audit logs
- ATS, HRMS, CRM, ERP, email, WhatsApp, Naukri, foundit, LinkedIn import readiness

Business outcome:

- Ecosystem readiness.

Implementation notes:

- Keep public APIs minimal until internal APIs are tenant-safe and versioned.
- Start with webhooks for core events such as candidate created, submission approved, interview scheduled, offer accepted, placement created, revenue forecast updated, and risk signal created.

## Phase 15: Enterprise Readiness

Deliverables:

- SSO readiness
- SCIM readiness
- MFA readiness
- Retention policies
- Compliance controls
- Field-level permissions
- Export controls
- Break-glass super-admin workflow
- Security audit reporting

Business outcome:

- Enterprise adoption.

Implementation notes:

- Keep enterprise controls architecture-compatible from Phase 1.
- Implement advanced enterprise features once core multi-tenancy, audit, permissions, and API controls are proven.

## 3. Development Sequence

The following table gives the implementation sequence for each phase. It is a plan only and does not create migrations or code changes.

| Phase | Schema changes | Services | APIs | UI | Testing | Deployment steps | Rollback plan |
|---|---|---|---|---|---|---|---|
| 1 Foundation | Add organization, workspace, membership, role, permission, tenant columns, scoped uniqueness | Tenant context, permission resolver, tenant-safe repository helpers | Update core routes to require org/workspace context | Org/workspace selector, admin membership views only if needed | Tenant isolation tests, role tests, migration backfill tests | Deploy additive schema, backfill default org/workspace, then enforce guards | Keep compatibility role fields; rollback by disabling tenant enforcement feature flag |
| 2 Core Talent Operations | Add company/contact, source attribution, stage definitions, stage history, enhanced candidate/job fields | Candidate, company, contact, job, pipeline, dedupe, source services | Candidate/job/application routes become tenant-scoped and stage-configurable | Enhance existing candidate/job/pipeline screens | CRUD, dedupe, stage transition, source attribution tests | Add tables, backfill Client to Company, map current stages | Retain old Client/Application views until parity verified |
| 3 Institutional Memory | Add decision, activity v2, event store, audit log, memory, memory links/corrections | Activity/event publisher, memory extractor, decision capture, audit service | Memory, decisions, activity timeline APIs | Timeline, memory confirmation, why capture fields | Audit immutability, memory permissions, stage why tests | Ship event capture first, then memory extraction | Disable extraction jobs; keep raw events intact |
| 4 Knowledge Vault | Add knowledge assets, scopes, versions, usage | Knowledge retrieval, versioning, approval, search indexing | Knowledge CRUD, publish, usage APIs | Reuse template screens into vault sections | Permission, version, retrieval, expiry tests | Add vault behind admin feature flag | Hide vault; data remains isolated |
| 5 Agent Platform | Add agent definitions, runs, recommendations, feedback, model usage, agent cost, budget policy | Agent runner, model adapter, cost tracker, budget evaluator, feedback service | Agent run, copilot, screening, parse, feedback, budget APIs | Agent run history, feedback controls, budget admin | Provider mocking, budget limit, cost attribution, feedback tests | Wrap existing AI routes as agent runs | Feature flag new agent runner; fallback to existing direct AI routes |
| 6 Screening Intelligence | Add screening records or extend interviews/applications, transcript evidence links, screening facts | Screening extractor, transcript processor, WhatsApp note capture | Screening extraction, note capture, transcript APIs | Screening workspace, confirmation panel | Extraction quality, PII, confirmation tests | Start with read-only extraction from existing data | Disable extraction; preserve original notes/transcripts |
| 7 Match Intelligence | Add match scores, gap records, recommendation links if not covered by agent recommendation | Match service, ranking service, gap analyzer | Match/ranking APIs | Ranked shortlist and gap views | Deterministic score tests, ranking explainability tests | Release to recruiter-only pilot | Revert to heuristic scoring and manual sorting |
| 8 Submission Intelligence | Add submission, submission version, approval request/decision if not already added | Submission draft, duplicate check, approval workflow, client summary generator | Submission draft/create/approve/send APIs | Submission review and approval queue | Approval, duplicate, client visibility tests | Pilot on selected clients | Keep stage-only submitted flow active until replaced |
| 9 Revenue Intelligence | Add commercial terms, revenue forecast, invoice, placement revenue fields | Forecast calculator, probability model, revenue rollup, margin service | Forecast, commercial terms, invoice APIs | Revenue widgets and client/recruiter forecast views | Calculation, currency, probability, permissions tests | Ship forecast read-only before write workflows | Disable forecasts; preserve offers and placements |
| 10 Risk Intelligence | Add risk signals and risk assessments | Risk scoring, mitigation task creation, risk refresh jobs | Risk signal/assessment APIs | Risk badges and mitigation panels | Risk evidence, stale risk, false-positive feedback tests | Start with candidate/offer risk | Hide risk UI; keep raw signals for analysis |
| 11 Voice and WhatsApp | Add conversation, message, consent, opt-out, provider delivery logs | WhatsApp provider, voice provider, transcript, consent, handoff | Inbound/outbound messaging, voice callback, consent APIs | Conversation inbox, WhatsApp templates, call history | Provider webhook, consent, retry, idempotency tests | Enable per workspace/provider | Disable provider send; keep internal logging |
| 12 Talent Graph | Add graph nodes, graph edges, referral records | Graph builder, relationship scorer, referral scorer | Relationship and referral APIs | Relationship panels, referral prompts | Graph build idempotency, tenant isolation, scoring tests | Build graph asynchronously from events | Stop graph jobs; operational tables unaffected |
| 13 Analytics Platform | Add analytics snapshots, report definitions, dashboard definitions, analytics views | Snapshot jobs, metric definitions, report scheduler | Analytics/report APIs backed by views | Upgrade existing dashboards/reports | Metric reconciliation, snapshot rebuild, permissions tests | Parallel-run old and new analytics | Switch routes back to live queries |
| 14 API Platform | Add API keys, service accounts, webhook subscriptions/deliveries, rate limit records | API key auth, webhook dispatcher, rate limiter, audit service | Versioned public APIs and webhooks | Integration admin screens | Signature, rate limit, permission, delivery retry tests | Private beta APIs first | Revoke keys/webhooks; internal app unaffected |
| 15 Enterprise Readiness | Add SSO config, SCIM config, retention policies, field permissions, export jobs, break-glass records | SSO, SCIM, retention, export, field policy, break-glass services | Enterprise admin APIs | Enterprise settings and audit exports | SSO, SCIM, retention, export, break-glass tests | Enable per enterprise tenant | Disable enterprise connectors; keep base auth |

## 4. Business Prioritization

Scoring logic:

- Customer value: impact on daily recruiter, manager, client, and owner workflows.
- Revenue impact: ability to close more placements, retain customers, or support paid plans.
- Implementation effort: delivery complexity and migration risk.
- Strategic moat: long-term differentiation and defensibility.

### NOW

Build first because these unlock production readiness and near-term business value:

1. Tenant, organization, workspace, roles, permissions, and tenant-safe APIs.
2. Core candidate, company, contact, job, and pipeline hardening.
3. Configurable pipeline stages and stage history.
4. Activity, decision, audit, and event foundations.
5. Candidate/source attribution including Naukri, foundit, public web, GitHub, resumes, internal DB, and manual/referral sources.
6. Agent run wrapper around existing AI screening, copilot, resume parsing, JD parsing, and Naukri workflows.
7. AI cost tracking and budget policies.
8. Screening intelligence from notes, WhatsApp, and voice transcripts.
9. Submission drafts with human approval.
10. Basic revenue forecast from offer, placement, fee, and probability.

### NEXT

Build after foundation is stable:

1. Knowledge Vault for SOPs, playbooks, interview guides, and submission templates.
2. Risk intelligence for candidate, offer, joining, client, and revenue risk.
3. Match intelligence and explainable ranking.
4. WhatsApp conversation model with inbound/outbound delivery and consent.
5. Voice transcript extraction and memory confirmation.
6. Event-backed analytics snapshots and upgraded dashboards.
7. Recruiter, client, source, and agent performance analytics.
8. Webhooks for core lifecycle events.
9. Service accounts and API key management.

### LATER

Defer until product-market signals and enterprise requirements justify the cost:

1. Full marketplace implementation.
2. Shared talent pools across agencies.
3. Split-fee collaboration workflows.
4. Advanced graph algorithms and marketplace matching.
5. Full SCIM provisioning.
6. Full BI connector suite.
7. Full data warehouse sync.
8. Advanced PulseIQ integration.
9. Autonomous optimization loops.
10. Paid sourcing connectors beyond customer-configured Naukri/foundit/LinkedIn workflows.

### Business Priority Ranking

| Feature | Customer value | Revenue impact | Effort | Strategic moat | Priority |
|---|---:|---:|---:|---:|---|
| Multi-tenant foundation | Very high | Very high | High | High | NOW |
| Tenant-safe candidate/job/pipeline | Very high | Very high | Medium | Medium | NOW |
| Configurable stages | High | High | Medium | Medium | NOW |
| Activity, audit, decision, event store | High | High | Medium | High | NOW |
| Agent run and cost governance | High | High | Medium | High | NOW |
| Screening intelligence | Very high | High | Medium | High | NOW |
| Submission intelligence | Very high | Very high | Medium | Medium | NOW |
| Revenue forecasting | High | Very high | Medium | High | NOW |
| Knowledge Vault | High | Medium | Medium | High | NEXT |
| Risk intelligence | High | High | Medium | High | NEXT |
| Match intelligence | High | High | Medium | High | NEXT |
| Voice and WhatsApp conversation layer | Very high | High | High | High | NEXT |
| Analytics platform | High | High | High | High | NEXT |
| API platform | Medium | High | Medium | High | NEXT |
| Talent Graph | Medium now, high later | High | High | Very high | NEXT/LATER |
| Enterprise SSO/SCIM | Medium now | High for enterprise | High | Medium | LATER |
| Marketplace | Medium now | Potentially high | Very high | Very high | LATER |

## 5. CareerPaths Design Partner Plan

CareerPaths should validate workflows and outcomes, not define hard-coded product behavior. Every CareerPaths-specific rule must become tenant/workspace configuration.

### What To Validate

Recruiter workflows:

- New candidate creation
- Resume import and parsing
- Naukri/foundit/public source capture
- Candidate search and shortlist creation
- Candidate-job matching
- Follow-up workflows
- Stage movement
- Recruiter handoff

Screening notes:

- How recruiters capture notes after calls
- Which facts must become structured fields
- Which notes should become memory
- Which facts require confirmation
- WhatsApp and voice note capture workflows

Submission process:

- Submission templates
- Client-ready summaries
- Approval workflow
- Duplicate checks
- Turnaround expectations
- Client feedback capture

Trackers:

- Current spreadsheet trackers
- Pipeline aging
- Offer tracker
- Joining tracker
- Revenue tracker
- Recruiter productivity tracker

Candidate follow-up:

- WhatsApp cadence
- Call cadence
- Offer follow-up
- Joining follow-up
- Dropout prevention
- Re-engagement/nurture workflows

Recruiter productivity metrics:

- Candidates sourced per recruiter
- Screenings completed
- Qualified candidates
- Submissions
- Interviews
- Offers
- Joins
- Time to submit
- Time to closure
- Revenue per recruiter
- Agent-assisted time saved

### CareerPaths Validation Cadence

Week 1:

- Map current workflows, trackers, roles, stages, sources, templates, and approval points.

Week 2:

- Validate tenant/workspace model and core entity terminology.

Week 3:

- Validate candidate/job/pipeline migration assumptions and stage configuration.

Week 4:

- Validate memory, notes, and decision capture.

Weeks 5-6:

- Validate AI screening, copilot, and source workflows wrapped as agents.

Weeks 7-8:

- Validate match intelligence and submission drafts.

Weeks 9-10:

- Validate revenue and risk dashboards.

Weeks 11-13:

- Validate WhatsApp/voice workflow, analytics, and rollout readiness.

### Success Criteria

Operational success:

- Recruiters can run candidate, job, pipeline, screening, submission, and follow-up workflows without spreadsheets for the pilot scope.
- Every candidate-job movement captures actor, timestamp, and reason.
- Candidate phone, WhatsApp, compensation, notice period, and availability facts are consistently captured.

Productivity success:

- Reduce manual screening summary writing time by at least 40 percent.
- Reduce submission draft time by at least 50 percent.
- Improve recruiter follow-up compliance by at least 30 percent.
- Reduce duplicate candidate creation by at least 50 percent.

Business success:

- Show weighted revenue forecast by client, recruiter, and active requirement.
- Track source-to-submission and source-to-placement conversion.
- Identify at least three actionable risk patterns from pilot data.

Trust success:

- Recruiters can see why agents recommend candidates, risks, and next actions.
- Humans approve external messages and client submissions.
- CareerPaths admins can correct memory and agent output.

## 6. Technical Risks

### Prisma Risks

Risk:

- Adding tenant columns and many new relational tables can create large migration complexity.
- Current global unique constraints conflict with tenant-scoped uniqueness.
- Fixed enums for roles, stages, and sources restrict configurability.

Mitigation:

- Use additive migrations first.
- Backfill a default organization/workspace.
- Add tenant-scoped indexes before removing global constraints.
- Keep compatibility fields during transition.
- Replace enums with config tables only after route and UI parity.

### Migration Risks

Risk:

- Existing data may be incomplete, duplicate, or globally unique in ways that fail tenant scoping.
- Application routes may accidentally query mixed old/new fields during transition.

Mitigation:

- Create migration dry runs and validation reports.
- Add backfill scripts with idempotency.
- Use feature flags for tenant enforcement.
- Run old and new queries in parallel for critical reports.
- Snapshot production data before each migration wave.

### Multi-Tenant Risks

Risk:

- Cross-tenant data leakage can occur in APIs, analytics, events, graph edges, model context, webhooks, and exports.

Mitigation:

- Require tenant context in repository helpers.
- Add automated tests for every high-risk route.
- Add lint/check patterns for unscoped Prisma queries.
- Add organization/workspace fields to event, audit, agent, analytics, and connector records from the start.
- Make tenant scope part of every background job payload.

### AI Cost Risks

Risk:

- Copilot, screening, parsing, transcript extraction, matching, and future agents can produce uncontrolled model spend.

Mitigation:

- Record model usage and agent cost before expanding agents.
- Add organization/workspace budgets, daily limits, monthly limits, model allowlists, and alerts.
- Default to low-cost models for classification and extraction.
- Require admin approval for premium models or high-volume runs.

### Performance Risks

Risk:

- Candidate search, analytics, reports, event store, graph edges, and activity timelines can become slow as data grows.

Mitigation:

- Add scoped indexes early.
- Use pagination for all list APIs.
- Build analytics snapshots for dashboards.
- Use background jobs for graph and memory processing.
- Keep full-text search and vector search behind dedicated services or optimized indexes.

### Event Volume Risks

Risk:

- Event store can grow quickly and analytics replay can become expensive.

Mitigation:

- Start with core event types.
- Version event payloads.
- Partition or archive high-volume events.
- Use idempotent consumers and dead-letter handling.
- Redact sensitive fields for analytics and webhooks.

### Provider And Connector Risks

Risk:

- WhatsApp, voice, Naukri, foundit, LinkedIn import, email, and paid sourcing providers have variable terms, rate limits, costs, and reliability.

Mitigation:

- Use connector capability metadata.
- Separate public/free sourcing flows from paid subscription flows.
- Track rate limits, costs, source attribution, and connector health.
- Do not imply access to paid databases unless a tenant configures that connector.

## 7. 90-Day Execution Plan

## Week 1

Deliverables:

- Current workflow inventory
- Data model gap analysis
- Tenant migration design
- CareerPaths validation plan

Coding tasks:

- Draft migration design only.
- Identify all unscoped Prisma queries.
- Identify all global unique constraints and enums needing transition.

Validation tasks:

- Confirm current candidate, job, application, interview, offer, voice, WhatsApp, Naukri, reports, and analytics flows.

Customer feedback:

- Conduct CareerPaths workflow mapping session.
- Collect current trackers and submission templates.

Deployment milestones:

- No production code deployment required.

## Week 2

Deliverables:

- Phase 1 schema migration draft
- Tenant-safe repository/API design
- Default organization/workspace backfill plan

Coding tasks:

- Implement additive tenant schema in a development branch.
- Add tenant context helpers and route guard design.

Validation tasks:

- Dry-run migration on staging copy.
- Verify login/session role compatibility.

Customer feedback:

- Validate organization/workspace terminology.

Deployment milestones:

- Staging-only migration dry run.

## Week 3

Deliverables:

- Tenant-safe core API pilot
- Tenant-scoped candidate/job/application reads
- Migration validation report

Coding tasks:

- Update candidate, job, application, analytics, and report queries behind feature flag.
- Add tenant isolation tests.

Validation tasks:

- Compare old vs tenant-scoped query outputs.
- Test admin/recruiter/client/candidate portals.

Customer feedback:

- Validate pilot data visibility rules with CareerPaths.

Deployment milestones:

- Deploy tenant foundation behind feature flag.

## Week 4

Deliverables:

- Core talent operations schema draft
- Company/contact/source attribution design
- Configurable stage design

Coding tasks:

- Add company/contact/source/stage additive models in development.
- Build backfill mapping from Client to Company and Application stage to stage definition.

Validation tasks:

- Test candidate/job/pipeline CRUD after backfill.

Customer feedback:

- Validate CareerPaths stage names, rejection reasons, source list, and ownership rules.

Deployment milestones:

- Staging migration and backfill rehearsal.

## Week 5

Deliverables:

- Configurable pipeline pilot
- Stage transition history
- Activity/audit/event foundation draft

Coding tasks:

- Implement stage transition service with why capture.
- Add event publisher design for candidate/job/application events.

Validation tasks:

- Verify stage changes, permissions, and history.

Customer feedback:

- Validate stage reasons and manager visibility.

Deployment milestones:

- Deploy core operations pilot to limited users.

## Week 6

Deliverables:

- Institutional memory MVP
- Decision capture MVP
- Audit log MVP

Coding tasks:

- Capture notes, stage changes, AI summaries, and screening reports as memory candidates.
- Add decision records for consequential stage changes.

Validation tasks:

- Test memory evidence, correction, and confirmation flows.

Customer feedback:

- Review whether captured memories are useful and accurate.

Deployment milestones:

- Deploy memory capture behind feature flag.

## Week 7

Deliverables:

- Agent run framework MVP
- OpenRouter model abstraction
- Model usage and cost tracking MVP

Coding tasks:

- Wrap copilot, AI screening, resume parsing, JD parsing, and Naukri matching as agent runs.
- Record prompt version, provider, model, token usage where available, cost estimate, and output.

Validation tasks:

- Compare existing AI output behavior before and after wrapping.
- Test budget hard-stop and warning flows.

Customer feedback:

- Validate agent explanation and confidence display requirements.

Deployment milestones:

- Deploy agent framework to staging.

## Week 8

Deliverables:

- Screening intelligence MVP
- WhatsApp/voice transcript extraction design
- Recruiter copilot screening workflows

Coding tasks:

- Extract structured screening facts from notes and transcripts.
- Add confirmation workflow for compensation, notice, availability, risk, and candidate preferences.

Validation tasks:

- Test extraction accuracy on real pilot notes.

Customer feedback:

- CareerPaths recruiters review extraction quality and time savings.

Deployment milestones:

- Limited pilot for screening intelligence.

## Week 9

Deliverables:

- Match intelligence MVP
- Ranked shortlist
- Gap analysis
- Feedback loop for recommendations

Coding tasks:

- Extend heuristic match with explainable gap analysis.
- Store agent recommendations and feedback.

Validation tasks:

- Compare rankings against recruiter choices.
- Track accept/edit/reject feedback.

Customer feedback:

- Validate shortlist usefulness for active roles.

Deployment milestones:

- Deploy match intelligence to pilot workspace.

## Week 10

Deliverables:

- Submission intelligence MVP
- Submission draft and approval workflow
- Client summary generation

Coding tasks:

- Add submission draft records and approval requests.
- Generate submission summaries from candidate, job, screening, match, and templates.

Validation tasks:

- Test approval routing and duplicate checks.

Customer feedback:

- CareerPaths validates submission format and client-readiness.

Deployment milestones:

- Pilot submissions with human approval only.

## Week 11

Deliverables:

- Revenue intelligence MVP
- Risk intelligence MVP
- Weighted revenue dashboards

Coding tasks:

- Add commercial terms, revenue forecasts, and risk signals.
- Start with offer, joining, candidate, and revenue risk.

Validation tasks:

- Reconcile forecast calculations with current trackers.

Customer feedback:

- Validate owner-level forecast view and risk usefulness.

Deployment milestones:

- Deploy revenue/risk read-only dashboards.

## Week 12

Deliverables:

- Voice and WhatsApp conversation foundation
- Consent and opt-out model
- Provider delivery logging

Coding tasks:

- Normalize WhatsApp and voice records into conversation/message architecture.
- Add delivery logs and inbound webhook plan.

Validation tasks:

- Test message/call auditability and candidate timeline visibility.

Customer feedback:

- Validate candidate follow-up cadence and WhatsApp templates.

Deployment milestones:

- Staging provider flow; production only after consent review.

## Week 13

Deliverables:

- Analytics snapshot MVP
- Agent performance metrics
- 90-day pilot review
- Next-quarter roadmap

Coding tasks:

- Add daily analytics snapshots for operational, revenue, recruiter, client, source, and agent metrics.
- Prepare API/webhook foundation design for next cycle.

Validation tasks:

- Reconcile analytics with reports and CareerPaths trackers.
- Review tenant isolation and audit coverage.

Customer feedback:

- Run CareerPaths success criteria review.
- Identify gaps before broader rollout.

Deployment milestones:

- Production rollout recommendation for stable modules.

## 8. Final Recommendation

### What Should Be Built First

Build the foundation before adding more visible intelligence:

1. Tenant, organization, workspace, role, permission, and tenant-safe APIs.
2. Core talent operations hardening for candidates, companies, contacts, jobs, applications, stages, source attribution, and pipeline history.
3. Activity, audit, decisions, and event store.
4. Agent run framework, OpenRouter model abstraction, AI cost governance, and feedback loop.
5. Screening intelligence and submission intelligence because they create fast recruiter productivity gains.
6. Basic revenue and risk intelligence because they connect recruiting work to business outcomes.

### What Should Not Be Built Yet

Do not build these in the first implementation cycle:

- Marketplace implementation
- Shared talent pool marketplace UI
- Split-fee agency collaboration
- Autonomous candidate rejection
- Autonomous hiring decisions
- Autonomous client submission
- Unapproved external outreach
- Full public API ecosystem
- Full BI/warehouse connector suite
- Full SCIM and complex enterprise provisioning

### What Can Wait

These should be architected for but delayed:

- Advanced Talent Graph algorithms
- Marketplace workflows
- Full PulseIQ integration
- Full warehouse sync
- Advanced recruiter coaching
- Advanced playbook optimization
- Paid sourcing connectors unless a customer explicitly configures and pays for them

### Strongest Moat

The strongest moat is not a single feature. It is the compounding intelligence layer created by:

- Tenant-safe operational data
- Every interaction becoming memory
- Every decision capturing why
- Every placement tied to revenue, risk, source, recruiter, client, and outcome
- Agents that learn from human feedback and real placement outcomes
- Voice and WhatsApp workflows that capture the communication reality of Indian recruiting
- Talent Graph relationship intelligence that improves over time

The fastest practical path is to preserve the current application, harden it into a multi-tenant operating system, and then turn existing AI, voice, WhatsApp, Naukri, reports, and pipeline workflows into governed, memory-backed, revenue-aware intelligence.
