# WEEK 10 — PILOT DEMO PACKAGE PLAN

## Purpose

Week 10 packages everything built in Weeks 1–9 into a **ready-to-run pilot demo for CareerPaths India**. No new code, no schema changes, no migrations. This plan designs the demo flow, target customer pain-point mapping, dataset requirements, ROI story, and pilot proposal so the first customer demo can be delivered immediately.

CareerPaths India is the default organization (slug `careerpaths`) hardcoded in `lib/company.ts`. Key contacts: **John Sagayaraj** (Admin, `john.sagayaraj@careerpathsindia.com`) and **Priya** (Recruiter, `priya@careerpathsindia.com`).

---

## Principles

1. **Zero code changes** — All 10 sections below reference only existing routes, components, and data.
2. **Existing data only** — The demo uses the seeded dataset from `scripts/seed-demo.ts` (28 candidates, 5 requisitions, pipeline with interviews). No new seed script needed.
3. **Live or simulated AI** — Copilot prompts work with OpenRouter. If the API key is unavailable, fall back to showing the UI + explaining the integration.
4. **Build win** — Every screen shown must compile and render (`npm run build` passes).
5. **Ten-minute setup** — From repo clone to demo-ready: `npm install && npx prisma db seed && npm run dev`.

---

## 1. Five-Minute Demo Flow

Audience: CareerPaths CEO/VP (John Sagayaraj). Goal: "We have built a complete AI-native talent intelligence platform. Here is what it does for your recruiters today."

### Flow

| Time | Step | Screen | Narrator Script |
|------|------|--------|-----------------|
| 0:00–0:30 | Login | `/login` → Admin dashboard | "This is TalentPulse — your talent intelligence command center. Built on your existing CareerPaths data, zero migration needed." |
| 0:30–1:00 | Pipeline health | `/admin` dashboard (stats cards) | "At a glance: 5 open requisitions, 28 candidates in pipeline, 3 interviews this week, 1 offer extended. Real-time pipeline health from your existing workflow." |
| 1:00–1:45 | AI screening | `/admin/jobs/[id]` → Pipeline tab → Kanban board | "Every candidate is AI-screened. Match scores, skill gaps, readiness assessments — computed in seconds. This SAP Program Manager requisition has 6 screened candidates with 92% top match." |
| 1:45–2:30 | Copilot | `/admin/copilot` | "Your recruiter copilot. Generate interview questions, write outreach emails, analyze job descriptions, score matches. One click, instant response." |
| 2:30–3:30 | Submission package | `/api/submission/package?applicationId=...` (show JSON in browser or curl) | "When you find a match, TalentPulse generates a complete submission package — fit-gap explanation, risk disclosure, email draft, tracker row. Client-ready in one click." |
| 3:30–4:00 | Revenue intelligence | `/api/revenue/dashboard` (JSON) or `/api/revenue/leaderboard` | "Every recruiter's productivity scored across 5 dimensions. Pipeline revenue projected. Client profitability signalled. Your business intelligence — no spreadsheets." |
| 4:00–4:30 | Screening workbench | `/api/screening/workbench?applicationId=...` (JSON) | "Deep screening: facts, missing info gaps, risk signals (counter-offer, notice period, no-show risk), readiness score, next action recommendations." |
| 4:30–5:00 | Close | — | "This is live today. Your data, your org, your workflow. We can set up a pilot with your recruiters this week." |

**Fallback script (AI down):** Skip Step 4 (Copilot). Replace Step 6–7 with showing the UI pages for Submission and Screening (stub pages if API is unreachable). Emphasise that AI is pluggable via OpenRouter and can use any model.

---

## 2. Fifteen-Minute Deep Demo Flow

Audience: CareerPaths recruiting team (Priya + 2–3 recruiters). Goal: "Here is how TalentPulse makes your day-to-day faster."

### Flow

| Time | Step | Screen | Depth |
|------|------|--------|-------|
| 0:00–0:30 | Login as recruiter | `/login` → `/recruiter` dashboard | "Priya's view: her open requisitions, her pipeline, her upcoming interviews." |
| 0:30–2:00 | Walk a requisition | `/recruiter/jobs/[id]` → Pipeline tab | Full walkthrough: job details → candidate list → match scores → filter by stage → drill into a candidate profile. Show all 11 pipeline stages. |
| 2:00–4:00 | Candidate deep dive | `/recruiter/candidates/[id]` | AI summary, skill tags, experience timeline, CTC expectations, education, project history, notes from team, AI screening output. Show the complete dossier. |
| 4:00–6:00 | Copilot power session | `/recruiter/copilot` | Run 4 prompts: (1) "Generate interview questions for SAP Program Manager", (2) "Write outreach email to a senior SAP consultant", (3) "Score this candidate against the JD", (4) "Suggest LinkedIn message". Show speed and quality. |
| 6:00–8:00 | Submission workflow | `/recruiter/pipeline` → submit candidate | Open Pipeline → click an AI_SCREENING or REVIEWED candidate → show `/api/submission/package`. Walk through fit-gap, risk disclosure, email draft. Show approval flow if manager review is needed. |
| 8:00–9:30 | Conversation timeline | `/api/conversations/timeline?candidateId=...` (JSON or formatted display) | Show the unified timeline: voice screening notes, WhatsApp messages, recruiter notes, email campaigns — all in one chronological view with extracted insights and follow-up tasks. |
| 9:30–11:00 | Screening workbench | `/api/screening/workbench?applicationId=...` | Walk through: ScreeningFacts (skills, experience, CTC), MissingInfo gaps, RiskSignals (with severity), ReadinessScore, recommended questions for client interview. |
| 11:00–12:30 | Revenue intelligence | `/api/revenue/productivity?recruiterId=...` → `/api/revenue/leaderboard` → `/api/revenue/opportunity` | Show Priya's productivity score, her rank on leaderboard, her pipeline revenue contribution, her client profitability signals. Show the competitive aspect. |
| 12:30–14:00 | Institutional memory | `/api/memory/timeline` (JSON) → `/api/memory/[id]/confirm` (POST) | Show the full activity log. Demonstrate confirming a memory entry, correcting one, dismissing one. Show that the platform learns from recruiter feedback. |
| 14:00–15:00 | Q&A / close | — | Answer questions. Offer pilot onboarding for 2 recruiters starting next week. |

---

## 3. CareerPaths Pain Points → TalentPulse Capabilities

Mapped from CareerPaths India's likely operational challenges as a recruitment process outsourcing / staffing firm:

| # | CareerPaths Pain Point | TalentPulse Capability | Week | Route / Screen |
|---|-----------------------|------------------------|------|----------------|
| 1 | **Manual candidate screening** — Recruiters read resumes one by one, inconsistent quality | AI match scoring + screening intelligence computes skill/exp/CTC/location/education fit automatically | 3, 7 | Pipeline Kanban, `/api/screening/workbench` |
| 2 | **Scattered candidate communication** — WhatsApp, phone, email, notes in separate silos | Conversation capture unifies all channels into one timeline with extracted insights and follow-ups | 6 | `/api/conversations/timeline` |
| 3 | **Slow client submissions** — Preparing candidate packages takes 30–60 minutes per submission | Submission package generates fit-gap, risk disclosure, email draft, tracker row in one click | 8 | `/api/submission/package` |
| 4 | **No visibility into recruiter performance** — Hard to compare productivity across the team | Recruiter leaderboard with 5-dimension scoring, badges, rank | 9 | `/api/revenue/leaderboard` |
| 5 | **Can't quantify pipeline value** — No visibility into expected revenue from active pipeline | Revenue opportunity with probability-weighted pipeline valuation | 9 | `/api/revenue/opportunity` |
| 6 | **Client chrisk is invisible** — Don't know which clients are at risk until they leave | Client profitability signals with engagement health, churn risk, revenue trend | 9 | `/api/revenue/clients` |
| 7 | **Expensive third-party sourcing** — No insight into which sources yield best placements | Source effectiveness with ROI classification per channel | 9 | `/api/revenue/sources` |
| 8 | **Inconsistent candidate assessments** — Different recruiters assess differently, no standard framework | Screening workbench provides consistent facts → gaps → risks → readiness → questions pipeline | 7 | `/api/screening/workbench` |
| 9 | **Lost institutional knowledge** — Recruiters leave, candidate/client context lost | Institutional memory captures every action, recruiter can confirm/correct/dismiss | 5 | `/api/memory/timeline` |
| 10 | **Manual outreach drafting** — Recruiters spend hours writing emails and LinkedIn messages | Copilot generates outreach emails, interview questions, LinkedIn messages in seconds | 3 | `/api/copilot/chat` |
| 11 | **No placement probability insight** — Cannot estimate likelihood of offer acceptance | Placement probability with 8 signal modifiers (skill fit, CTC fit, notice period, counter-offer risk, etc.) | 9 | `/api/revenue/placement/[applicationId]` |
| 12 | **Multi-tenant data concerns** — If they expand to manage other companies' hiring | Full tenant isolation via repository layer and API enforcement | 3–4 | `tenantPrisma.withContext(ctx)` |

---

## 4. Demo Dataset Requirements

The `scripts/seed-demo.ts` script (already committed) satisfies all demo requirements. No additional seed data is needed.

### Existing Seed Data

| Entity | Count | Details |
|--------|-------|---------|
| Users | 3 | Admin (`admin@talentpulse.demo`), Recruiter 1, Recruiter 2 |
| Clients | 5 | TechCorp, FinServe, HealthPlus, RetailMax, EduGlobal |
| Requisitions | 5 | SAP Program Manager, Oracle SCM Consultant, AI Solutions Architect, Salesforce Lead, Data Engineer |
| Candidates | 28 | Diverse titles, skills, experience levels, CTC ranges |
| Applications | 28 | 1 per candidate, distributed across pipeline stages |
| Interviews | Several | Some with outcomes, some scheduled |
| Projects | Several | Candidate project history entries |
| Pipeline stages | 11 | NEW → AI_SCREENING → REVIEWED → SUBMITTED → INTERVIEW_SCHEDULED → INTERVIEW_COMPLETE → OFFER_EXTENDED → OFFER_ACCEPTED → JOINED → REJECTED → WITHDRAWN |

### What to Verify Before Demo

- [ ] `npx prisma db seed` completes without errors
- [ ] Login works for `admin@talentpulse.demo` / `demo123`
- [ ] Login works for `recruiter1@talentpulse.demo` / `demo123`
- [ ] Admin dashboard shows stat cards with non-zero values
- [ ] 5 requisitions visible in `/admin/jobs` (or `/recruiter/jobs`)
- [ ] Pipeline Kanban board renders with candidate cards
- [ ] Candidate profile pages load for any candidate
- [ ] Copilot generates responses (check OpenRouter key)
- [ ] `/api/revenue/dashboard` returns JSON with data
- [ ] `/api/revenue/leaderboard` returns ranked list
- [ ] `/api/screening/workbench?applicationId=<id>` returns screening data
- [ ] `/api/submission/package?applicationId=<id>` returns package
- [ ] `/api/conversations/timeline?candidateId=<id>` returns timeline
- [ ] `/api/memory/timeline` returns activity log entries

### Build Verification

- [ ] `npm run build` passes with zero errors (confirmed working after Week 9 fix)

---

## 5. Screens / API Outputs to Showcase

Ordered by demo impact (highest first):

### Must-Show (5-minute demo)

| Asset | Type | Why It Matters |
|-------|------|----------------|
| Admin dashboard (`/admin`) | UI page | First impression — command centre with real metrics |
| Pipeline Kanban (`/admin/jobs/[id]` → Pipeline tab) | UI page | Core workflow — AI-screened candidates in stages |
| Copilot (`/admin/copilot`) | UI page | AI assistant — fastest wow factor |
| Revenue leaderboard (`/api/revenue/leaderboard`) | API JSON | Business value — recruiter productivity quantified |
| Submission package (`/api/submission/package?applicationId=...`) | API JSON | Client-facing deliverable — one-click output |

### Should-Show (15-minute demo)

| Asset | Type | Why It Matters |
|-------|------|----------------|
| Candidate profile (`/admin/candidates/[id]`) | UI page | Complete dossier — skills, CTC, AI summary |
| Screening workbench (`/api/screening/workbench`) | API JSON | Deep intelligence — gaps, risks, readiness |
| Conversation timeline (`/api/conversations/timeline`) | API JSON | Unified view — all channels in one place |
| Revenue dashboard (`/api/revenue/dashboard`) | API JSON | Personal metrics — recruiter's own performance |
| Revenue opportunity (`/api/revenue/opportunity`) | API JSON | Pipeline valuation — expected revenue |
| Client profitability (`/api/revenue/clients`) | API JSON | Client health — churn risk, revenue trend |
| Placement probability (`/api/revenue/placement/[id]`) | API JSON | Deal likelihood — 8 signal modifiers |
| Source effectiveness (`/api/revenue/sources`) | API JSON | Sourcing ROI — best channels |
| Memory timeline (`/api/memory/timeline`) | API JSON | Audit trail — every action captured |
| Productivity score (`/api/revenue/productivity`) | API JSON | 5-dimension recruiter analytics |

### Presentation Notes

- **UI pages first** — Non-technical audiences (CEO) prefer screens over JSON. Show UI for dashboard, pipeline, Copilot, candidate profile.
- **API endpoints as proof** — For technical stakeholders or when UI pages are stubs, show JSON output in the browser via direct URL navigation (Next.js renders JSON by default for route handlers).
- **Stub pages** — `/admin/sourcing-intelligence` and `/admin/copilot` are stub pages. Copilot shows the real `CopilotClient` component. Sourcing-intelligence shows minimal content — skip it or explain it's in development.

---

## 6. Before/After Productivity Story

### The "Before" (CareerPaths Today)

- **Monday morning:** Priya opens her email. 5 new candidate responses from WhatsApp. 3 LinkedIn messages. 2 email inquiries. No unified inbox.
- **Screen 1:** Priya opens each resume manually, scans for skills, compares against the JD. 15 minutes per resume.
- **Submit 1:** Priya finds a match for the SAP Program Manager role. She writes an email to the client (20 min), copies details into a tracker spreadsheet (10 min), checks for risks manually (5 min). Total: 35 minutes.
- **Weekly report:** John asks "How is the team doing?" Priya and 3 others send manual spreadsheet updates. John spends 2 hours consolidating.
- **Quarterly review:** "Which source gives us the best candidates?" Nobody knows. "What is our pipeline worth?" Spreadsheet estimate.

### The "After" (TalentPulse)

- **Monday morning:** Priya opens TalentPulse. Her dashboard shows 5 new candidates in the pipeline, 2 pending screening reviews, 1 interview tomorrow. All communication logs visible in candidate timeline.
- **Screen 1:** Every candidate in the pipeline has an AI match score (88%, 92%, 74%...). Priya clicks the 92% candidate, sees AI summary, skill gaps, CTC fit, readiness score. 30 seconds vs 15 minutes.
- **Submit 1:** Priya clicks "Submit" on the matched candidate. TalentPulse generates the submission package (fit-gap, risk disclosure, email draft, tracker row) in one click. She reviews for 2 minutes, sends. Total: 3 minutes vs 35 minutes.
- **Weekly report:** John opens `/api/revenue/leaderboard`. He sees Priya ranked #1 with an 82 composite score, $240K pipeline value, 4 active submissions. 10 seconds vs 2 hours.
- **Quarterly review:** "LinkedIn source: 28% of applications, 15% of joins, ROI: HIGH. Direct applications: 12% of applications, 8% of joins, ROI: MEDIUM." Pipeline weighted revenue: $1.2M. At-risk: $180K (2 offers stale >14 days).

### Time Savings Summary

| Activity | Before | After | Savings |
|----------|--------|-------|---------|
| Screen one candidate | 15 min | 30 sec | **96%** |
| Prepare client submission | 35 min | 3 min | **91%** |
| Generate weekly team report | 2 hours | 10 sec | **99%** |
| Write outreach email/LinkedIn message | 15 min | 30 sec | **97%** |
| Review client health for 10 clients | 1 hour | 5 sec | **99%** |
| **Per recruiter per week** | **~15 hours** | **~2 hours** | **87% savings** |

### Productivity Multiplier

A team of 4 recruiters spending 60% of their time on screening + submissions + reporting:
- **Before:** 4 × 24 hours/week = 96 hours on core activities
- **After:** 4 × 3 hours/week = 12 hours on core activities
- **Freed capacity:** 84 hours/week — equivalent to **3.5 additional recruiters** without hiring

---

## 7. ROI Metrics

### Assumptions

- Fee rate: 8.33% (default) of placed candidate CTC
- Average placement CTC: ₹25L ($30K)
- Average fee per placement: ~₹2.1L ($2,500)
- Team size: 4 recruiters
- Current placements per recruiter per year: 8 (industry average for staffing firms)
- Target placements per recruiter per year: 12 (30% improvement from productivity gains)

### Direct ROI Calculation

| Metric | Current (Annual) | With TalentPulse (Annual) | Improvement |
|--------|-----------------|--------------------------|-------------|
| Placements per recruiter | 8 | 12 | +50% |
| Total team placements | 32 | 48 | +50% |
| Average fee per placement | ₹2.1L | ₹2.1L | — |
| **Total revenue** | **₹67L ($80K)** | **₹1Cr ($120K)** | **+₹33.5L ($40K)** |

### Efficiency ROI

| Metric | Current (Annual) | With TalentPulse (Annual) |
|--------|-----------------|--------------------------|
| Hours per submission | 35 min | 3 min |
| Hours saved per recruiter per week | — | ~13 hours |
| Team hours saved per week | — | ~52 hours |
| Equivalent full-time recruiters reclaimed | — | ~3.5 |

### Pipeline Value Visibility

| Metric | Without TalentPulse | With TalentPulse |
|--------|-------------------|------------------|
| Pipeline awareness | Manual spreadsheet, stale | Real-time, probability-weighted |
| At-risk revenue detection | None | Stale offers >14 days flagged |
| Client churn awareness | Reactive ("client stopped calling") | Proactive signals (90 days no submission) |
| Source ROI | Unknown | Quantified per channel |

### Soft ROI

- **Faster fill time:** AI screening + instant submission packages reduce time-to-submit by 90%, improving win rates against competitors
- **Better quality of hire:** Consistent screening framework reduces bad submissions that damage client relationships
- **Recruiter satisfaction:** Automating manual work reduces burnout, improves retention (replacement cost of a recruiter: 50–100% of annual salary)
- **Client confidence:** Professional submission packages with risk disclosures build trust and differentiate CareerPaths from competitors

### Breakeven Timeline

Assuming a pilot subscription of ₹2L/month ($2,400/month):
- Monthly platform cost: ₹2L
- Additional monthly revenue from +1 placement/month (team): ₹2.1L
- **Breakeven:** Month 1 (one additional placement covers the platform)
- **Net ROI Year 1:** ₹33.5L (additional revenue) − ₹24L (12 months platform) = **₹9.5L positive ROI**

---

## 8. Pricing / Pilot Proposal

### Pilot Structure (3 Months)

| Component | Details |
|-----------|---------|
| **Duration** | 3 months (90 days) |
| **Users** | Up to 5 users (all CareerPaths recruiters + John as admin) |
| **Data** | CareerPaths' own data — no migration needed, seeded via existing pipeline |
| **Support** | Weekly check-in call + Slack/WhatsApp channel + email support |
| **Deployment** | Cloud-hosted (Vercel) or CareerPaths' own infrastructure |
| **Pilot fee** | **₹50,000/month ($600/month)** — 75% discount off target pricing |
| **Success criteria** | Defined in §9 below |

### Target Production Pricing

| Tier | Users | Price (Monthly) | Features |
|------|-------|-----------------|----------|
| Starter | Up to 5 | ₹1L ($1,200) | AI screening, pipeline, Copilot, basic reports |
| Growth | Up to 20 | ₹3L ($3,600) | +Submission intelligence, revenue intelligence, leaderboard |
| Enterprise | Unlimited | Custom | +Multi-tenant, SSO, dedicated infra, SLA |

### Pilot Deliverables

- [x] Fully functional platform with CareerPaths as default tenant
- [x] Demo dataset with 28 candidates, 5 requisitions, pipeline data
- [ ] Data migration: CareerPaths' real candidates, jobs, clients loaded
- [ ] Recruiter onboarding (2 sessions, 1 hour each)
- [ ] Custom report template for weekly team review
- [ ] Go-live decision at week 10

### Pilot Exit Options

- **Convert to paid** at end of Month 3 at agreed pricing
- **Extend pilot** by 1–2 months if more validation needed (at same pilot fee)
- **No-go** — CareerPaths walks away, data exported, no penalty

---

## 9. Risks and Assumptions

### Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| 1 | OpenRouter API outage during demo | Medium | High (Copilot, email draft, screening all use AI) | Fallback to UI walkthrough + cached responses. Demo script (§1) has an AI-down variant. |
| 2 | Seed database unreachable from demo environment | High (currently blocked) | Critical (no data to show) | Verify database connectivity before demo. Have a local PostgreSQL fallback. In worst case, show screenshots or a pre-recorded video walkthrough. |
| 3 | CareerPaths uses different pipeline stages or terminology | Medium | Medium | TalentPulse uses generic stages; CareerPaths' real stages may differ. During pilot, configure stage mapping via tenant settings. |
| 4 | Recruiters resist new tool | Medium | High | Emphasise time savings (96% faster screening). Start with 1 power-user champion. Let them drive adoption. |
| 5 | AI hallucination in screening/summary | Low | Medium | Confidence workflow (confirm/correct/dismiss) mitigates. Show the feedback loop in the demo. |
| 6 | Performance with CareerPaths' full dataset (thousands of candidates) | Medium | Medium | Current build tested with 28 candidates. Real dataset may require pagination, caching, or query optimisation. |
| 7 | Submission email draft quality insufficient for client | Low | Medium | Recruiter reviews and edits before sending. AI draft is a starting point, not the final output. |
| 8 | Revenue estimates don't match CareerPaths' actual billing | Medium | Low | Clearly communicate estimate vs accounting distinction (§7 assumptions). Configure `DEFAULT_FEE_PERCENT` to match CareerPaths' actual fee structure. |

### Assumptions

| # | Assumption | Validation |
|---|-----------|------------|
| 1 | CareerPaths uses standard recruiting stages (New → Screening → Submitted → Interview → Offer → Joined) | Verify with John during pilot kickoff |
| 2 | CareerPaths charges clients a % of candidate CTC (not flat fee or retainer) | Default fee rate is configurable; adjust if needed |
| 3 | CareerPaths tracks candidate source (LinkedIn, Naukri, Referral, etc.) | Source field exists on Candidate model; verify CareerPaths populates it |
| 4 | CareerPaths has 3–5 active recruiters | Based on seed data showing Priya, Pramila, Karthik |
| 5 | CareerPaths' recruitment cycle is 30–60 days per placement | Pipeline stage probabilities may need tuning for their actual cycle |
| 6 | CareerPaths' clients expect formal submission packages | Validate with John; adjust package format as needed |
| 7 | John (Admin) can dedicate 2 hours/week for pilot check-in | Confirm during pilot kickoff call |

---

## 10. Next Implementation Priorities After Demo

These are ordered by customer impact for CareerPaths post-pilot conversion. No new schema required unless noted.

### Priority 1: Real Data Migration (Week 11)

- Build a migration script that loads CareerPaths' actual candidates, jobs, clients, applications, interviews, and offers from their existing system (likely spreadsheets or legacy ATS)
- Map CareerPaths' pipeline stage names to TalentPulse stages
- Validate: all existing CareerPaths data accessible in TalentPulse
- Risk: data quality issues (missing fields, inconsistent formatting)

### Priority 2: Multi-Tenant Onboarding UI (Week 11–12)

- Build an admin UI for creating new organizations (replacing hardcoded CareerPaths defaults)
- Organization settings page: pipeline stage names, fee configuration, role permissions
- User invitation flow for new tenants
- No new schema — all fields exist on `Organization` model or `securityPolicy` JSON

### Priority 3: Submission Package UI (Week 12)

- Build a frontend component that renders the submission package JSON as a polished document preview
- Edit-in-place for fit-gap explanation, risk disclosure, email draft
- One-click copy to clipboard for email body
- PDF export of the complete package
- API already exists (`/api/submission/package`); only frontend work needed

### Priority 4: Screening Workbench UI (Week 12–13)

- Build a frontend component that renders screening workbench JSON as a tabbed panel inside the candidate profile page
- Tabs: Facts | Gaps | Risks | Readiness | Questions
- Visual indicators: risk severity (red/orange/green), readiness score gauge
- One-click actions: "Dismiss risk", "Add note to memory", "Generate interview questions"
- API already exists (`/api/screening/workbench` + confirm/dismiss-risk)

### Priority 5: Conversation Timeline UI (Week 13)

- Build a frontend component that renders the conversation timeline as a chronological feed inside the candidate profile page
- Filter by channel (voice, whatsapp, email, notes)
- Expandable entries with extracted insights
- Follow-up task list with checkbox completion
- API already exists (`/api/conversations/timeline`)

### Priority 6: Revenue Intelligence Dashboards (Week 13–14)

- Build frontend pages for:
  - Recruiter leaderboard (`/admin/revenue/leaderboard`) — ranked table with badges
  - Revenue dashboard (`/admin/revenue/dashboard`) — KPI cards, charts
  - Client profitability (`/admin/revenue/clients`) — client health matrix
  - Source effectiveness (`/admin/revenue/sources`) — bar charts per channel
- All APIs already exist; only frontend and chart library integrations needed

### Priority 7: Copilot Context Expansion (Week 14)

- Add submission package generation to Copilot prompts: "Generate a submission summary for [candidate] for [job]"
- Add screening workbench summary: "Summarise the screening assessment for [candidate]"
- Add revenue intelligence queries: "What is my pipeline revenue this quarter?"
- Requires Copilot to be aware of the new intelligence APIs (already exist)

### Priority 8: Email/Notification Integration (Week 15)

- Send submission email draft via actual SMTP/email API (not just generate the draft)
- Send weekly recruiter productivity report via email
- Notify when a candidate's placement probability changes significantly
- Requires new email-sending infrastructure (Nodemailer, SendGrid, or similar)

### Priority 9: Advanced Analytics (Week 15–16)

- Time-series revenue trends (month-over-month, quarter-over-quarter)
- Recruiter productivity trends (improving or declining over time)
- Client revenue concentration (top 5 clients % of total revenue)
- Fill velocity (average days from NEW → JOINED per job type)
- All computable from existing data; no new schema needed

### Priority 10: Pilot-to-Production Hardening (Ongoing)

- Load testing with CareerPaths' full dataset
- Performance optimisation (add indexes to frequently queried columns)
- Error monitoring and alerting (Sentry or similar)
- Backup and restore procedure
- SLA definition for production support

---

## Appendix A: Demo Checklist (Printable)

- [ ] `npm install` completed
- [ ] `.env` configured with `OPENROUTER_API_KEY`, `DATABASE_URL`, `NEXTAUTH_SECRET`
- [ ] `npx prisma db seed` completed successfully
- [ ] `npm run dev` starts without errors
- [ ] Login: `admin@talentpulse.demo` / `demo123`
- [ ] Login: `recruiter1@talentpulse.demo` / `demo123`
- [ ] Admin dashboard loads (non-zero stat cards)
- [ ] 5 requisitions visible
- [ ] Pipeline Kanban renders with candidate cards
- [ ] Candidate profile loads for at least 3 candidates
- [ ] Copilot generates response (test 2 prompts)
- [ ] Copilot fallback: UI renders without API errors
- [ ] `/api/screening/workbench?applicationId=<id>` returns data
- [ ] `/api/submission/package?applicationId=<id>` returns data
- [ ] `/api/conversations/timeline?candidateId=<id>` returns data
- [ ] `/api/revenue/dashboard` returns data
- [ ] `/api/revenue/leaderboard` returns data (at least 2 entries)
- [ ] `/api/revenue/productivity` returns data
- [ ] `/api/revenue/opportunity` returns data
- [ ] `/api/revenue/clients` returns data
- [ ] `/api/revenue/sources` returns data
- [ ] `/api/revenue/placement/<appId>` returns data
- [ ] `/api/memory/timeline` returns entries
- [ ] Browser console: zero errors
- [ ] Network tab: all API calls return 200
- [ ] Screenshots captured (dashboard, pipeline, Copilot, candidate profile) for offline demo

## Appendix B: Demo Script Variations

### No Database (Seed Cannot Run)
- Show screenshots of all screens (pre-captured)
- Demonstrate Copilot (works independently of seed data — uses OpenRouter)
- Walk through the API contracts on paper
- Focus conversation on the architecture and pipeline probability model

### No AI / No OpenRouter
- Restart with `npm run dev` (Copilot will 503 gracefully — the error message is visible)
- Focus on: screening intelligence, submission package, revenue intelligence, conversation timeline — these work without AI
- Show Copilot UI with example prompts disabled; explain that with an API key they become functional

### Time Constraint (2-Minute Version)
1. Dashboard (15s): "Pipeline health at a glance."
2. Pipeline with AI match scores (30s): "Every candidate scored automatically."
3. Copilot (30s): "AI assistant for every recruiter task."
4. Submission package (30s): "One-click client-ready deliverables."
5. Revenue leaderboard (15s): "Which recruiter drives the most value."

### Technical Stakeholder
- Skip UI pages entirely
- Walk through API routes with `curl` commands
- Show `lib/revenue/types.ts`, `lib/screening/types.ts`, `lib/submission/types.ts` type definitions
- Explain tenant isolation architecture, no-schema-change principle, query-time computation model
