# CareerPaths Demo Readiness Checklist

> Print this. Tick boxes. Do not start the demo until all items in **Section 11** pass.

---

## 1. Demo Objective

- [ ] **Primary goal:** Get CareerPaths to commit to a 3-month paid pilot (₹50K/month)
- [ ] **Secondary goal:** Identify 1–2 power-user recruiters to champion adoption
- [ ] **Success signal:** John says "Let's set up the pilot" or asks concrete next-step questions
- [ ] **Walk-away signal:** John raises the same objection 3+ times without resolution

**Demo type:** 5-min executive (John) / 15-min deep (John + recruiters) / 2-min elevator / technical

---

## 2. Demo User Credentials

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| Admin | `admin@talentpulse.demo` | `demo123` | Main demo account — shows all data |
| Recruiter 1 | `recruiter1@talentpulse.demo` | `demo123` | Has pipeline activity, applications |
| Recruiter 2 | `recruiter2@talentpulse.demo` | `demo123` | Lower activity — shows leaderboard contrast |

**CareerPaths real credentials (for reference — do not use in demo unless asked):**

| Role | Email | Password |
|------|-------|----------|
| Admin | `john.sagayaraj@careerpathsindia.com` | `john123` |
| Recruiter | `priya@careerpathsindia.com` | `recruiter123` |

- [ ] Admin login tested < 1 hour before demo
- [ ] Recruiter 1 login tested < 1 hour before demo
- [ ] Both passwords confirmed working

---

## 3. Demo Dataset Readiness

### Seed Data Verification

- [ ] `npx prisma db seed` completes in under 60 seconds
- [ ] 3 users exist (admin + 2 recruiters)
- [ ] 5 clients exist (TechCorp, FinServe, HealthPlus, RetailMax, EduGlobal)
- [ ] 5 requisitions visible (SAP Program Manager, Oracle SCM Consultant, AI Solutions Architect, Salesforce Lead, Data Engineer)
- [ ] 28 candidates visible in Talent Repository
- [ ] 28 applications distributed across stages (at least 1 in each of: NEW, AI_SCREENING, REVIEWED, SUBMITTED, INTERVIEW_SCHEDULED, OFFER_EXTENDED)
- [ ] At least 1 candidate with matchScore >= 80
- [ ] At least 1 candidate with matchScore < 50
- [ ] At least 1 interview with COMPLETED + PROCEED outcome
- [ ] At least 1 interview with REJECT outcome
- [ ] At least 1 offer with EXTENDED status (>14 days old for at-risk demo)
- [ ] At least 1 offer with ACCEPTED status

### Build Verification

- [ ] `npm run build` passes with zero errors
- [ ] `npm run dev` starts without warnings
- [ ] Browser console shows zero errors at every screen

### Environment

- [ ] `.env` has `DATABASE_URL` pointing to a reachable PostgreSQL
- [ ] `.env` has `NEXTAUTH_SECRET` set
- [ ] `.env` has `OPENROUTER_API_KEY` set (for live Copilot)
- [ ] `.env` has `TENANT_ENFORCEMENT_MODE=observe` (unless enforcing)
- [ ] `.env` has `REVENUE_INTELLIGENCE_ENABLED=true`
- [ ] `.env` has `SUBMISSION_INTELLIGENCE_ENABLED=true`
- [ ] `.env` has `INSTITUTIONAL_MEMORY_ENABLED=true`
- [ ] `.env` has `CONVERSATION_INSIGHTS_ENABLED=true`
- [ ] `.env` has `SCREENING_INTELLIGENCE_ENABLED=true`

---

## 4. Screens to Show

### Must-Show (5-min demo)

- [ ] **Login page** — `/login`, enter credentials, smooth redirect to dashboard
- [ ] **Admin dashboard** — `/admin` — stat cards show non-zero values (Open Jobs, Pipeline, Interviews, Prospects)
- [ ] **Pipeline Kanban** — Navigate: Jobs → click "SAP Program Manager" → Pipeline tab → 6+ candidate cards in lanes with match scores visible
- [ ] **Candidate profile** Click a high-match candidate → full profile: AI summary, skills, CTC, experience, notes
- [ ] **Recruiter Copilot** — `/admin/copilot` — Click "Generate interview questions" → response appears
- [ ] **Revenue leaderboard** — Navigate to `/api/revenue/leaderboard` in browser — JSON with 2+ recruiters ranked, scores, badges

### Should-Show (15-min demo)

- [ ] **Recruiter dashboard** — Login as `recruiter1` → `/recruiter` — personal metrics
- [ ] **Submission package** — `/api/submission/package?applicationId=<id>` — JSON with fit-gap, risk disclosure, email draft, tracker row
- [ ] **Screening workbench** — `/api/screening/workbench?applicationId=<id>` — Facts, gaps, risks, readiness score
- [ ] **Conversation timeline** — `/api/conversations/timeline?candidateId=<id>` — Chronological entries with insights
- [ ] **Revenue dashboard** — `/api/revenue/dashboard` (as admin) — KPI cards, top prospects, client health
- [ ] **Revenue opportunity** — `/api/revenue/opportunity` — Realized, pipeline (weighted), at-risk breakdown
- [ ] **Client profitability** — `/api/revenue/clients` — Engagement health, churn risk per client
- [ ] **Source effectiveness** — `/api/revenue/sources` — Funnel per source with ROI label
- [ ] **Placement probability** — `/api/revenue/placement/<appId>` — Base + 8 modifier signals
- [ ] **Memory timeline** — `/api/memory/timeline` — Activity log entries with entity/action/metadata
- [ ] **Productivity score** — `/api/revenue/productivity?recruiterId=<id>` — 5 dimensions

### Stub Page Alert

- [ ] `/admin/sourcing-intelligence` — minimal content. **Skip or say "in development"**
- [ ] `/admin/copilot` — UI is real (`CopilotClient` component), but no dedicated admin-copilot page content beyond the component. It works — show it.

---

## 5. APIs to Validate

Run these curl commands or paste URLs directly in browser (Next.js renders JSON for route handlers):

- [ ] `GET /api/revenue/dashboard` — returns `{ metrics: {...}, topProspects: [...], ... }`
- [ ] `GET /api/revenue/leaderboard` — returns array of 2+ recruiters with `compositeScore`, `badges`
- [ ] `GET /api/revenue/productivity?recruiterId=<id>` — returns 5-dimension score
- [ ] `GET /api/revenue/opportunity` — returns `realized`, `pipeline`, `atRisk` revenue
- [ ] `GET /api/revenue/clients` — returns array with `engagementHealth`, `churnRisk`
- [ ] `GET /api/revenue/sources` — returns per-source funnel + ROI classification
- [ ] `GET /api/revenue/placement/<applicationId>` — returns `baseProbability`, `modifiers`, `adjustedProbability`
- [ ] `GET /api/screening/workbench?applicationId=<id>` — returns `facts`, `gaps`, `risks`, `readiness`
- [ ] `GET /api/submission/package?applicationId=<id>` — returns `candidate`, `job`, `fitGap`, `riskDisclosure`, `emailDraft`, `trackerRow`
- [ ] `GET /api/conversations/timeline?candidateId=<id>` — returns chronological entries
- [ ] `GET /api/memory/timeline` — returns array of activity log entries
- [ ] `GET /api/copilot/chat` — returns 200 (test with body `{ "message": "hello", "context": {} }`)

> **Heads-up:** `/api/copilot/chat` is a POST endpoint. Test with Postman, curl, or the built-in Copilot UI component. Direct browser navigation will fail.

---

## 6. Backup Screenshots (If App Fails)

Capture these screenshots when the app IS working. Store them in a slide deck or a local folder for offline demo.

- [ ] Screenshot: Admin dashboard with stat cards
- [ ] Screenshot: Pipeline Kanban with candidate cards in lanes
- [ ] Screenshot: Candidate profile (AI summary, skills, CTC visible)
- [ ] Screenshot: Copilot with generated response
- [ ] Screenshot: Revenue leaderboard JSON (formatted, in browser)
- [ ] Screenshot: Submission package JSON (fit-gap + risks + email)
- [ ] Screenshot: Screening workbench JSON (facts + gaps + risks + readiness)
- [ ] Screenshot: Revenue dashboard JSON
- [ ] Screenshot: Conversation timeline JSON
- [ ] Screenshot: Login page with TalentPulse branding

### Fallback Order

1. **Live app + live AI** — Best case, full experience
2. **Live app + no AI** — Skip Copilot, show everything else (screening, submission, revenue work without AI)
3. **Screenshots only** — App is down, show slide deck, demonstrate Copilot via direct API curl if available
4. **Paper walkthrough** — Print API contracts and screenshots, walk through architecture

---

## 7. 5-Minute Talk Track

| Time | What You Do | What You Say |
|------|------------|--------------|
| 0:00 | Navigate to `/login`, enter admin creds | "This is TalentPulse — your talent intelligence command center. Built on your existing CareerPaths data, zero migration needed." |
| 0:30 | Point at stat cards on `/admin` | "At a glance: 5 open requisitions, 28 candidates in pipeline, 3 interviews this week, 1 offer extended. Real-time pipeline health." |
| 1:00 | Click into a job → Pipeline tab | "Every candidate is AI-screened. Match scores, skill gaps, readiness assessments — computed in seconds. SAP Program Manager has 6 screened candidates with a 92% top match." |
| 1:45 | Open `/admin/copilot`, click "Generate questions" | "Your recruiter copilot. Generate interview questions, write outreach emails, analyze job descriptions, score matches. One click, instant response." |
| 2:30 | Navigate to `/api/submission/package?...` in same tab | "When you find a match, TalentPulse generates a complete submission package — fit-gap explanation, risk disclosure, email draft, tracker row. Client-ready in one click." |
| 3:30 | Navigate to `/api/revenue/leaderboard` | "Every recruiter's productivity scored across 5 dimensions. Pipeline revenue projected. Client profitability signalled. Your business intelligence — no spreadsheets." |
| 4:00 | Navigate to `/api/screening/workbench?...` | "Deep screening: facts, missing info gaps, risk signals — counter-offer, notice period, no-show risk — readiness score, and recommended next actions." |
| 4:30 | Close laptop, make eye contact | "This is live today. Your data, your org, your workflow. We can set up a pilot with your recruiters this week." |

**If they interrupt with questions:** Pause the script. Answer. Then resume from the next section or offer to move to the 15-minute deep dive.

---

## 8. 15-Minute Talk Track

| Time | What You Do | What You Say |
|------|------------|--------------|
| 0:00 | Login as `recruiter1` | "This is what your recruiters see. Their open requisitions, their pipeline, their upcoming interviews — all personalised." |
| 0:30 | Click into a job → Pipeline tab, filter, drill | "Walk through job details → candidate list → match scores → filter by stage → drill into a profile. 11 pipeline stages from New to Joined." |
| 2:00 | Open candidate profile | "Complete dossier. AI summary, skill tags, experience timeline, CTC expectations, education, project history, team notes." |
| 4:00 | Copilot: run 4 prompts | "Generate interview questions → Write outreach email → Score this candidate → Suggest LinkedIn message. 15 minutes of work done in 30 seconds." |
| 6:00 | Open Pipeline → show submission package | "Click Submit. One-click generates: fit-gap explanation, risk disclosure, email draft, tracker row. 35 minutes → 3 minutes." |
| 8:00 | Show conversation timeline | "Unified view: voice screening notes, WhatsApp messages, recruiter notes, emails — all in one place with extracted insights and follow-up tasks." |
| 9:30 | Show screening workbench | "Facts → missing info gaps → risk signals with severity → readiness score → recommended questions for client interview." |
| 11:00 | Show revenue leaderboard + dashboard | "Priya's 5-dimension productivity score. Her rank. Her pipeline revenue. Client profitability signals. The business intelligence layer." |
| 12:30 | Show memory timeline, confirm/correct | "Every action captured. Recruiters confirm, correct, or dismiss entries. The platform learns from feedback." |
| 14:00 | Open for Q&A | "Questions? I want to hear what matters most to your team." |

---

## 9. Pricing / Pilot Proposal

Have these numbers memorised or on a single index card. Do not read from a spreadsheet.

### Pilot Terms

- **Duration:** 3 months
- **Users:** Up to 5 (all CareerPaths recruiters + John)
- **Fee:** ₹50,000/month ($600) — 75% off target price
- **Support:** Weekly call + Slack channel + email

### Target Production Pricing

| Tier | Users | Price |
|------|-------|-------|
| Starter | ≤5 | ₹1L/month ($1,200) |
| Growth | ≤20 | ₹3L/month ($3,600) |
| Enterprise | Unlimited | Custom |

### Pilot Exit Options

- **Convert** to paid at end of Month 3
- **Extend** 1–2 months at same pilot fee if more validation needed
- **No-go** — CareerPaths walks away, data exported, no penalty

### Key Numbers to Drop

- Time savings per recruiter: **~13 hours/week** (87%)
- Equivalent headcount reclaimed: **3.5 recruiters** for a team of 4
- Additional annual revenue: **₹33.5L ($40K)** from 50% more placements
- Breakeven: **Month 1** (one additional placement covers platform cost)
- Year 1 net ROI: **₹9.5L positive** after platform cost

---

## 10. Questions to Ask CareerPaths

Ask these during Q&A to gauge readiness and uncover objections.

### Discovery Questions

1. "How do your recruiters currently screen candidates? What takes the most time?"
2. "How long does a typical client submission take to prepare?"
3. "Do you currently track recruiter productivity? How?"
4. "Which sourcing channel gives you your best placements today?"
5. "How do you know when a client is at risk of leaving?"

### Pilot Readiness Questions

6. "If we set up a pilot starting next week, which 1–2 recruiters would be the best champions to start with?"
7. "What data would you want us to migrate first — open requisitions, active candidates, or both?"
8. "How do you currently handle client submissions? Is there a template we should match?"
9. "What would make this a 'must-have' vs a 'nice-to-have' for your team?"

### Objection-Handling Scripts

| Objection | Response |
|-----------|----------|
| "Our recruiters are too busy to learn a new tool" | "That's exactly why we built this — to save them 13 hours a week. One hour of onboarding saves 13 hours every week after. We start with just one power-user." |
| "We already use an ATS" | "TalentPulse works alongside your existing workflow, not as a replacement. Think of it as an AI intelligence layer on top of your current process." |
| "₹50K/month is steep for a pilot" | "At ₹50K/month, you need one extra placement per quarter to break even. Our model shows 12 additional placements per year for a team of 4. The pilot pays for itself in month one." |
| "We need to see it with our own data" | "Absolutely. The pilot includes migrating your real data — candidates, jobs, clients — so you see TalentPulse working with CareerPaths' actual pipeline." |
| "Who else is using this?" | "You'd be our first design partner — which means you shape the roadmap. Development priority goes to your requests first." |

---

## 11. Go / No-Go Before Demo

**Do not start the demo unless ALL of these pass:**

### Hard Gates (All Must Pass)

- [ ] `npm run build` passes with zero errors
- [ ] `npm run dev` starts and serves `/login` successfully
- [ ] `admin@talentpulse.demo` / `demo123` login succeeds
- [ ] Admin dashboard loads stat cards with non-zero values
- [ ] At least 1 job page loads with Pipeline tab showing candidate cards
- [ ] At least 1 candidate profile renders fully
- [ ] `/api/revenue/leaderboard` returns JSON with 2+ entries
- [ ] Backup screenshots captured (all 10 from §6)
- [ ] Demo laptop battery ≥ 80% OR plugged in
- [ ] Screen resolution set to 1920×1080 (or window maximised)
- [ ] Presentation mode / Do Not Disturb enabled (no notifications)

### Soft Gates (Should Pass, But Can Demo Without)

- [ ] Copilot generates a live response from OpenRouter
- [ ] `/api/screening/workbench` returns data
- [ ] `/api/submission/package` returns data
- [ ] `/api/conversations/timeline` returns data

### Decision

- **GO** — All hard gates pass → start demo
- **NO-GO (hardware/database)** — Hard gates fail → switch to screenshots + architecture walkthrough. Do not attempt live demo.
- **NO-GO (AI only)** — Only Copilot fails → demote to "no AI" variation. Still proceed.
- **NO-GO (time)** — Less than 15 minutes before meeting end → offer 2-min elevator or reschedule.

### Post-Demo Checklist

- [ ] Capture John's verbal reaction and key quotes
- [ ] Note which feature generated the most excitement
- [ ] Note which objection was raised most persistently
- [ ] Send follow-up email within 2 hours with:
  - Link to running demo instance (if available)
  - Pilot proposal summary (1 page)
  - Proposed pilot kickoff date
- [ ] Set next meeting: pilot kickoff (60 min, within 1 week)
- [ ] Update anchored summary with demo outcome
