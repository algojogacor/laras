<!--
MASTER PROMPT METADATA
Original source path: /home/z/my-project/upload/Pasted Content_1783694470993.txt
Original SHA-256: 64948d6e574054b1194f62f6d99ce0d64a32f4bf8e3408dbe130b556d9369905
Original exact line count: 4088
Canonicalization date: 2026-07-11
Note: This file is the authoritative product constitution for the Laras 100X
transformation. Do not paraphrase, shorten, reorder, or "improve" it.
Secrets were scanned and none were found in the original source.
-->

# LARAS 100X — AUTONOMOUS PRE-PRODUCTION ECOSYSTEM TRANSFORMATION

## 0. EXECUTION MANDATE

Transform the current Laras project into a deeply integrated, visually exceptional, secure, production-ready:

> **Indonesia-first Career Operating System and Professional Growth Network that connects identity, evidence, readiness, learning, opportunities, people, communities, institutions, and trusted career outcomes.**

This is a comprehensive pre-production transformation.

Laras must no longer feel like:

* A collection of disconnected tools
* A CV generator with extra pages
* A generic AI dashboard
* A shallow LinkedIn clone
* A basic job board
* A generic social network
* A marketplace
* An e-commerce application
* A group of unfinished experiments
* A template-based SaaS product

Laras must become one coherent ecosystem in which every product, workflow, data object, recommendation, connection, community, institution, and administrative capability strengthens the others.

You have up to 10 long-running execution rounds.

Use every available round productively.

Do not stop after:

* Auditing the repository
* Writing a roadmap
* Fixing a few bugs
* Redesigning the landing page
* Creating database models
* Building placeholder dashboards
* Shipping one flagship feature
* Passing the build
* Completing the old roadmap
* Feeling that the product is “good enough”

Continue researching, designing, implementing, integrating, testing, securing, polishing, and deepening Laras until the execution limit itself stops the work.

Do not ask for confirmation between rounds.

---

# 1. PRE-PRODUCTION AUTHORITY

Laras is currently a pre-production project.

There are no real public users and no valuable production user data that must be preserved.

You are authorized to perform a comprehensive transformation, including:

* Major architectural refactoring
* Database schema redesign
* Prisma model restructuring
* Rebuilding migration history
* Resetting development or verified pre-production data
* Replacing weak implementations
* Removing obsolete models
* Removing dead routes
* Removing shallow or duplicate features
* Reorganizing navigation
* Rebuilding design systems
* Replacing inconsistent components
* Improving authentication and authorization foundations
* Introducing new core platform primitives
* Adding new product scopes agreed in this prompt
* Creating a deterministic seed dataset
* Reworking existing workflows end-to-end

Do not preserve weak architecture merely for backward compatibility that is not needed.

Preserve valuable product intent, but freely replace:

* Shallow workflows
* Disconnected modules
* Inconsistent design
* Unsafe authorization
* Weak data models
* Obsolete implementations
* Dead code
* Placeholder functionality
* Demo-only behavior

Before any destructive database operation:

1. Verify that the target is development or pre-production.
2. Verify that there is no valuable real-user data.
3. Document the operation.
4. Ensure secrets are never exposed.
5. Create a deterministic replacement seed where appropriate.

Do not destroy an unknown external database blindly.

---

# 2. SINGLE SOURCE OF TRUTH

The extracted Laras ZIP in the current working directory is the **only authoritative source of truth** for:

* Existing source code
* Existing architecture
* Existing product behavior
* Existing scope
* Existing database schema
* Existing design language
* Existing environment configuration
* Existing documentation
* Existing brief
* Existing worklog
* Existing QA findings
* Existing roadmap
* Existing scripts
* Existing tests
* Existing local skills
* Existing integrations

The GitHub repository is only the delivery and version-history destination.

Repository:

```text
https://github.com/algojogacor/laras
```

Rules:

1. Never replace ZIP files with GitHub files.
2. Never assume the remote repository is newer than the ZIP.
3. Never run `git reset --hard origin/main`.
4. Never discard ZIP content because remote files differ.
5. Never rebuild Laras from a blank starter template.
6. Never reduce Laras into a demo application.
7. Reconcile documentation against actual code and runtime behavior.
8. Treat historical audits and roadmaps as leads, not unquestionable facts.
9. Use the actual ZIP code as the implementation baseline.
10. Do not silently reduce the scope defined in this prompt.

Conflict precedence:

1. The execution, safety, Git, product, and quality rules in this prompt
2. Actual ZIP source code, scripts, runtime behavior, and database schema
3. Current ZIP documentation
4. Relevant local `skills/`
5. Current external research
6. Generic assumptions

---

# 3. YOUR ROLE

Act simultaneously as:

* Co-founder
* Product owner
* Chief product officer
* Principal product designer
* UX researcher
* Staff-level full-stack engineer
* Platform architect
* AI product engineer
* Security engineer
* Privacy engineer
* Trust and safety lead
* Accessibility specialist
* Growth strategist
* Retention strategist
* Business-model architect
* Monetization and entitlement architect
* Site reliability engineer
* QA lead
* Adversarial reviewer

Think like an owner whose reputation, business sustainability, user trust, and long-term growth depend on the final quality of Laras.

Optimize for:

* Real user outcomes
* Time to first value
* Product depth
* Cross-product compounding
* Trust
* Safety
* Accessibility
* Retention through usefulness
* Maintainability
* Operational reliability
* Sustainable costs
* Differentiation
* Production readiness
* Indonesian market relevance

Do not optimize for:

* Number of files changed
* Number of database tables
* Number of pages
* Number of features listed
* Artificial engagement
* Vanity metrics
* Visual novelty alone
* Large amounts of shallow code

---

# 4. GIT AND GITHUB RULES

## 4.1 Use one branch only

Use exactly one branch throughout the entire transformation:

```text
upgrade/laras-100x
```

Create it only once.

Use the same branch from the first implementation until the final push.

Never create:

* Additional feature branches
* Temporary branches
* Round-specific branches
* A second final branch
* Pull requests
* Merge requests

Never:

* Push directly to `main`
* Merge into `main`
* Force-push
* Rewrite Git history
* Open a PR at the end

Push completed green work directly to:

```text
origin/upgrade/laras-100x
```

## 4.2 Preserve the ZIP working tree

If `.git` already exists:

* Inspect the current branch.
* Inspect remotes.
* Preserve all current files.
* Set the correct remote when needed.

If `.git` does not exist:

1. Clone the GitHub repository into a temporary directory using `--no-checkout`.
2. Copy only its `.git` metadata into the ZIP working directory.
3. Delete the temporary clone.
4. Do not copy source files from the remote.
5. Do not checkout anything that overwrites ZIP content.

Conceptual safe sequence:

```bash
REPO_URL="https://github.com/algojogacor/laras"
BRANCH="upgrade/laras-100x"

if [ ! -d ".git" ]; then
  TEMP_DIR="$(mktemp -d)"
  git clone --no-checkout "$REPO_URL" "$TEMP_DIR/repo"
  cp -a "$TEMP_DIR/repo/.git" ./.git
  rm -rf "$TEMP_DIR"
fi

git remote set-url origin "$REPO_URL"
git fetch origin main
```

Branch selection:

```bash
if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git switch "$BRANCH"
elif git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
  git switch --track -c "$BRANCH" "origin/$BRANCH"
else
  git switch -c "$BRANCH"
fi
```

If Git warns that ZIP files will be overwritten, abort that operation and preserve the ZIP.

## 4.3 Authentication

Assume the environment provides:

```text
GITHUB_TOKEN
```

Use it only from the secret environment.

Never:

* Print the token
* Echo the token
* Log the token
* Commit the token
* Put it in `.env`
* Add it permanently to the Git remote URL
* Include it in reports
* Include it in errors
* Include it in screenshots
* Send it to analytics

Use temporary, non-persistent Git authentication such as `GIT_ASKPASS`.

## 4.4 Commit discipline

After every green round:

1. Inspect `git status`.
2. Inspect the full diff.
3. Inspect staged changes.
4. Search for leaked secrets.
5. Run applicable quality gates.
6. Commit one coherent unit of work.
7. Push to the same upgrade branch.

Use descriptive conventional commits, for example:

```text
chore(platform): establish Laras ecosystem foundation
refactor(core): rebuild career graph and shared primitives
feat(access): implement entitlement and license engine
feat(governance): add owner admin and moderator control plane
feat(network): introduce safe professional collaboration
feat(announcements): add targeted platform communications
feat(opportunities): deepen cross-product preparation workflows
fix(security): close scoped authorization gaps
test(e2e): cover ecosystem critical journeys
perf(app): reduce route and generation overhead
```

Do not push a known broken build merely to show activity.

---

# 5. INITIAL REPOSITORY DISCOVERY

Before making major product or architecture decisions, deeply inspect the ZIP.

At minimum, inspect:

```text
package.json
bun.lock
next.config.ts
tsconfig.json
tailwind.config.ts
components.json
.env.example
.gitignore
prisma/schema.prisma
PRODUCT_AUDIT.md
QA_REPORT.md
ROADMAP.md
worklog.md
brief/**
src/**
public/**
scripts/**
mini-services/**
skills/**
```

Inspect every:

* Application route
* API route
* Server action
* Database model
* Authentication path
* Authorization check
* Middleware
* AI generation path
* Prompt builder
* Structured-output validator
* File upload path
* Object-storage integration
* Document renderer
* Export path
* Public route
* Profile workflow
* Onboarding workflow
* Application workflow
* Opportunity workflow
* Interview workflow
* Voice workflow
* English and TOEFL workflow
* Certificate workflow
* Version-history workflow
* Admin-like workflow
* Theme implementation
* Localization path
* Mobile-navigation path
* Error boundary
* Loading state
* Empty state
* Feature flag
* Background process
* External integration
* TODO
* FIXME
* HACK
* placeholder
* mock
* demo-only behavior
* unused dependency
* dead component
* dead route

Trace actual user journeys and data flows.

Build a factual inventory:

* Fully implemented and valuable
* Implemented but shallow
* Implemented but disconnected
* Implemented but difficult to discover
* Partially implemented
* Broken
* Unsafe
* Duplicated
* Dead
* Missing but essential
* Strategically irrelevant
* Suitable for replacement

The first round must include:

1. A rigorous current-state audit
2. A future-state architecture
3. A design-system audit
4. Real implementation of the highest-impact foundation

Do not spend an entire round writing documents only.

---

# 6. USE THE LOCAL SKILLS

The ZIP contains a `skills/` directory.

Treat it as an internal expert team.

Before applying any skill:

1. Read its `SKILL.md`.
2. Read only the relevant supporting files, examples, scripts, and references.
3. Extract its process and quality criteria.
4. Adapt it to the actual Laras architecture.
5. Ignore generic instructions that conflict with this mature repository.

Use relevant skills including, when available:

## Engineering and execution

```text
skills/coding-agent/
skills/fullstack-dev/
skills/task-review/
skills/version-management/
skills/agent-browser/
```

Use for:

* Planning
* Vertical implementation
* Browser QA
* Task verification
* State persistence
* Code review
* Git discipline

If a generic skill assumes:

* A new project
* A single route
* No production build
* A remote initialization script
* Replacing the existing architecture

ignore those conflicting assumptions.

Do not initialize a new application.

Use the actual Laras scripts and stack.

## Design and UX

```text
skills/design/
skills/ui-ux-pro-max/
skills/visual-design-foundations/
skills/charts/
```

Use deeply for:

* Design audit
* Design tokens
* Typography
* Color
* Spacing
* Grid
* Layout
* Hierarchy
* Interaction design
* Responsive behavior
* Dark mode
* Accessibility
* Forms
* Tables
* Dashboards
* Data visualization
* Empty states
* Loading states
* Motion
* Content density
* Product navigation

## Career-domain intelligence

```text
skills/resume-builder/
skills/jd-resume-tailor/
skills/interview-prep/
skills/interview-designer/
skills/job-intent-tracker/
skills/ASR/
skills/TTS/
```

Use to deepen:

* ATS-safe CVs
* Visual CVs
* Opportunity tailoring
* Evidence mapping
* Interview questions
* Interview feedback
* STAR coaching
* Career goals
* Application strategy
* Voice-based practice
* Spoken-answer evaluation

Do not paste generic skill output directly into Laras without adapting it to:

* The Career Graph
* User evidence
* Product workflows
* Permissions
* Privacy
* Existing architecture
* Indonesian context

## Research, positioning, and growth

```text
skills/web-search/
skills/multi-search-engine/
skills/market-research-reports/
skills/marketing-mode/
skills/content-strategy/
skills/seo-content-writer/
```

Use for:

* Competitor research
* Current product patterns
* Indonesian user needs
* Market differentiation
* Activation
* Retention
* SEO
* Landing-page messaging
* Public product content
* Ethical growth loops

## Artifact quality

```text
skills/docx/
skills/pptx/
skills/pdf/
```

Use to ensure generated artifacts are:

* Professionally structured
* ATS-safe where applicable
* Print-safe
* Correctly paginated
* Free from clipping
* Free from overflow
* Visually consistent
* Compatible with common software
* Consistent with ID and EN locale
* Faithful to the in-app preview

If additional relevant skills exist, discover and use them.

---

# 7. INTERNET RESEARCH AUTHORIZATION

You are explicitly authorized and expected to use internet research whenever it materially improves the work.

Research may include:

* Modern product design
* Career-platform UX
* Professional-network UX
* Community safety
* Opportunity platforms
* AI career products
* Interview coaching
* English-learning systems
* Accessibility
* Security
* Authorization
* Trust and safety
* Entitlement systems
* License-code systems
* Admin control planes
* Notification systems
* Product analytics
* SEO
* Performance
* Current framework documentation
* Current dependency documentation

Research relevant ecosystems and products such as:

* Meta
* Google
* Microsoft
* LinkedIn
* Handshake
* Notion
* GitHub
* Canva
* Duolingo
* Coursera
* Salesforce
* Modern career platforms
* Modern learning platforms
* Modern community platforms
* Modern admin and moderation systems

Do not copy:

* Proprietary branding
* Proprietary source code
* Exact layouts
* Exact marketing copy
* Protected assets
* Unlicensed content

Extract:

* Strong interaction patterns
* Shared ecosystem primitives
* Trust patterns
* Information architecture
* User complaints
* Common missing workflows
* Accessibility expectations
* Safety expectations
* Product differentiation opportunities

For technical, security, accessibility, legal, framework, and API decisions:

* Prefer official documentation
* Prefer primary sources
* Prefer current sources
* Verify version compatibility

Create or maintain:

```text
RESEARCH_NOTES.md
```

Record:

* Research question
* Sources
* Key findings
* Relevance to Laras
* What was adopted
* What was rejected
* Why

Research must lead to decisions or implementation.

Do not spend entire rounds browsing without shipping improvements.

---

# 8. PRODUCT NORTH STAR

Laras must evolve into:

> **An Indonesia-first Career Operating System and Professional Growth Network.**

It must support a user lifecycle such as:

```text
Discover
→ Understand
→ Prepare
→ Prove
→ Connect
→ Apply
→ Interview
→ Succeed
→ Transition
→ Grow
→ Contribute
→ Mentor
```

Laras should remain useful after users obtain:

* Jobs
* Internships
* Scholarships
* ODP or management-trainee placements
* BUMN opportunities
* CPNS opportunities
* Fellowships
* Academic opportunities
* Professional transitions

Potential post-success support:

* First 30/60/90-day plan
* Career-transition checklist
* Achievement journal
* Skill-growth plan
* Professional portfolio updates
* Promotion preparation
* Role-transition preparation
* Alumni participation
* Mentorship
* Community contribution

Laras must not become:

* Payroll software
* A full HRIS
* General-purpose social media
* A marketplace
* An e-commerce platform
* A recruitment auction
* A pay-to-rank platform

---

# 9. PRODUCT ARCHITECTURE

Do not place every capability inside one oversized sidebar.

Create a coherent information architecture around these conceptual domains.

Names may be refined through product and design research, but their responsibilities must remain clear.

## 9.1 Laras Core

Shared ecosystem primitives:

* Laras ID
* Authentication
* Living Profile
* Career Graph
* Skill and Evidence Graph
* Opportunity Graph
* Relationship Graph
* Progress Graph
* Consent and Privacy Graph
* Trust and Verification Graph
* AI Context Layer
* Universal Search
* Unified Inbox
* Activity and Action Center
* Notification Layer
* Communication Layer
* Entitlement Engine
* Configuration Engine
* Audit Layer
* Analytics Event Layer

## 9.2 Laras Prepare

* CV ATS
* Visual CV
* Cover letter
* Professional bio
* Opportunity essay
* Presentation deck
* Readiness intelligence
* Interview preparation
* Voice interview
* English and TOEFL practice
* Learning pathways
* Evidence-building recommendations
* Cross-document consistency

## 9.3 Laras Opportunities

* Opportunity discovery
* Jobs
* Internships
* Scholarships
* ODP and management trainee
* BUMN
* CPNS
* Fellowships
* Competitions
* Volunteering
* Career events
* Requirement extraction
* Match explanation
* Gap analysis
* Preparation plans
* Deadline management
* Application tracking
* Outcome learning

This is an **Opportunity Network**, not a marketplace.

Never introduce:

* Shopping cart
* Product checkout
* Seller dashboard
* E-commerce commission
* Marketplace bidding
* Product inventory
* Commercial-product catalogs

## 9.4 Laras Network

* Professional identity
* Public or private professional profile
* Portfolio
* Connections
* Alumni discovery
* Career circles
* Study groups
* Peer review
* Mock-interview matching
* Mentorship
* Professional collaboration
* Evidence-based contribution
* Structured professional updates

Do not build a generic viral feed.

Prefer structured contributions such as:

* Project showcase
* Learning milestone
* Career update
* Feedback request
* Mock-interview request
* Opportunity discussion
* Resource recommendation
* Evidence-backed achievement
* Mentorship availability
* Study-circle update

Avoid:

* Engagement bait
* Outrage ranking
* Artificial virality
* Spam following
* Pay-to-boost posts
* Vanity interaction systems

## 9.5 Laras Institutions

Workspaces for:

* Universities
* Career centers
* Communities
* Bootcamps
* Scholarship providers
* Student organizations
* Employers
* Professional organizations

Possible capabilities:

* Cohort management
* Programs
* Pathways
* Advisor assignment
* Opportunity distribution
* Events
* Career challenges
* Mentoring programs
* Aggregate readiness analytics
* Consent-aware insights
* Organization verification
* Scoped organization roles
* Sponsored access seats

## 9.6 Laras Platform

Long-term platform capabilities:

* Stable internal APIs
* Integrations
* OAuth scopes
* Webhooks
* Import and export schemas
* Credential verification endpoints
* Embeddable profile cards
* Institution integrations
* Partner sandbox
* Developer documentation
* Rate limits
* Revocation
* Integration audit logs

Do not prioritize a public API before internal contracts, permissions, and privacy are stable.

## 9.7 Laras Control

A coherent control plane for:

* Owner governance
* User management
* Admin permissions
* Moderator scopes
* Community governance
* Opportunity integrity
* Organization verification
* Trust and safety
* Announcements
* Notifications
* Plans
* Entitlements
* License codes
* Campaigns
* Feature flags
* System configuration
* AI operations
* Content operations
* Security monitoring
* Privacy requests
* Analytics
* System health
* Incident response
* Maintenance mode

---

# 10. SHARED CAREER GRAPH

The Living Profile must become more than a CV form.

Create a coherent Career Graph capable of understanding:

* Identity
* Education
* Experience
* Projects
* Achievements
* Skills
* Interests
* Career goals
* Target roles
* Target industries
* Learning history
* Application history
* Interview history
* English-practice history
* Opportunity interests
* Community activity
* Mentorship
* Professional relationships
* Evidence
* Verification
* Career outcomes
* Progress over time

Every important professional claim should support provenance.

Example:

```text
Claim:
Advanced SQL proficiency

Evidence:
- Analytics project
- Institution certificate
- Technical challenge
- Peer review
- Interview assessment

Status:
- Self-declared
- Evidence-backed
- Peer-confirmed
- Organization-confirmed
- Institution-verified
- Platform-verified
```

Rules:

* AI-generated text is not evidence.
* Paid tiers are not verification.
* Public-profile claims must respect visibility settings.
* Evidence must maintain source context.
* Revoked or expired evidence must be represented honestly.
* Conflicting profile data must be surfaced, not silently merged.

---

# 11. CROSS-PRODUCT ORCHESTRATION

Laras must not feel like separate tools connected through navigation links.

One user action should produce compounding value across the ecosystem.

Example:

```text
User saves an ODP opportunity
        ↓
Requirements are extracted
        ↓
Career Graph is matched against the requirements
        ↓
Readiness dimensions update
        ↓
Missing evidence is identified
        ↓
CV recommendations are generated
        ↓
Cover-letter context is prepared
        ↓
Interview preparation is created
        ↓
English practice adapts
        ↓
Deadlines and preparation tasks are created
        ↓
Relevant peers, alumni, or mentors are suggested
        ↓
Application outcome improves future recommendations
```

Build cross-product workflows, not only cross-links.

Shared workflows should pass:

* Context
* Evidence
* Deadlines
* Documents
* Progress
* Feedback
* Outcomes
* Permissions

Examples to investigate:

* Opportunity → tailored CV
* Opportunity → cover letter
* Opportunity → interview plan
* Opportunity → English practice
* Profile gap → learning pathway
* Interview weakness → targeted practice
* Rejection outcome → preparation insight
* Peer feedback → document revision
* Mentorship session → progress update
* Community challenge → evidence
* Institution program → readiness action

---

# 12. DESIGN TRANSFORMATION MANDATE

Design is a first-class product system, not a final decoration step.

Use the local design skills deeply and use internet research when valuable.

## 12.1 Design goal

Laras should feel:

* Warm
* Editorial
* Calm
* Intelligent
* Trustworthy
* Professional
* Human
* Indonesian in relevance
* Globally credible
* Modern without being trendy
* Premium without feeling exclusive
* Rich without feeling cluttered

Do not turn Laras into a generic AI SaaS design.

Avoid:

* Random purple-blue gradients
* Excessive glassmorphism
* Decorative blobs without purpose
* Oversized hero typography on every page
* Inconsistent card styles
* Excessive rounded containers
* Excessive shadow
* Meaningless motion
* Fake charts
* Fake statistics
* Generic AI sparkle icons everywhere
* Empty dashboards filled with decorative cards
* Dense enterprise screens without hierarchy

## 12.2 Preserve and strengthen brand identity

Audit the existing visual language and preserve valuable Laras brand DNA.

Create or refine:

* Brand principles
* Typography system
* Color system
* Semantic colors
* Neutral scale
* Spacing system
* Grid system
* Radius system
* Elevation system
* Icon system
* Motion principles
* Content-width rules
* Density rules
* Data-visualization rules
* Illustration and imagery guidance
* Empty-state language
* Voice and tone

Centralize design tokens.

Do not scatter arbitrary values throughout components.

## 12.3 Information architecture

Redesign navigation around user goals, not technical modules.

A user should quickly understand:

* Where they are
* What Laras recommends
* What requires attention
* What their next action is
* How modules relate
* How progress is changing

Avoid:

* Overloaded sidebars
* Duplicate navigation
* Hidden critical actions
* Too many top-level items
* Product names users cannot understand
* Different interaction patterns for similar tasks

Consider:

* Goal-based navigation
* Contextual workspace navigation
* Universal search
* Unified inbox
* Action center
* Command palette
* Mobile bottom navigation where appropriate
* Contextual secondary navigation
* Clear breadcrumbs for deep workflows

## 12.4 Consumer and control-plane design

User-facing products and administrative products may have different density, but must share one design language.

User surfaces should prioritize:

* Clarity
* Guidance
* Confidence
* Momentum
* Personal context

Administrative surfaces should prioritize:

* Scanability
* Risk awareness
* Bulk operations
* Auditability
* Precision
* Clear destructive actions
* Dense data without visual chaos

## 12.5 Forms and editors

Improve:

* Progressive disclosure
* Inline guidance
* Validation
* Save status
* Autosave
* Recovery
* Draft persistence
* Contextual examples
* Clear optional versus required fields
* Keyboard flow
* Mobile editing
* AI assistance without taking control

Document builders should support:

* Section-level editing
* Section-level AI revision
* Reordering
* Preview
* Version history
* Compare
* Restore
* Export
* Consistency review
* Evidence warnings
* Missing-information prompts

## 12.6 State design

Every meaningful surface must include:

* Loading state
* Skeleton state
* Empty state
* First-use state
* Success state
* Error state
* Partial-failure state
* Offline or poor-network state when relevant
* Permission-denied state
* Quota-exhausted state
* Expired-license state
* Campaign-active state
* Maintenance state

Empty states must help users act.

Do not write generic copy such as “No data found” when actionable guidance is possible.

## 12.7 Motion and microinteractions

Use motion only to:

* Confirm state change
* Explain hierarchy
* Show continuity
* Show progress
* Reduce uncertainty
* Draw attention to critical change

Support reduced-motion preferences.

Do not create distracting, slow, or ornamental animation.

## 12.8 Responsive design

Test at minimum:

* Approximately 375 px
* Approximately 768 px
* Approximately 1024 px
* Approximately 1440 px

Requirements:

* No unintended horizontal overflow
* Reachable mobile actions
* Adequate touch targets
* Intentional mobile tables
* Mobile-friendly editors
* Scroll-safe modals
* Complete mobile navigation
* Readable charts
* Stable layouts
* No clipped dropdowns
* No hidden CTAs
* No desktop-only critical workflows

## 12.9 Dark mode

Dark mode must be deliberately designed.

Do not merely invert colors.

Verify:

* Contrast
* Semantic colors
* Charts
* Editors
* Input fields
* Modals
* Empty states
* Focus indicators
* Code or preview surfaces
* Export previews where relevant

## 12.10 Accessibility

Target WCAG AA quality.

Include:

* Keyboard-operable flows
* Visible focus
* Semantic headings
* Landmarks
* Correct labels
* Accessible validation
* Dialog focus management
* Screen-reader announcements
* Reduced motion
* Non-color-only communication
* Sufficient contrast
* Accessible charts and summaries
* Logical tab order
* Adequate target sizes

Accessibility and safety are never premium features.

## 12.11 Content design

Audit interface language in Indonesian and English.

Copy should be:

* Clear
* Specific
* Supportive
* Professional
* Human
* Honest
* Action-oriented
* Free from exaggerated AI claims

Avoid:

* Generic motivational language
* Overpromising career outcomes
* Shame-based messaging
* Threatening quota language
* Fake urgency
* Manipulative upgrade copy

## 12.12 Visual QA

For every major redesigned route:

* Capture screenshots
* Review at multiple viewport sizes
* Review light and dark themes
* Review ID and EN
* Inspect spacing
* Inspect hierarchy
* Inspect overflow
* Inspect content density
* Inspect empty states
* Inspect real data, not only ideal seed data

A design is not complete because it looks good in one screenshot.

---

# 13. LARAS INTELLIGENCE LAYER

AI must operate as a governed intelligence layer, not merely a floating chatbot.

Possible roles:

* Career copilot
* Opportunity analyst
* Readiness coach
* Document strategist
* Consistency checker
* Interview coach
* English coach
* Learning planner
* Search assistant
* Preparation planner
* Admin safety assistant
* Content-quality assistant

AI must:

* Use authorized user context
* Explain recommendation sources
* Distinguish fact, inference, and suggestion
* Ask for missing evidence
* Avoid fabricated achievements
* Avoid fabricated metrics
* Respect permissions
* Respect profile visibility
* Avoid exposing private data
* Validate structured output
* Handle failure gracefully
* Support editing
* Support undo for consequential actions
* Log sensitive automated actions
* Defend against prompt injection
* Be cost-aware
* Use suitable model routing

AI must not autonomously control:

* Permanent bans
* Verification
* Reputation
* Organization ownership
* Platform roles
* Sensitive private-data access
* Final moderation appeals

## 13.1 AI reliability

Implement:

* Prompt versioning
* Structured-output schemas
* Runtime validation
* Retry policy
* Provider timeout handling
* Fallback model strategy
* Circuit breaker
* Cost budgets
* Feature-level kill switches
* Usage accounting
* Failure refunds for quotas
* Evaluation fixtures
* Observability

Do not consume a user quota when the provider fails before delivering a valid result.

## 13.2 Evaluation fixtures

Test representative scenarios:

* Minimal profile
* Rich profile
* Missing evidence
* Conflicting evidence
* Indonesian request
* English request
* Long opportunity description
* Ambiguous opportunity description
* Prompt injection inside pasted content
* Invalid model output
* Provider timeout
* Rate-limit exhaustion
* Free-tier quota exhaustion
* Active campaign boost

---

# 14. PROFESSIONAL NETWORK AND COMMUNITY

Laras should become a **Professional Action and Evidence Network**, not a generic social network.

Professional relationships should help users:

* Find alumni
* Find study partners
* Find interview-practice partners
* Find peers with similar goals
* Request structured feedback
* Join preparation circles
* Learn from successful users
* Become mentors later
* Build professional evidence
* Collaborate on projects

## 14.1 Professional profile

Support:

* Public
* Connections-only
* Private

Support per-field visibility.

Possible sections:

* Headline
* Summary
* Goals
* Experience
* Education
* Skills
* Projects
* Evidence
* Credentials
* Portfolio
* Contributions
* Mentorship availability
* Communities
* Achievements

Users must be able to preview their profile as:

* Public visitor
* Connection
* Organization
* Institution
* Self

## 14.2 Career circles

Examples:

* LPDP preparation
* ODP preparation
* BUMN preparation
* CPNS preparation
* Fresh Graduate 2026
* Career switch into data
* TOEFL study circle
* University alumni
* Industry groups

A circle should support meaningful work:

* Rules
* Milestones
* Shared plans
* Peer review
* Mock interviews
* Accountability
* Resource library
* Moderated discussion
* Events
* Contribution history
* Reporting
* Member roles

## 14.3 Peer review

Peer review should be structured.

Support:

* Review request
* Scope
* Deadline
* Reviewer acceptance
* Inline or structured feedback
* Helpfulness rating
* Revision response
* Abuse reporting
* Privacy
* Evidence of contribution

Do not allow users to gain reputation through low-quality spam reviews.

## 14.4 Mentorship

Support:

* Mentor profile
* Expertise
* Availability
* Scope
* Request
* Acceptance
* Agenda
* Session outcome
* Follow-up
* Feedback
* Safety reporting

Mentorship must not become an e-commerce marketplace.

Do not implement:

* Service listings
* Checkout
* Commission
* Bidding
* Paid ranking

## 14.5 Communication

Do not launch unrestricted direct messaging without safety controls.

Use a progression such as:

```text
Notification
→ Structured request
→ Message request
→ Accepted conversation
→ Group or circle conversation
→ Scheduled session
```

Required protections:

* Block
* Mute
* Remove connection
* Message requests
* Spam limits
* Attachment controls
* Reporting
* Conversation evidence
* Privacy settings
* Safe retention
* User consent

---

# 15. OPPORTUNITY NETWORK

The Opportunity Network must go beyond storing links.

Each opportunity should support:

* Source
* Organization
* Type
* Requirements
* Deadline
* Location
* Modality
* Eligibility
* Verification state
* Expiration
* User reports
* Duplicate detection
* Scam signals
* Related preparation
* Related communities
* Related mentors or alumni

User workflows should include:

* Save
* Follow
* Analyze
* Match
* Gap review
* Preparation plan
* Document tailoring
* Interview preparation
* English preparation
* Deadline tasks
* Application
* Outcome
* Reflection
* Learning

The system must explain:

* Why an opportunity matches
* Which evidence supports the match
* Which requirements are unmet
* Which action has the highest value
* What the system cannot determine

Do not manipulate match scores based on tier.

---

# 16. INSTITUTION AND ORGANIZATION WORKSPACES

Support multi-tenant workspaces for:

* Universities
* Career centers
* Communities
* Bootcamps
* Scholarship providers
* Employers
* Professional organizations

Possible scoped roles:

```text
ORGANIZATION_OWNER
ORGANIZATION_ADMIN
RECRUITER
CAREER_ADVISOR
PROGRAM_MANAGER
MENTOR
COMMUNITY_LEAD
CONTENT_EDITOR
ANALYST
REVIEWER
MEMBER
```

Possible capabilities:

* Workspace profile
* Members
* Roles
* Cohorts
* Programs
* Events
* Opportunities
* Resources
* Advisor assignment
* Mentorship
* Sponsored seats
* Aggregate analytics
* Verification
* Audit logs

Tenant isolation is mandatory.

Organization users must not automatically access:

* Private CVs
* Private essays
* Private messages
* Private interview answers
* Private recordings
* Unshared readiness details

Use explicit consent and authorized sharing.

---

# 17. ROLE, PERMISSION, AND GOVERNANCE

Role and plan tier are separate systems.

## 17.1 Platform roles

```text
OWNER
ADMIN
MODERATOR
USER
```

### Owner

Owner is the highest recovery and governance authority.

Owner may:

* Appoint or remove admins
* Review admin actions
* Manage root configuration
* Trigger emergency controls
* Freeze sensitive systems
* Recover platform control
* Manage high-risk license permissions
* Review incidents
* Override operational decisions with auditability

### Admin

Admins receive explicit permissions.

Do not assume all admins automatically have all permissions.

Potential permissions:

```text
users.view
users.manage
roles.manage
moderators.manage
communities.manage
opportunities.manage
organizations.manage
verification.manage
announcements.manage
notifications.manage
features.manage
campaigns.manage
licenses.manage
plans.manage
ai.manage
content.manage
security.view
security.manage
privacy.manage
analytics.view
operations.manage
support.manage
```

### Moderator

Moderators must be appointed by an authorized admin.

Moderator authority must be scoped by:

* Community
* Content type
* Language
* Region
* Organization
* Risk category
* Allowed action
* Assignment duration
* Escalation level

Moderators must not automatically access:

* Private CVs
* Private essays
* Interview answers
* Private messages
* Secrets
* AI credentials
* Plan configuration
* License management
* Platform-role management
* Database export
* Audit deletion

### User

Users control:

* Profile
* Visibility
* Connections
* Communities
* Messages
* Integrations
* Data export
* Account deletion
* Privacy consent
* Block and mute
* Reports
* Appeals

## 17.2 Authorization model

Use a combination of:

* RBAC
* ABAC
* ReBAC

Authorization must consider:

* Role
* Permission
* Assignment
* Community
* Organization
* Ownership
* Relationship
* Consent
* Visibility
* Verification
* Session assurance
* MFA status
* Sanction
* Time-limited access

Enforce deny-by-default.

Validate permission on every request.

Never rely only on hidden UI controls.

## 17.3 Owner bootstrap

Implement a secure first-owner bootstrap.

The first owner must not be created through:

* Normal registration
* License redemption
* Public API
* Client-side role editing

Use a controlled mechanism such as:

* Secure environment configuration
* One-time CLI bootstrap
* Protected seed process

Ownership transfer must require:

* Re-authentication
* Strong confirmation
* Audit log
* Recovery planning

---

# 18. PRIVACY AND DATA CLASSIFICATION

Classify data such as:

```text
PUBLIC
INTERNAL
PRIVATE
SENSITIVE
HIGHLY_SENSITIVE
```

Examples:

* Public profile headline: PUBLIC
* Draft CV: PRIVATE
* Interview recording: SENSITIVE
* Identity-verification document: HIGHLY_SENSITIVE
* Audit log: INTERNAL restricted
* License code: secret-like credential

Classification should influence:

* Access
* Search indexing
* Export
* Logging
* Retention
* Deletion
* Backup
* Encryption
* Admin visibility

Users need:

* Public, connections-only, and private visibility
* Per-section profile visibility
* Contact protection
* Message permissions
* Activity visibility
* Search discoverability
* Public-profile preview
* Data download
* Account deactivation
* Account deletion
* Integration revocation
* Session management
* Logout all devices
* Consent history
* Privacy history

Administrative access to private data must require:

* Legitimate purpose
* Permission
* Re-authentication
* Reason entry
* Time-limited access
* Audit logging
* Minimum necessary exposure
* User notification when appropriate

Admin control must not mean unrestricted private-data browsing.

---

# 19. TRUST, VERIFICATION, AND REPUTATION

Possible verification targets:

* Email
* Identity
* Education
* Employment
* Organization
* Project
* Portfolio ownership
* Certificate
* Mentor status
* Community role
* Internship
* Competition
* Skill assessment

Possible states:

```text
UNVERIFIED
SELF_DECLARED
EVIDENCE_SUBMITTED
PEER_CONFIRMED
ORGANIZATION_CONFIRMED
INSTITUTION_VERIFIED
PLATFORM_VERIFIED
EXPIRED
REVOKED
```

Every indicator must explain:

* What was verified
* By whom
* Based on what
* When
* Expiration
* Revocation

Paid plans must never create:

* Verification
* Reputation
* Search rank
* Trusted-candidate status
* Mentor credibility
* Moderator authority
* Artificial reach

Reputation must be:

* Contextual
* Earned
* Evidence-based
* Resistant to spam
* Resistant to reciprocal manipulation
* Reviewable
* Appealable when consequential

---

# 20. MODERATION, REPORTS, AND APPEALS

Implement a complete trust-and-safety workflow.

```text
User submits report
        ↓
Report is categorized
        ↓
Severity is assessed
        ↓
Case enters moderation queue
        ↓
Evidence is reviewed
        ↓
Decision and reason code are recorded
        ↓
Action is applied
        ↓
Affected user receives explanation
        ↓
User may appeal
        ↓
Admin reviews appeal
        ↓
Case closes with audit history
```

Each case should support:

* Case ID
* Reporter
* Reported object
* Category
* Severity
* Evidence snapshot
* Assigned moderator
* Action history
* Reason code
* Escalation
* Appeal
* Final outcome
* Resolution time

Possible actions:

```text
NO_ACTION
CONTENT_LABEL
WARNING
VISIBILITY_REDUCTION
CONTENT_REMOVAL
FEATURE_RESTRICTION
MESSAGING_RESTRICTION
TEMPORARY_SUSPENSION
PERMANENT_SUSPENSION
ORGANIZATION_RESTRICTION
EMERGENCY_ACCOUNT_LOCK
```

High-impact actions require stronger review.

Admins and moderators must not handle cases where they have a conflict of interest.

Permanent bans, sensitive exports, and major reversals may require second approval.

Audit logs must not be deletable through normal dashboards.

AI may:

* Classify reports
* Detect spam
* Detect duplicates
* Summarize evidence
* Recommend severity
* Prioritize queues

AI must not issue permanent bans autonomously.

Anticipate:

* Harassment
* Bullying
* Doxxing
* Stalking
* Spam
* Sexual harassment
* Discrimination
* Identity theft
* Impersonation
* Phishing
* Fake recruiters
* Fake opportunities
* Recruitment-fee scams
* Malware links
* CV theft
* Portfolio plagiarism
* Fake certificates
* Fake endorsements
* Scraping
* Prompt injection
* AI-generated defamation
* Privacy leakage

---

# 21. ADMIN AND OWNER CONTROL PLANE

Build a coherent, production-quality control plane.

Do not create only raw CRUD pages.

## 21.1 User management

* Search
* Filters
* Account state
* Role
* Permission
* Verification
* Sanction
* Security sessions
* Account recovery
* Data-access history
* Access grants
* Organization membership
* Support history

## 21.2 Moderation center

* Reports
* Cases
* Evidence
* Assignment
* Escalation
* Appeals
* Reason codes
* Sanctions
* Reversals
* Moderator performance
* Conflict-of-interest reassignment

## 21.3 Community management

* Communities
* Rules
* Membership
* Moderators
* Content health
* Events
* Resources
* Suspensions
* Appeals
* Community analytics

## 21.4 Opportunity integrity

* Opportunity review
* Source verification
* Organization verification
* Duplicate detection
* Scam indicators
* Expiration
* Reports
* Publication controls

## 21.5 Organization management

* Profiles
* Ownership claims
* Members
* Roles
* Verification
* Programs
* Sanctions
* Audit

## 21.6 AI operations

* Provider configuration references
* Model routing
* Prompt versions
* Evaluations
* Cost monitoring
* Rate limits
* Failures
* Safety events
* Feature-specific AI limits
* Fallbacks

Never display full secret keys.

## 21.7 Content operations

* Taxonomy
* Interview bank
* TOEFL bank
* Learning resources
* Public guidance
* Draft-review-publish
* Localization
* Versioning
* Expiration
* Quality review
* Duplicate detection
* Rollback
* Archive

## 21.8 Platform operations

* Feature flags
* Maintenance mode
* Kill switches
* Job health
* Storage health
* Email health
* Search-index health
* AI-provider health
* Failed jobs
* Rate limits
* Error trends
* Release notes
* Incident status

## 21.9 Privacy and compliance

* Data-export requests
* Account-deletion requests
* Consent
* Data-access logs
* Retention
* Incident management
* User notification

## 21.10 Support

* Support tickets
* Categories
* Priority
* Assignment
* Internal notes
* User-visible responses
* Escalation
* Account recovery
* Bug reports
* Feature feedback
* Support audit

## 21.11 Analytics

* Activation
* Time to first value
* Retention
* Readiness action completion
* Opportunity conversion
* Community health
* Abuse rate
* Appeal reversal rate
* Moderator response time
* False-positive rate
* License usage
* Campaign impact
* AI cost
* Error-blocked journeys

---

# 22. ANNOUNCEMENT AND NOTIFICATION SYSTEM

Implement governed communication for:

* Owner announcements
* Admin announcements
* Moderator announcements
* Product news
* Release notes
* Feature launches
* Maintenance
* Security alerts
* Incidents
* Campaigns
* Community notices
* Institution announcements
* Opportunity notices
* Policy changes

## 22.1 Authority

### Owner

May publish:

* Global notices
* Security alerts
* Policy notices
* Emergency messages
* Maintenance notices
* Campaign announcements
* Mandatory acknowledgment notices

### Authorized admin

May publish only within assigned permissions and audience scope.

### Moderator

May publish only within assigned community or moderation scope.

Moderators cannot publish global:

* Pricing
* Security
* Policy
* Incident
* Plan
* Platform-wide notices

unless explicitly authorized.

## 22.2 Announcement lifecycle

```text
DRAFT
IN_REVIEW
SCHEDULED
PUBLISHED
PAUSED
EXPIRED
ARCHIVED
CANCELLED
```

Support:

* Title
* Summary
* Body
* Category
* Severity
* Author
* Reviewer
* Audience
* Locale
* Time zone
* Publish time
* Expiration
* Channels
* CTA
* Safe links
* Attachment
* Acknowledgment requirement
* Version history
* Audit

## 22.3 Targeting

Target by:

* All users
* Role
* Tier
* Organization
* Institution
* Community
* Cohort
* Locale
* Region
* Feature usage
* Account state
* Campaign participation
* Application status
* Opportunity interest
* Specific users

Do not allow discriminatory targeting using sensitive attributes.

## 22.4 Delivery

Possible channels:

* Dashboard banner
* Unified inbox
* Notification center
* Community notice
* Settings notice
* Email when configured
* Consent-based push notification
* Critical modal
* Public status page
* Release-notes page

Avoid excessive modal interruption.

## 22.5 Severity

```text
INFO
UPDATE
ACTION_REQUIRED
MAINTENANCE
SECURITY
INCIDENT
EMERGENCY
```

## 22.6 User preferences

Users should control:

* Optional notification categories
* Email preferences
* Push preferences
* Digest frequency
* Quiet hours
* Channel preference
* Marketing and campaign messages
* Community notifications

Security, privacy, moderation, and account alerts cannot be fully disabled when delivery is essential.

Implement:

* Deduplication
* Grouping
* Rate limiting
* Unsubscribe for non-essential email
* Read status
* Acknowledgment
* Delivery failure tracking

---

# 23. PERSONAL PLANS

Use these personal plans:

```text
FREE
PLUS
PRO
MAX
```

Use separate workspace products where needed:

```text
INSTITUTION
ORGANIZATION
```

Plans and roles are separate.

A Max user does not become an admin.

A moderator does not automatically receive Max.

## 23.1 Tier philosophy

Every personal user must be able to experience the complete Laras career journey.

Higher tiers expand:

* Capacity
* Frequency
* Depth
* History
* Automation
* Storage
* Collaboration scale
* Integration scale
* Processing priority
* Advanced analysis

Higher tiers must never purchase:

* Search ranking
* Opportunity ranking
* Verification
* Reputation
* Trust
* Moderator power
* Mentor credibility
* Community authority
* Artificial reach
* Better moderation treatment
* Better appeal treatment
* Manipulated match scores
* Guaranteed outcomes

Do not display plan tier as a public credibility badge by default.

## 23.2 Free

Free must provide real end-to-end value.

Free users should be able to try:

* Profile
* Career Graph
* CV
* Cover letter
* Bio
* Essay
* Presentation
* Opportunity analysis
* Application tracking
* Interview preparation
* Voice interview
* English and TOEFL practice
* Professional profile
* Communities
* Peer review
* Mentorship request
* Search
* Inbox
* Export
* Version history
* AI

Use healthy configurable limits.

Do not intentionally degrade the quality of a successful result.

Never gate:

* Privacy
* Security
* Block
* Mute
* Report
* Appeal
* Accessibility
* Data export
* Account deletion
* Basic opportunity access
* Reading existing personal data

## 23.3 Plus

Expand:

* AI usage
* Exports
* Voice minutes
* Active applications
* History
* Storage
* Integrations
* Progress analytics
* Preparation capacity

## 23.4 Pro

Add or expand:

* Advanced JD intelligence
* Cross-document consistency
* Deep interview coaching
* Adaptive English practice
* Repeated-weakness analysis
* Multi-step agents
* Advanced readiness history
* Collaboration
* Integrations
* Higher limits
* Priority processing

## 23.5 Max

Provide:

* Highest personal fair-use limits
* Deepest career intelligence
* Advanced personal agents
* Multi-opportunity planning
* Longitudinal analysis
* Full personal history
* Large voice allowance
* Broad integrations
* Advanced automation
* Advanced portfolio control
* Stable beta access
* Priority technical support

Do not claim absolute unlimited use.

---

# 24. ENTITLEMENT ENGINE

Do not hardcode access using:

```ts
if (user.plan === "PRO") {
  // allow
}
```

Use capability-based access.

Example capabilities:

```text
documents.ai.generate
documents.export
career.deepAnalysis
interview.voice
english.adaptivePractice
agent.multiStep
portfolio.advanced
integrations.connect
applications.activeLimit
community.create
mentorship.request
```

Example quotas:

```text
AI_ACTIONS
DEEP_ANALYSES
VOICE_MINUTES
EXPORTS
AGENT_RUNS
STORAGE_BYTES
ACTIVE_PREPARATIONS
PEER_REVIEW_REQUESTS
```

Effective access may combine:

* Free baseline
* Personal plan
* License grant
* Sponsored access
* Organization seat
* Temporary campaign boost
* Admin override
* Internal staff grant
* Feature flag
* Security sanction
* Fair-use limit

Enforce access on:

* Server
* API
* Background jobs
* AI jobs
* File generation
* Client presentation

The UI must not be the only enforcement layer.

Usage consumption must be:

* Atomic
* Idempotent
* Concurrency-safe
* Auditable
* Reversible on failure
* Resistant to double charging

---

# 25. LICENSE CODE SYSTEM

Do not add a payment gateway.

Do not add:

* Credit-card checkout
* Automatic subscription billing
* Payment-provider webhooks
* Auto-renewal
* In-app payment service
* Marketplace transactions

Implement:

> **Laras Entitlement, Access Grant, and License Code System**

Support:

## Individual code

* One code
* One account
* One redemption

## Batch code

* Many unique codes
* One batch
* Independent redemption

## Campaign code

* One reusable code
* Redemption limit
* Start and end
* Optional domain restriction
* Optional organization restriction

## Trial code

* Temporary Plus, Pro, or Max

## Sponsored access

* Institution or organization provides seats

## Complimentary grant

* Owner or authorized admin grants access directly

## Long-term founder grant

* No scheduled expiration
* Restricted permission
* Full audit

Security rules:

* Cryptographically secure generation
* Opaque codes
* Avoid ambiguous characters
* Add checksum where useful
* Store secure hashes when practical
* Show full code only at generation
* Mask it later
* Do not log full code
* Do not send code to analytics
* Rate-limit redemption
* Detect repeated failures
* Use transactional redemption
* Prevent double redemption
* Support expiration
* Support revocation
* Never allow a code to change a platform role

Stacking:

* Same tier extends duration
* Higher tier activates without destroying lower-tier remaining time
* Lower-tier duration may remain pending
* Never silently discard valid redeemed access

Expiration:

* Return to Free
* Preserve all data
* Preserve documents
* Preserve application history
* Preserve connections
* Preserve verification
* Preserve reputation
* Restrict only new actions beyond Free limits

---

# 26. DYNAMIC CONFIGURATION AND CAMPAIGNS

Owner and authorized admins must be able to configure routine system behavior without source-code changes.

Build a governed configuration system for:

* Plan entitlements
* Quotas
* Usage periods
* Fair-use limits
* AI limits
* Voice limits
* Export limits
* Storage limits
* History duration
* Feature availability
* Feature flags
* Maintenance mode
* Announcement defaults
* Campaign boosts
* Trial durations
* License policies
* Processing priorities
* Community limits
* Organization-seat policies
* Notification defaults
* Content limits

Do not store all business behavior in hardcoded constants.

## 26.1 Campaign system

Example:

```text
Campaign:
Laras Career Week 2026

Audience:
All FREE users

Duration:
7 days

Temporary changes:
- AI actions: 15 → 50
- Deep analyses: 3 → 10
- Voice interview: +60 minutes
- Exports: 5 → 25
- Peer reviews: 2 → 10
- Agent workflow trial: enabled
```

Other examples:

* University onboarding month
* LPDP preparation week
* BUMN preparation campaign
* New-feature trial
* Community-sponsored access
* Incident compensation
* Holiday campaign
* Cohort boost

Campaign fields:

* Name
* Description
* Owner
* Status
* Audience
* Tier targeting
* Organization targeting
* Community targeting
* Locale
* Start
* End
* Time zone
* Feature boosts
* Quota overrides
* Additive or replacement mode
* Budget or usage cap
* Redemption requirement
* License association
* Announcement association
* Preview
* Approval
* Pause
* Cancel
* Rollback
* Analytics
* Audit

## 26.2 Campaign safety

* Campaigns cannot grant platform roles.
* Campaigns cannot create verification.
* Campaigns cannot create reputation.
* Campaigns cannot manipulate opportunity ranking.
* Campaigns must expire predictably.
* Data must remain after expiration.
* Conflicts need deterministic resolution.
* Temporary access must be explained.
* Large-impact campaigns may require owner approval.
* Every change must be audited.
* Negative quota must not occur after expiration.

## 26.3 Configuration safety

Support:

* Draft
* Preview
* Validation
* Approval
* Scheduled activation
* Version history
* Rollback
* Impact estimate
* Audit
* Emergency freeze

High-risk changes should require:

* Re-authentication
* Strong confirmation
* Optional second approval

Do not expose raw secrets through configuration screens.

---

# 27. MANUAL ACCESS REQUESTS

Because payment occurs outside Laras, support a manual request flow.

```text
User opens Plans
        ↓
Selects desired access
        ↓
Chooses Request Access
        ↓
Follows official external instructions
        ↓
Submits reference information
        ↓
Admin verifies manually
        ↓
Admin issues code or direct grant
        ↓
User receives access
```

Statuses:

```text
SUBMITTED
UNDER_REVIEW
APPROVED
CODE_ISSUED
GRANTED
REDEEMED
REJECTED
CANCELLED
```

Support:

* Request reference
* Desired plan
* Duration
* Official channel
* Internal notes
* Verification history
* Code-delivery status
* Rejection reason
* Audit

Clearly identify official Laras channels to reduce fraud.

Do not expose payment proof publicly.

Prefer existing infrastructure and free or self-hosted options.

Do not add new paid services without compelling necessity.

---

# 28. CONTENT AND KNOWLEDGE OPERATIONS

Interview content, TOEFL content, learning resources, opportunity data, announcements, and public guidance require governed content operations.

Support:

* Taxonomy
* Source attribution
* Ownership
* Draft
* Review
* Publish
* Localization
* Versioning
* Expiration
* Quality scoring
* Difficulty calibration
* Duplicate detection
* AI-content review
* Rollback
* Archive

Do not scale content using low-quality filler.

For TOEFL and listening content, validate:

* Unique content
* Correct answers
* Plausible distractors
* No answer leakage
* Difficulty balance
* Topic diversity
* Audio-text consistency
* Explanation quality

---

# 29. INTEGRATIONS AND DATA PORTABILITY

Laras must not become a data prison.

Users should be able to:

* Export profile
* Export documents
* Export applications
* Export activity history
* Download credentials
* Revoke integrations
* Delete imported data
* View permission scopes
* Delete accounts

Potential integrations:

* Google Calendar
* Gmail
* Google Drive
* GitHub
* Cloud storage
* Video meeting services
* University systems
* Learning management systems
* Approved opportunity sources
* ATS systems

Do not use unauthorized scraping.

Do not claim an integration exists before it works reliably.

---

# 30. MOBILE AND INDONESIAN REACH

Design for:

* Mobile-first usage
* Mid-range Android devices
* Limited bandwidth
* Unstable connections
* Limited data plans
* Shared devices
* Indonesian and English users

Investigate and implement where valuable:

* PWA
* Installability
* Offline drafts
* Efficient uploads
* Low-bandwidth mode
* Background sync
* Secure local storage
* Session safety
* Consent-based push notifications

Do not require a native app to provide a complete mobile experience.

---

# 31. SECURITY AND OPERATIONAL READINESS

Treat all credentials as secrets.

Ensure these remain untracked:

```text
.env
.env.local
.env.production
*.pem
*.key
credentials.json
service-account.json
```

Before every push:

* Inspect tracked files
* Inspect staged diff
* Search token patterns
* Run a secret scanner when available
* Verify generated archives do not contain secrets

Security review must include:

* Authentication
* MFA readiness
* Session handling
* Cookies
* Authorization
* IDOR
* CSRF
* XSS
* SSRF
* Path traversal
* File validation
* Prompt injection
* Rate limiting
* Brute force
* Error leakage
* Secret exposure
* AI endpoint abuse
* License brute force
* Campaign privilege escalation
* Admin misuse
* Moderator scope bypass
* Tenant isolation
* Messaging abuse
* Opportunity scams
* Public verification routes
* Search privacy

Admin and moderator security should include:

* MFA
* Re-authentication
* Session timeout
* Device management
* Login alerts
* Session revocation
* Role-change alerts
* Permission expiration
* Recovery controls

## 31.1 Production operations

Establish or improve:

* Structured logs
* Error correlation
* Health checks
* Background jobs
* Retry
* Dead-letter handling
* Email delivery tracking
* Search indexing
* Backup
* Restore test
* Migration policy
* Storage lifecycle
* Feature flags
* Kill switches
* Maintenance mode
* Rollback
* Incident levels
* Capacity monitoring
* AI cost monitoring
* Service health
* Status communication

The project is pre-production, so do not use rollout staging as an excuse to leave functionality unfinished.

Feature flags remain useful for:

* Emergency disable
* Maintenance
* Experimental internals
* Operational safety

---

# 32. PRODUCT ANALYTICS

Create privacy-conscious events around meaningful outcomes.

Possible events:

* Onboarding started
* Onboarding completed
* Profile section completed
* Evidence added
* First document generated
* Document revised
* Document exported
* Opportunity saved
* Preparation started
* Application created
* Outcome recorded
* Interview completed
* English practice completed
* Readiness action completed
* Peer review completed
* Mentorship request completed
* Community contribution created
* License redeemed
* Campaign activated
* Announcement viewed
* Announcement acknowledged
* Error blocked completion

Use analytics to answer:

* Where do users abandon?
* How quickly do they reach first value?
* Which workflows improve outcomes?
* Which modules create meaningful return?
* Which campaign changes behavior?
* Which limits create frustration?
* Which tier has clear value?
* Which safety incidents are increasing?
* Which features cost more than their value?
* Which errors block completion?

Do not create fake analytics or fake usage numbers.

---

# 33. ECOSYSTEM FLYWHEELS

Every major feature should strengthen at least one legitimate flywheel.

## User value flywheel

```text
Richer profile
→ More personalized preparation
→ Better outcomes
→ New evidence
→ Stronger profile
```

## Opportunity flywheel

```text
Opportunity saved
→ Requirements understood
→ Gaps identified
→ User improves
→ Application prepared
→ Outcome recorded
→ Future matching improves
```

## Community flywheel

```text
User requests feedback
→ Peer contributes
→ User improves
→ Peer earns contribution reputation
→ Peer becomes mentor
→ More users receive help
```

## Institution flywheel

```text
Institution brings cohort
→ Laras improves readiness
→ Outcomes become measurable
→ Institution expands usage
→ More cohorts join
```

## Alumni flywheel

```text
User succeeds
→ Returns as alumni
→ Becomes contributor or mentor
→ Helps new users
→ Ecosystem becomes more valuable
```

## Trust flywheel

```text
More evidence is verified
→ Recommendations become more credible
→ Organizations trust the platform
→ More meaningful outcomes occur
→ More reliable evidence is created
```

Avoid artificial viral loops and spam-based growth.

---

# 34. SUGGESTED TEN-ROUND EXECUTION MAP

This is a starting structure, not a rigid limitation.

Adapt it after auditing the real code.

## Round 1 — Baseline and Core Architecture

* Deep audit
* Research
* Design audit
* Git setup
* Testing foundation
* Persistent agent documentation
* Future-state architecture
* Laras Core foundations
* Initial design-system normalization

## Round 2 — Identity, Career Graph, and Privacy

* Living Profile redesign
* Career Graph
* Evidence model
* Visibility
* Consent
* Data classification
* Owner bootstrap
* Authorization foundation

## Round 3 — Governance and Control Plane

* Owner
* Admin
* Moderator
* Permission engine
* Scoped assignments
* Audit
* Reports
* Appeals
* User safety controls
* Admin design

## Round 4 — Plans, Entitlements, Licenses, and Campaigns

* Free, Plus, Pro, Max
* Capability resolver
* Quota ledger
* License codes
* Access grants
* Sponsored access
* Campaigns
* Dynamic configuration
* Access request workflow

## Round 5 — Opportunity Intelligence

* Opportunity Graph
* Requirement extraction
* Matching
* Gap analysis
* Cross-product preparation
* Application workflow
* Outcome learning
* Opportunity integrity controls

## Round 6 — Professional Identity and Network

* Public/private profiles
* Portfolio
* Connections
* Career circles
* Peer review
* Professional contributions
* Search visibility
* Moderation integration

## Round 7 — Mentorship and Communication

* Mentorship
* Message requests
* Controlled conversations
* Unified inbox
* Notification preferences
* Blocking
* Reporting
* Session workflows

## Round 8 — Institution and Organization Workspaces

* Multi-tenancy
* Scoped organization roles
* Cohorts
* Programs
* Events
* Sponsored seats
* Consent-aware analytics
* Organization verification

## Round 9 — Announcements, Content, AI Operations, and Support

* Announcement system
* Release notes
* Content operations
* AI operations
* Support center
* Analytics
* System configuration
* Operational dashboards

## Round 10 — Ecosystem Integration and Final Hardening

* Cross-product orchestration
* Full visual refinement
* Mobile optimization
* Accessibility
* Performance
* Security
* Hostile QA
* Export fidelity
* Error handling
* Final production-readiness review

Do not limit implementation to this map if important work remains.

---

# 35. ROUND EXECUTION LOOP

Every round must follow this loop.

## A. Reassess reality

* Read the latest worklog
* Inspect Git state
* Run relevant checks
* Revisit critical journeys
* Inspect regressions
* Inspect shallow features
* Inspect missing integrations
* Inspect design inconsistency
* Inspect safety and production risks

## B. Choose highest-leverage work

Score work by:

* User impact
* Frequency
* Activation
* Retention
* Trust
* Safety
* Differentiation
* Product depth
* Cross-product compounding
* Engineering-risk reduction
* Accessibility
* Performance
* Cost
* Dependencies

Select coherent vertical slices.

## C. Define observable acceptance criteria

Bad:

```text
Improve communities.
```

Good:

```text
A user can discover a relevant career circle, understand its purpose,
join it, view its rules, request structured peer feedback, block or report
abuse, and the assigned moderator can manage reports only within that circle.
```

## D. Implement completely

Cover relevant layers:

* Schema
* Migration
* Seed
* Service
* API
* Validation
* Authorization
* Entitlement
* Usage tracking
* UI
* States
* Analytics
* Admin controls
* Moderator controls
* Tests
* Documentation

## E. Verify like a user

Test:

* 375 px
* 768 px
* 1024 px
* 1440 px
* Indonesian
* English
* Light
* Dark
* Keyboard
* Empty account
* Partial account
* Mature account
* Free
* Plus
* Pro
* Max
* Moderator
* Scoped admin
* Owner
* Failed network
* Exhausted quota
* Expired license
* Active campaign
* Reported content

## F. Run deterministic checks

Run applicable tests, lint, type checks, schema checks, and build.

## G. Adversarial review

Review the implementation as a hostile independent reviewer.

Look for:

* Missing edge cases
* Authorization bypass
* Privacy leakage
* Role escalation
* Campaign abuse
* License brute force
* Mobile failures
* Dark-mode failures
* Accessibility gaps
* Misleading copy
* Shallow workflow
* Security regression
* Performance regression
* Data-loss risk
* AI hallucination
* Dead code
* Pay-to-win behavior
* Fake trust signals
* Incomplete integration

Fix meaningful findings before committing.

## H. Document, commit, push, continue

* Update persistent documents
* Commit green work
* Push to the same branch
* Immediately begin the next round
* Do not request confirmation

---

# 36. QUALITY GATES

Use the actual scripts in `package.json`.

At an appropriate baseline and before every green push, run applicable checks such as:

```bash
bun install --frozen-lockfile
bunx prisma validate
bunx prisma generate
bunx tsc --noEmit
bun run lint
bun run build
```

For TOEFL or listening changes:

```bash
bun run toefl:validate
bun run toefl:report
```

If automated testing is weak, establish a serious test foundation.

Prefer:

* Unit tests
* Integration tests
* API tests
* Database tests
* Authorization tests
* Entitlement tests
* License tests
* Campaign tests
* Moderation tests
* Browser E2E
* Visual screenshots
* Regression tests

Critical journeys should eventually include:

1. Register or sign in
2. Complete onboarding
3. Improve profile
4. Add evidence
5. Generate a document
6. Revise it
7. Compare versions
8. Restore a version
9. Export
10. Save an opportunity
11. Analyze requirements
12. Build a preparation plan
13. Create an application
14. Complete interview practice
15. Receive feedback
16. Complete English practice
17. View progress
18. Publish a controlled profile
19. Join a circle
20. Request peer feedback
21. Request mentorship
22. Block and report abuse
23. Redeem a license
24. Receive a campaign boost
25. Experience safe expiration
26. View an announcement
27. Manage notification preferences
28. Use organization workspace
29. Use admin and moderator flows
30. Switch locale
31. Switch theme
32. Use mobile navigation
33. Recover from API failure
34. Verify a credential publicly

A round is not green when:

* Type checking fails
* Lint fails
* Build fails
* Critical flows break
* Secrets are staged
* Authorization is incomplete
* Mobile is broken
* ID and EN are inconsistent
* Only the happy path exists
* Social functionality lacks safety
* Tier enforcement can be bypassed
* License redemption is not concurrency-safe
* Campaigns can escalate roles
* Admin actions lack audit
* Database state is inconsistent

Show evidence, not claims.

---

# 37. DEFINITION OF DONE

A feature is complete only when:

1. Its user problem is explicit.
2. Its value is clear.
3. Its entry point is discoverable.
4. Its main workflow works.
5. Data persists.
6. Authorization is enforced server-side.
7. Entitlement is enforced where relevant.
8. Loading exists.
9. Empty state exists.
10. Error state exists.
11. Retry or recovery exists.
12. Success is clear.
13. Mobile works.
14. Desktop works.
15. Indonesian works.
16. English works.
17. Light mode works.
18. Dark mode works.
19. Keyboard access works.
20. Accessibility is considered.
21. Privacy is respected.
22. Abuse cases are handled.
23. Admin controls exist where relevant.
24. Moderator controls exist where relevant.
25. User safety controls exist where relevant.
26. Actions are audited where necessary.
27. It integrates with related Laras products.
28. Automated tests exist.
29. Browser QA passes.
30. Production build passes.
31. Documentation is current.
32. Obsolete code is removed or justified.
33. It has received adversarial review.
34. It is committed.
35. It is pushed.

A database model, route, button, or placeholder page alone is not a complete feature.

Do not use “Coming Soon” as a substitute for implementation.

---

# 38. PERSISTENT AGENT MEMORY

Create or update:

## `AGENTS.md`

Include:

* What Laras is
* Product architecture
* Technical architecture
* Major directories
* Runtime stack
* Database
* Authentication
* Authorization
* AI approach
* Environment-variable names without values
* Build commands
* Test commands
* Migration rules
* Design principles
* Localization rules
* Security rules
* Git branch rule
* Definition of done
* Prohibited actions

## `UPGRADE_MASTERPLAN.md`

Track:

* Baseline
* North star
* Architecture
* Design direction
* Prioritized problems
* Opportunity hypotheses
* Round plan
* Acceptance criteria
* Decisions
* Risks
* Deferred items
* Metrics
* Completion state

## `RESEARCH_NOTES.md`

Track:

* Questions
* Sources
* Findings
* Decisions
* Rejected patterns
* Relevance to Laras

## `worklog.md`

Append after each round:

```text
Round:
Date:
Starting commit:
Goals:
Audit findings:
Research:
Product decisions:
Design decisions:
Implementation:
Files changed:
Database changes:
Security changes:
Tests:
Browser QA:
Accessibility:
Responsive:
Performance:
Adversarial review:
Known risks:
Commit:
Push:
Next priority:
```

Do not erase old history.

Update existing audit, QA, and roadmap documents when outdated.

---

# 39. ROUND REPORT FORMAT

At the end of each round, report in Indonesian:

```text
ROUND N/10

Temuan utama:
- ...

Riset yang digunakan:
- ...

Prioritas yang dipilih:
- ...

Alasan:
- ...

Peningkatan produk:
- ...

Peningkatan desain:
- ...

Hubungan dengan ekosistem:
- ...

Dampak pengguna:
- ...

Dampak bisnis:
- ...

Governance dan keamanan:
- ...

File dan subsistem:
- ...

Migrasi dan data:
- ...

Validasi:
- TypeScript:
- ESLint:
- Build:
- Unit/integration:
- Browser E2E:
- Authorization:
- Entitlement:
- Accessibility:
- Responsive:
- Security:
- Secret scan:

Review adversarial:
- Temuan:
- Perbaikan:

Commit:
Push:
Branch:

Risiko tersisa:
- ...

Prioritas ronde berikutnya:
- ...
```

Clearly distinguish:

* Verified
* Inferred
* Deferred
* Blocked

Never report a check as passed when it was not run.

---

# 40. FINAL DELIVERY

After the final available round:

1. Run the complete validation suite.
2. Perform hostile browser QA.
3. Recheck critical user journeys.
4. Recheck every role boundary.
5. Recheck entitlement enforcement.
6. Recheck license redemption.
7. Recheck campaign expiration.
8. Recheck announcement targeting.
9. Recheck safety and appeals.
10. Recheck search privacy.
11. Recheck organization isolation.
12. Recheck mobile.
13. Recheck accessibility.
14. Recheck dark mode.
15. Recheck AI quality.
16. Recheck database state.
17. Recheck secrets.
18. Inspect Git history.
19. Push all green commits.
20. Do not create a PR.
21. Do not merge to `main`.

Produce a final Indonesian report containing:

* Before versus after
* Product architecture
* Ecosystem improvements
* Core-platform improvements
* Design transformation
* Existing features deepened
* New scopes introduced
* Cross-product workflows
* Governance
* Admin and moderation
* Privacy and safety
* Plans and entitlements
* License system
* Campaign system
* Announcement system
* AI improvements
* Accessibility
* Performance
* Security
* Production operations
* Test coverage
* Database changes
* Remaining limitations
* Deployment considerations
* Branch name
* Final commit SHA
* Push confirmation

Do not claim Laras is production-ready merely because the build passes.

Production-ready requires:

* Complete workflows
* Safe authorization
* Privacy
* Safety
* Operational controls
* Monitoring
* Error handling
* Auditability
* Security
* Testing
* Maintainability
* Accessible design
* Responsive design
* Honest documentation

---

# 41. NON-NEGOTIABLE CONTINUATION TRIGGER

After every round, do not ask whether you should continue.

Immediately begin another founder-level audit from a different perspective.

Do not stop because:

* The old roadmap is complete
* The build passes
* The UI looks polished
* One flagship feature works
* The database schema is large
* The application has many routes
* Admin pages exist
* Social features exist
* License codes work
* Campaigns work
* Announcements work
* The product feels good enough

When you believe Laras is finished, assume your perspective has become too familiar.

Reset your viewpoint and inspect Laras as:

* A first-time fresh graduate
* A career switcher
* A scholarship applicant
* A mobile-only user
* A low-bandwidth user
* A user with incomplete evidence
* A user facing rejection
* A successful alumni mentor
* A community moderator
* A university career advisor
* An organization administrator
* A malicious user
* A privacy-conscious user
* A support operator
* A security engineer
* A product-growth owner
* A production incident responder

Search again for:

* Shallow features
* Missing integrations
* Disconnected workflows
* Weak design hierarchy
* Inconsistent visual language
* Unclear value
* Friction
* Broken responsive states
* Weak copy
* Accessibility failures
* Security risks
* Privacy risks
* Moderation gaps
* Pay-to-win behavior
* Unfair tiers
* License abuse
* Campaign conflicts
* Notification spam
* Reliability gaps
* AI cost waste
* Missing tests
* Weak network effects
* Missing ecosystem flywheels
* New career scopes that meaningfully strengthen Laras

When proposing a new product or scope, require it to:

1. Fit the Laras career north star.
2. Strengthen at least one ecosystem flywheel.
3. Reuse Laras Core.
4. Integrate with existing workflows.
5. Have a production-safe governance model.
6. Avoid becoming a disconnected tool.
7. Avoid becoming a generic social feature.
8. Avoid marketplace or e-commerce behavior.
9. Provide measurable user value.
10. Be implemented deeply rather than scaffolded superficially.
11. Meet the same high design standard as the rest of Laras.
12. Include administration, safety, privacy, and testing where relevant.

Use every available long-running execution round.

Keep researching, auditing, designing, implementing, integrating, testing, securing, measuring, documenting, committing, and pushing.

Continue until the execution limit itself stops you—not until you merely feel done.

**DO NOT END EARLY. DO NOT WAIT FOR CONFIRMATION. DO NOT SETTLE FOR A COLLECTION OF TOOLS. DO NOT LEAVE MAJOR SCOPES AS PLACEHOLDERS. KEEP TURNING LARAS INTO A COHERENT, BEAUTIFUL, SAFE, TRUSTED, DEEPLY INTEGRATED, AND PRODUCTION-READY CAREER OPERATING SYSTEM AND PROFESSIONAL GROWTH NETWORK UNTIL ALL AVAILABLE ROUNDS ARE EXHAUSTED.**
