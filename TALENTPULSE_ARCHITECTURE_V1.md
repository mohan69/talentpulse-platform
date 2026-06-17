# TalentPulse Architecture V1

TalentPulse is an Agentic Talent Intelligence Operating System for recruitment agencies, staffing firms, executive search firms, GCCs, and enterprise hiring teams. It is not just an ATS. It is a one-stop operating layer for sourcing, engagement, evaluation, placement, knowledge retention, revenue intelligence, and hiring governance.

Core positioning:

TalentPulse helps organizations place or hire more candidates with fewer recruiters while preserving institutional hiring knowledge when recruiters leave.

## Architecture Principles

1. Build universal recruitment entities, not CareerPaths-specific workflows.
2. CareerPaths is only a design partner and validation case.
3. Everything customer-specific must be configurable by organization.
4. Agents recommend, generate, pre-fill, and monitor.
5. Humans approve consequential actions.
6. Every interaction must create institutional memory.
7. Every decision must capture why.
8. Every placement must connect to revenue, risk, and outcome.
9. Voice and WhatsApp are first-class interaction channels.
10. The system must support free and paid sourcing channels.
11. The system must support multiple model providers.
12. The system must support enterprise security and multi-tenant isolation.

## Core Entities

TalentPulse should model recruitment as a universal operating system using organization-configurable entities rather than fixed customer workflows.

### Organization

Represents a tenant. Every entity belongs to exactly one organization unless explicitly shared through controlled marketplace or partner features.

Key fields:

- `id`
- `name`
- `type`: agency, staffing firm, executive search, GCC, enterprise, RPO
- `region`
- `billing_plan`
- `security_policy`
- `data_retention_policy`
- `model_provider_policy`
- `created_at`
- `updated_at`

### Workspace

A configurable operating environment inside an organization. Large organizations may use workspaces for business units, geographies, clients, brands, or hiring teams.

Examples:

- Executive Search India
- US Contract Staffing
- GCC Hiring Team
- Client: Acme Corp

### User

A human user of the system.

Roles include:

- Recruiter
- Senior Recruiter
- Account Manager
- Delivery Manager
- Sourcer
- Interview Coordinator
- Hiring Manager
- Client Contact
- Finance User
- Organization Admin
- Super Admin

### Candidate

A universal person profile independent of any job. A candidate can be sourced, engaged, evaluated, submitted, hired, rejected, redeployed, or nurtured over time.

Key fields:

- Identity: name, emails, phones, location, time zone
- Profiles: LinkedIn, GitHub, Naukri, Foundit, portfolio, resume links
- Skills and capabilities
- Experience history
- Education
- Compensation expectations
- Availability and notice period
- Consent and communication preferences
- Source attribution
- Engagement history
- Evaluation history
- Memory summary
- Risk signals
- Revenue history

### Contact

A client, hiring manager, vendor contact, interviewer, referral source, or stakeholder.

Contacts should support:

- Organization relationship
- Role in hiring process
- Communication history
- Preferences
- Decision behavior
- Revenue influence

### Company

A company involved in the recruitment ecosystem.

Types:

- Client
- Candidate employer
- Vendor
- Partner
- Target sourcing company
- Competitor

### Job / Requirement

A hiring need. Agencies may call this a requirement, mandate, search, requisition, opening, role, or assignment. TalentPulse should support all labels through tenant configuration.

Key fields:

- Title
- Client or internal organization
- Hiring manager
- Location and work model
- Employment type
- Skills and competencies
- Compensation range
- Fee or commercial terms
- Priority
- SLA
- Submission rules
- Evaluation process
- Revenue potential
- Risk level
- Status

### Pipeline

The relationship between a candidate and a job.

Pipeline stages must be configurable by organization and workspace.

Examples:

- Sourced
- Screened
- Interested
- Submitted
- Client Review
- Interviewing
- Offered
- Joined
- Rejected
- Nurture

Every stage transition should capture:

- Actor
- Timestamp
- Reason
- Evidence
- Next action
- Agent recommendation, if applicable

### Submission

A formal candidate submission to a client, hiring manager, or internal role.

Tracks:

- Submitted profile version
- Submitted by
- Submission channel
- Client response
- Duplicate checks
- Ownership rules
- Commercial attribution

### Interview

Any structured interaction used to evaluate a candidate.

Types:

- Recruiter screen
- Technical screen
- Client interview
- Panel interview
- Executive interview
- Voice agent pre-screen
- WhatsApp qualification

### Offer

Captures commercial and compensation details.

Fields:

- Offered compensation
- Candidate expectation
- Joining date
- Acceptance status
- Counteroffer risk
- Dropout risk
- Approval history

### Placement / Hire

The final hiring or placement outcome.

Must connect to:

- Candidate
- Job
- Client or hiring organization
- Recruiter attribution
- Revenue
- Margin
- Invoice
- Guarantee period
- Replacement risk
- Outcome quality

### Activity

An immutable event stream of actions across the platform.

Examples:

- Call completed
- WhatsApp message sent
- Candidate moved to stage
- Agent generated summary
- User approved outreach
- Client rejected candidate
- Offer accepted

### Task

Human or agent-generated action item.

Examples:

- Call candidate
- Follow up with client
- Review AI shortlist
- Approve generated outreach
- Confirm salary expectation
- Resolve duplicate

### Decision

A first-class entity capturing important choices and their rationale.

Examples:

- Why a candidate was shortlisted
- Why a candidate was rejected
- Why a client role was deprioritized
- Why a candidate was submitted despite risk

Every decision must include:

- Decision
- Why
- Evidence
- Actor
- Timestamp
- Related entities
- Agent recommendation, if any

## Tenant Configuration

Everything customer-specific must be configured per organization or workspace.

### Configurable Objects

- Entity labels
- Pipeline stages
- Job types
- Candidate statuses
- Submission rules
- Ownership rules
- SLA rules
- Approval policies
- Scorecards
- Interview templates
- Outreach templates
- WhatsApp templates
- Voice scripts
- Memory policies
- Model provider policies
- Source channel policies
- Revenue rules
- Billing plans
- User roles and permissions

### Configuration Layers

Configuration should resolve in this order:

1. System defaults
2. Industry template
3. Organization configuration
4. Workspace configuration
5. Job-specific override
6. User preference, where allowed

### Industry Templates

Initial templates:

- Recruitment agency
- Staffing firm
- Executive search
- GCC hiring
- Enterprise TA
- RPO

CareerPaths should be represented as an organization configuration and validation case, not as a hard-coded product model.

## Memory Model

TalentPulse must preserve institutional hiring knowledge even when recruiters leave.

Memory is not a generic notes table. It is a structured, permissioned, explainable knowledge layer generated from every interaction.

### Memory Types

Candidate memory:

- Career goals
- Compensation preferences
- Availability
- Communication preferences
- Objections
- Motivators
- Risk signals
- Past submissions
- Interview feedback
- Offer history

Client memory:

- Hiring preferences
- Rejection patterns
- Interview style
- Compensation flexibility
- Decision speed
- Preferred candidate backgrounds
- No-go companies
- Preferred recruiters

Job memory:

- What profiles worked
- What profiles failed
- Hidden requirements
- Interview bottlenecks
- Market feedback
- Compensation mismatch

Recruiter memory:

- Sourcing patterns
- Conversion rates
- Client relationships
- Specialist domains
- Follow-up behavior

Organization memory:

- Institutional playbooks
- Market intelligence
- Client-specific patterns
- Pricing and margin lessons
- Source effectiveness

### Memory Capture

Every interaction should create memory candidates from:

- Calls
- WhatsApp messages
- Emails
- Notes
- Stage changes
- Rejections
- Submissions
- Interviews
- Offers
- Placements
- Billing outcomes

### Memory Lifecycle

1. Capture raw event.
2. Extract facts, preferences, decisions, and risks.
3. Classify memory type.
4. Link to entities.
5. Store evidence.
6. Apply confidence score.
7. Require human confirmation for sensitive or consequential facts.
8. Use memory in future recommendations.

### Memory Requirements

- Every memory must have source evidence.
- Every memory must have tenant ownership.
- Sensitive memory must support redaction and retention rules.
- Memory must be queryable by agents.
- Memory must be explainable in the UI.
- Users must be able to correct memory.

## Agent Framework

Agents are assistants that recommend, generate, pre-fill, monitor, and summarize. They do not autonomously perform consequential actions without approval.

### Agent Principles

- Agents operate within tenant policy.
- Agents must cite evidence.
- Agents must capture why.
- Agents must produce auditable outputs.
- Agents should degrade gracefully when model providers fail.
- Agents should support multiple model providers.
- Agents should separate recommendation from action.

### Core Agents

Sourcing Agent:

- Parses role requirements.
- Searches free and paid sources.
- Ranks candidates.
- Explains match reasons.
- Identifies source gaps.
- Suggests search expansions.

Screening Agent:

- Summarizes candidate fit.
- Generates screening questions.
- Runs voice or WhatsApp qualification flows.
- Flags risks and missing information.

Engagement Agent:

- Drafts outreach.
- Personalizes messages.
- Suggests follow-up timing.
- Monitors response patterns.

Submission Agent:

- Pre-fills submission notes.
- Generates client-facing summaries.
- Checks duplicates.
- Checks submission rules.
- Explains why a candidate should be submitted.

Interview Agent:

- Prepares interview briefs.
- Summarizes feedback.
- Detects decision signals.
- Tracks bottlenecks.

Offer Agent:

- Identifies offer risk.
- Suggests negotiation strategy.
- Tracks dropout signals.
- Summarizes compensation gaps.

Revenue Agent:

- Forecasts placement revenue.
- Detects stale high-value roles.
- Flags margin risks.
- Tracks recruiter productivity.

Memory Agent:

- Extracts institutional knowledge.
- Detects contradictions.
- Suggests memory updates.
- Highlights important historical context.

Admin Agent:

- Monitors usage.
- Flags security anomalies.
- Suggests configuration improvements.
- Tracks billing thresholds.

### Agent Orchestration

Agent runs should be represented as first-class records:

- `agent_run_id`
- Agent type
- Input context
- Model provider
- Prompt version
- Tools used
- Output
- Confidence
- Evidence
- Required approvals
- Human feedback
- Final action taken

## Human Approval Model

Humans approve consequential actions.

### Consequential Actions

Require approval by default:

- Sending external messages
- Submitting candidates
- Rejecting candidates
- Changing offer terms
- Updating compensation data
- Creating invoices
- Changing ownership
- Deleting or exporting sensitive data
- Bulk updates
- Updating confirmed memory

### Approval Levels

Level 0: No approval required.

- Draft generation
- Search recommendations
- Internal summaries
- Low-risk task creation

Level 1: User approval required.

- Send one message
- Save AI-generated note
- Update non-sensitive profile data

Level 2: Manager approval required.

- Candidate submission
- Offer changes
- Ownership override
- Bulk outreach

Level 3: Admin approval required.

- Data export
- Connector activation
- Billing changes
- Security policy changes

### Approval Record

Every approval stores:

- Proposed action
- Actor
- Approver
- Agent recommendation
- Why
- Evidence
- Timestamp
- Final executed action

## Security Model

TalentPulse must support enterprise security and multi-tenant isolation.

### Tenant Isolation

- Every row must include organization ownership.
- Workspace scoping must be enforced at query level.
- Cross-tenant access must be impossible by default.
- Shared records require explicit grants.
- Background jobs must include tenant context.
- Agent tool calls must be tenant-scoped.

### Identity and Access

Required capabilities:

- SSO / SAML / OIDC
- MFA
- Role-based access control
- Attribute-based access control
- Workspace-level permissions
- Field-level permissions
- Temporary access grants
- Service accounts

### Data Security

- Encryption at rest
- Encryption in transit
- Secret management
- Audit logs
- Data retention policies
- Data residency support
- PII redaction
- Export controls
- Consent tracking
- Right-to-delete workflows

### Agent Security

- Prompt injection defense
- Tool permission boundaries
- Tenant-scoped retrieval
- Model provider policy enforcement
- No cross-tenant memory leakage
- Sensitive data minimization
- Logged agent inputs and outputs

### Compliance Targets

Design toward:

- SOC 2
- ISO 27001
- GDPR
- DPDP Act readiness
- Enterprise auditability

## Connector Framework

TalentPulse must support free and paid sourcing channels, communication systems, calendars, CRMs, billing systems, and HR systems.

### Connector Types

Sourcing connectors:

- Candidate database
- Resume database
- Public web search
- GitHub
- LinkedIn public search
- Naukri public search
- Foundit public search
- Paid job board APIs
- Premium sourcing vendors

Communication connectors:

- Email
- WhatsApp
- Voice
- SMS
- Calendar

Business connectors:

- CRM
- ATS
- HRIS
- Payroll
- Invoicing
- Accounting

### Connector Principles

- Connectors are tenant-configured.
- Free and paid channels are both supported.
- Paid connectors are optional and policy-controlled.
- Connectors expose capability metadata.
- Connectors must report cost, rate limits, and data usage.
- Every sourced candidate must carry source attribution.

### Source Attribution

Every candidate discovery must track:

- Source
- Query
- Timestamp
- User or agent
- Cost
- Public or paid source
- Terms category
- Confidence
- Original URL or external ID

### Free Sourcing Strategy

Free channels should include:

- Internal database
- Uploaded resumes
- Public web search
- GitHub public API
- Public professional profile pages
- Publicly indexed Naukri and Foundit pages

The system must avoid implying access to paid databases unless a tenant explicitly configures and pays for those connectors.

## Voice and WhatsApp Architecture

Voice and WhatsApp are first-class interaction channels, not add-ons.

### Voice Architecture

Voice capabilities:

- Candidate screening calls
- Availability checks
- Interview reminders
- Offer follow-up
- Client intake calls
- Recruiter voice notes

Components:

- Telephony provider connector
- Speech-to-text
- Text-to-speech
- Call orchestration agent
- Consent and recording policy
- Transcript store
- Memory extractor
- Follow-up task generator

Voice flow:

1. Human selects or approves call objective.
2. Agent prepares call script.
3. Human approves script if external.
4. Call is placed or scheduled.
5. Transcript is captured.
6. Agent summarizes call.
7. Memory is extracted.
8. Human confirms sensitive facts.
9. Tasks and next steps are created.

### WhatsApp Architecture

WhatsApp capabilities:

- Candidate qualification
- Availability checks
- Document collection
- Interview scheduling
- Follow-ups
- Offer reminders
- Broadcasts with approval

Components:

- WhatsApp Business API connector
- Template manager
- Consent manager
- Conversation state engine
- Agent response generator
- Human handoff
- Memory extractor

WhatsApp rules:

- Approved templates for outbound messages where required.
- Human approval for consequential outreach.
- Opt-in and opt-out tracking.
- Conversation history linked to candidate and job.
- All meaningful replies create memory.

## Revenue Intelligence

Every placement must connect to revenue, risk, and outcome.

### Revenue Entities

Commercial terms:

- Fee type
- Fee percentage
- Fixed fee
- Contract margin
- Currency
- Payment terms
- Guarantee period

Revenue forecast:

- Pipeline value
- Probability weighted value
- Expected close date
- Recruiter attribution
- Client attribution
- Risk adjustment

Invoice:

- Placement
- Amount
- Tax
- Due date
- Payment status
- Guarantee holdback

### Revenue Intelligence Use Cases

- Forecast revenue by recruiter, team, client, job, and source.
- Identify high-value stale roles.
- Detect low-margin placements.
- Predict offer dropout risk.
- Track source ROI.
- Track recruiter productivity.
- Connect placement quality to revenue.
- Identify clients with poor conversion economics.

### Outcome Intelligence

Track:

- Joined or no-show
- Retention past guarantee
- Replacement required
- Client satisfaction
- Candidate satisfaction
- Time to submit
- Time to interview
- Time to offer
- Time to join
- Revenue realized

## Billing and Super Admin

TalentPulse requires platform-level administration separate from tenant administration.

### Billing Model

Supported billing dimensions:

- Seats
- Active recruiters
- Active candidates
- Agent runs
- Voice minutes
- WhatsApp conversations
- Resume parsing volume
- Connector usage
- Storage
- Premium model usage
- Premium sourcing connectors

### Billing Entities

- Plan
- Subscription
- Usage meter
- Invoice
- Payment status
- Credit balance
- Add-on
- Overage policy

### Super Admin Capabilities

Super admins can:

- Manage tenants
- Configure plans
- View usage
- Suspend tenants
- Manage connector availability
- Manage model provider availability
- Monitor system health
- Review audit logs
- Configure global templates
- Manage feature flags

Super admins must not access tenant data unless explicitly authorized through a break-glass workflow.

### Break-Glass Access

Requirements:

- Justification required
- Time-limited
- Tenant-visible audit record
- Elevated approval
- Full activity logging

## Multi-Model Provider Architecture

TalentPulse must support multiple model providers.

### Provider Abstraction

Supported provider classes:

- OpenAI
- Anthropic
- Google
- Azure OpenAI
- OpenRouter
- Local or private models

### Model Policy

Configured per organization:

- Allowed providers
- Default provider
- Data retention requirements
- PII restrictions
- Cost limits
- Use-case routing
- Fallback provider

### Model Routing

Examples:

- Fast low-cost model for classification
- Strong reasoning model for candidate comparison
- Speech model for voice transcription
- Embedding model for memory retrieval
- Tenant private model for sensitive customers

## Milestone Implementation Plan

### Milestone 1: Universal Data Foundation

Goals:

- Define organization, workspace, user, candidate, company, contact, job, pipeline, activity, task, decision, placement.
- Add tenant-scoped data model.
- Add configurable labels and pipeline stages.
- Add audit trail.

Outcome:

TalentPulse becomes a universal recruiting system, not a hard-coded workflow.

### Milestone 2: Candidate and Job Operating Layer

Goals:

- Candidate profile management.
- Job and requirement management.
- Pipeline tracking.
- Submission tracking.
- Decision capture.
- Configurable stage transitions.

Outcome:

Recruiters can run day-to-day recruitment operations.

### Milestone 3: Institutional Memory

Goals:

- Activity-based memory extraction.
- Candidate, client, job, recruiter, and organization memory.
- Evidence-linked memory.
- Memory correction and confirmation.
- Memory retrieval in candidate and job workflows.

Outcome:

Recruiting knowledge survives employee turnover.

### Milestone 4: Agentic Assistance

Goals:

- Sourcing Agent.
- Screening Agent.
- Engagement Agent.
- Submission Agent.
- Memory Agent.
- Human approval queue.
- Agent run audit records.

Outcome:

Recruiters do more work with fewer manual steps while retaining approval control.

### Milestone 5: Free and Paid Connector Framework

Goals:

- Connector registry.
- Free sources: internal DB, resumes, public web, GitHub, public profile search.
- Paid connector slots.
- Source attribution.
- Cost tracking.
- Rate limit handling.

Outcome:

Organizations can source through affordable channels first and add paid channels only when justified.

### Milestone 6: Voice and WhatsApp

Goals:

- WhatsApp Business integration.
- Voice provider integration.
- Transcript capture.
- Consent handling.
- Conversation memory.
- Human handoff.
- Approval-controlled outbound flows.

Outcome:

Recruiters can operate through the channels candidates actually use.

### Milestone 7: Revenue Intelligence

Goals:

- Commercial terms.
- Placement revenue.
- Forecasting.
- Invoice tracking.
- Source ROI.
- Risk-adjusted pipeline.
- Recruiter productivity analytics.

Outcome:

Hiring activity connects directly to business outcomes.

### Milestone 8: Enterprise Security

Goals:

- SSO.
- MFA.
- RBAC and ABAC.
- Field-level permissions.
- Data retention.
- Audit exports.
- Break-glass access.
- Model provider policy controls.

Outcome:

TalentPulse is enterprise-ready.

### Milestone 9: Billing and Super Admin

Goals:

- Plan management.
- Usage metering.
- Subscription management.
- Tenant management.
- Feature flags.
- Connector controls.
- Platform health monitoring.

Outcome:

TalentPulse can operate as a scalable SaaS platform.

### Milestone 10: Optimization and Intelligence Layer

Goals:

- Placement quality analytics.
- Client conversion intelligence.
- Dropout prediction.
- Recruiter coaching.
- Source ROI optimization.
- Automated playbook recommendations.

Outcome:

TalentPulse becomes an intelligence operating system, not just workflow software.

