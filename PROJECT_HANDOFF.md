# Project Handoff

This document is updated at the end of every session. It records current feature status, known issues, and recommended next steps. Read `AI_HANDOFF.md` for the deep technical reference and `PROJECT_CONTEXT.md` for the full-picture overview.

---

## Last Updated

2026-06-16 (Session 31 — Onboarding wizard UI/UX redesign for landing-page parity)

---

## What Was Done This Session

### Session 31 — Onboarding Wizard Redesign (UI/UX only — no logic/data changes)

**Goal:** Bring the onboarding experience up to the same visual polish as the landing page and auth screens. All collected data, validation, server actions, and wizard flow are unchanged — this was a presentation-layer refactor onto the shared design-token system.

**`app/onboarding/layout.tsx`**
- Reduced to a minimal `min-h-screen` token-based wrapper. All brand chrome (logo header, card, glow) moved into the wizard so the presentation can be step-aware.

**`components/onboarding/brand-rail.tsx`** (new)
- Dark (`#0a0a0a`) split-screen brand rail mirroring the `(auth)` layout: hairline orbit texture, accent glow, glowing Saturn `logo.svg`, dynamic per-step headline (`RAIL_COPY`), trust line, and the vertical stepper. Desktop only (`lg:`).

**`components/onboarding/wizard-progress.tsx`**
- Replaced `WizardProgress` with two exports: `WizardStepsVertical` (dark-rail vertical stepper with completed/active/pending states) and `WizardProgressCompact` (mobile horizontal segment bar + step counter). Exported shared `ONBOARDING_STEPS`.

**`components/onboarding/onboarding-wizard.tsx`**
- Rebuilt the shell as a full-bleed `lg:flex-row` split: `BrandRail` + right panel (mobile logo/compact progress, scrollable content, sticky footer nav). Restyled `Step5Account` and the email-confirmation screen onto semantic tokens (`FIELD_CLASS`, `sp-display`, `--accent-soft`); password/confirm now a 2-col grid on `sm`. Footer CTA keeps the `ai-planner-frame` treatment.

**`components/onboarding/step-1..4-*.tsx`**
- Converted all hardcoded `violet-/slate-/indigo-/purple-` utilities to semantic tokens (`--accent`, `--accent-soft`, `--accent-soft-foreground`, `--text-heading/body/muted`, `--surface-raised/sunken`, `--border`), adopted `sp-display`/`sp-eyebrow`/`sp-numeric` typography, and unified card styling (`--radius-lg`, `--shadow-xs`). Status colors (emerald/amber for the score journey + est. gain) intentionally retained. No copy, fields, or behavior changed.

**Layout polish (follow-up):** Constrained the desktop wizard to `lg:h-screen` with internal content scroll so the footer nav never drops below the fold; brand rail is `lg:h-screen lg:overflow-y-auto`. Repositioned the ambient Saturn mark to a deliberate bottom-right corner bleed.

**Verification:** `tsc --noEmit` clean; walked all 5 steps + email-confirm state in the dev preview at desktop and mobile widths (temporary preview route used and removed); confirmed footer stays pinned on the tallest step.

### Session 31 (cont.) — Canonical URL hardening (auth redirect domain)

**Problem:** Email-confirmation links and OAuth redirects could resolve to the per-deployment `sat-prep-website-gold.vercel.app` host instead of `saturnpath.app`.

**`lib/app-url.ts`**
- Added `CANONICAL_APP_URL = 'https://saturnpath.app'`. `getAppUrl()` now returns the canonical URL whenever `VERCEL_ENV === 'production'` (before falling back to `VERCEL_URL`), so production never emits a `*.vercel.app` redirect even if `NEXT_PUBLIC_APP_URL` is unset. `VERCEL_URL` is still used for preview deployments.

**`actions/auth.ts`, `actions/onboarding.ts`**
- The `appUrl` passed to the branded confirmation email now uses `getAppUrl()` (was `process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'`, which would leak `localhost` into prod emails if the env var were missing).

**`app/layout.tsx`, `app/robots.ts`, `app/sitemap.ts`**
- Hardcoded fallback hosts changed from `sat-prep-website-gold.vercel.app` / `sat-planner.vercel.app` to `https://saturnpath.app`; robots/sitemap switched from `??` to truthy-trim so an empty env string can't slip through.

**Still required OUTSIDE the repo (authoritative for where auth actually lands):**
- Vercel → Project → Settings → Environment Variables: set `NEXT_PUBLIC_APP_URL=https://saturnpath.app` (Production).
- Supabase → Auth → URL Configuration: Site URL `https://saturnpath.app`; add `https://saturnpath.app/**` to Redirect URLs (Supabase ignores `redirect_to` and falls back to Site URL if the target isn't allow-listed).
- Vercel → Domains: make `saturnpath.app` the production domain and add a redirect from `sat-prep-website-gold.vercel.app` → `saturnpath.app`.

### Session 30 — Inventory Mode System + Tutorial Variants + Desmos Calculator Link

**Goal:** (A) Dual inventory mode toggle (`exclude_active` / `include_active`) with per-user DB preference, dual Supabase tables, plan engine integration, and immediate data refresh on toggle. (B) Tutorial step 5 variant for `include_active` users. (C) Desmos graphing calculator link for all math assignments.

#### A. Inventory Mode System

**`types/database.ts`**
- Added `inventory_mode: 'exclude_active' | 'include_active' | null` to users Row/Insert/Update.
- Added full `question_inventory_with_active` table type (identical schema to `question_inventory`).

**`lib/study-plan-engine/types.ts`**
- Added `inventoryMode?: 'exclude_active' | 'include_active'` to `StudyPlanEngineInput`.

**`lib/study-plan-engine/plan-store.service.ts`**
- `loadInventoryLimits` now accepts `mode` param; selects `question_inventory_with_active` for `include_active`, `question_inventory` for `exclude_active`.

**`actions/question-inventory.ts`** (complete rewrite)
- Removed all CRUD/admin mutations (`createInventoryItem`, `updateInventoryItem`, etc.) — admin data is managed via Supabase only.
- Added: `InventoryMode` type, `getUserInventoryMode()`, `setInventoryMode()`, `getInventoryWithStats(mode)`, `getInventoryLimits(supabase, mode)`.

**`actions/onboarding.ts`**
- Both `saveOnboarding()` and `signUpAndSaveOnboarding()`: after plan generation, sets `users.inventory_mode` automatically — `include_active` for ≤4 practice tests, `exclude_active` for ≥5.

**`actions/study-plan.ts`**
- `generatePlanFromProfile()` and `generatePlanFromForm()` both read `inventory_mode` from the user row and pass it to the engine as `inventoryMode`.

**`components/inventory/inventory-mode-toggle.tsx`** (new file)
- Toggle UI with "Recommended" / "Not recommended" badge based on practice test count.
- Warning dialog (using `Dialog`, not `AlertDialog` — that component doesn't exist) when switching modes.
- Calls `setInventoryMode()` via `useTransition`, then calls `onModeChange(newMode)`.

**`components/inventory/inventory-client.tsx`**
- No Admin tab. `handleModeChange()` calls `getInventoryWithStats(newMode)` directly via `useTransition` for immediate data refresh without page reload.
- Loading state: `opacity-60 pointer-events-none` while transition is in progress.

**`components/inventory/empty-state.tsx`** — Simplified to informational message only (no import/create buttons).

**`components/inventory/inventory-admin.tsx`** — DELETED (admin mutations removed; Supabase is the only way to manage inventory data).

**`app/(dashboard)/inventory/page.tsx`** — Sequential fetch: `getUserInventoryMode()` first, then `getInventoryWithStats(mode)` with that mode.

**PENDING (manual steps in Supabase):**
- Create `question_inventory_with_active` table (copy schema from `question_inventory`).
- Add RLS policy: SELECT-only for `authenticated` (same as `question_inventory`).
- Add `inventory_mode` column to `users` table: `ALTER TABLE users ADD COLUMN inventory_mode text CHECK (inventory_mode IN ('exclude_active', 'include_active'));`
- Enter the include-active question counts in the new table.

#### B. Tutorial Step 5 Variant for include_active users

**`components/tutorial/tutorial-client.tsx`**
- Added `imageSrc?: string` to `TutorialStep` interface.
- `AnimatedScreenshot` accepts optional `src` prop (falls back to `/tutorial/step${step}.png`).
- `StepCard` passes `step.imageSrc` to `AnimatedScreenshot`.
- `STEP5_EXCLUDE` — existing content unchanged; no `imageSrc` (uses default `step5.png`).
- `STEP5_INCLUDE` — title: "Leave 'Exclude Active Questions' Unchecked"; description advises NOT checking the box; `imageSrc: '/tutorial/step5active.png'`; 4 new help Q&As.
- At render time: `STEPS.map(s => s.id === 5 ? { ...s, ...step5Variant } : s)`.

**`app/(dashboard)/tutorial/page.tsx`** — Made async, uses `noStore()`, fetches `inventory_mode`, passes to `TutorialClient`.

**Note:** Place `public/tutorial/step5active.png` in the public folder (same zoom settings as step5.png).

#### C. Desmos Graphing Calculator Link

**`components/calendar/task-drawer.tsx`**
- Added a "Calculator" section in the scrollable body, visible only for `task.subject === 'math' && !isPracticeTest`.
- Link: `https://www.desmos.com/calculator` with `ExternalLink` icon.
- Positioned between QB Filters section and Instructions section.

**`components/calendar/session-workflow-dialog.tsx`**
- In the `idle` phase, added a Desmos link button (same styling as the QB button) below the QB link, visible only for `task.subject === 'math'`.
- Link: `https://www.desmos.com/calculator` with `ExternalLink` icon.

**TypeScript:** `npx tsc --noEmit` → 0 errors.

---

## Previously Done (summary)

### Session 29 — Practice Test Scheduling Overhaul

### Session 29 — Practice Test Scheduling Overhaul

**Goal:** Replace the complex practice-test week logic with a simple biweekly cadence, move practice tests to the student's last study day (not Saturday), always add a mandatory practice test 2 days before the SAT, mark the test date on the calendar, and show the total practice test count during onboarding.

**`lib/study-plan-engine/types.ts`**
- Added `'test_day'` to the `DayType` union.
- Added `TestDayBlock` interface for the SAT test date calendar marker.
- Updated `DaySchedule.blocks` to include `TestDayBlock`.

**`lib/study-plan-engine/scheduler.service.ts`**
- Rewrote `practiceTestWeekSet()`: now generates one practice test every 2 weeks (weeks 2, 4, 6… up to `totalWeeks − 1`).
- Added `lastStudyDayOfWeek()` helper: returns Friday (5) for the default schedule; scans Mon→Sun in reverse for custom `daySchedule` overrides.
- Updated `classifyDay()`: promotes the last study day (not the Saturday review day) to `'practice_test'` in biweekly weeks.
- Added `prePracticeTestDate` = testDate − 2 days: this date is forced to `'practice_test'` in the loop regardless of biweekly rules.
- Added `buildTestDayBlock()`.
- After the main loop: appends a `test_day` entry for `input.testDate` itself.

**`lib/study-plan-engine/plan-store.service.ts`**
- Added `testDayToTask()`: creates a `'SAT Test Day'` calendar task.
- Added cleanup step to delete old `'SAT Test Day'` tasks on plan regeneration.
- Added `test_day` branch in the schedule loop.

**`components/calendar/task-colors.ts`**
- Added `'SAT Test Day'` color: amber/yellow so the test date stands out.

**`types/index.ts`**
- Added `practiceTestCount: number` to `OnboardingAnalysis`.

**`components/onboarding/onboarding-wizard.tsx`**
- Added `computePracticeTestCount(studyDays)` helper.
- Wired into `computeAnalysis()`.

**`components/onboarding/step-3-analysis.tsx`**
- Added practice test count display: amber card with `ClipboardList` icon showing count and scheduling rationale.

**TypeScript:** `npx tsc --noEmit` → 0 errors.

---

## Previously Done (summary)

### Session 28 — UI Polish

**Goal:** A series of focused visual improvements across the logged-in dashboard.

**Home page — title card progress bar (`components/home/score-progress-bar.tsx`)**
- Fill bar changed from white glow to **dark purple gradient** (`#3b0764 → #581c87 → #6b21a8`) with violet box-shadow glow.
- Thumb (current score handle) changed to match: `#c084fc` fill, lavender border, purple glow.
- Target score marker replaced from a gold vertical pill to a **gold Saturn SVG icon** (planet body + closed ellipse ring with back/front layering for depth). The same gold colors (`#ffe066 → #f5a623`) and `drop-shadow` glow are preserved. Saturn is 40×40px (rendered via `viewBox="0 0 18 18"` scaled up).

**Home page — clickable score/error cards (`app/(dashboard)/home/page.tsx`)**
- **Current Score** card now links to `/data`.
- **Target Score** card now links to `/data`.
- **Open Errors** card now links to `/error-log`.
- Used the existing `href` prop on `ScoreCard` — no component changes needed.

**Topic mastery cards — colored borders (`components/ai-coach/topic-mastery-cards.tsx`)**
- Each card's border now reflects its mastery level:
  - Mastered → `border-emerald-500/50`
  - Proficient → `border-blue-500/50`
  - Developing → `border-amber-500/50`
  - Needs Work → `border-rose-500/50`
- Proficient badge (`badgeClass`) and progress bar (`barClass`) also updated to explicit `blue-500` to be consistent (previously used CSS accent variables that could resolve to purple).

**Page title icons — all dashboard pages**
Added a violet icon badge (rounded square, `bg-violet-100 dark:bg-violet-900/30`, `text-violet-600 dark:text-violet-400`) matching the Inventory page pattern to:
- `app/(dashboard)/calendar/page.tsx` → `Calendar` icon
- `app/(dashboard)/error-log/page.tsx` → `ClipboardList` icon
- `components/data/data-client.tsx` (Analytics header) → `BarChart3` icon
- `components/tutorial/tutorial-client.tsx` → `GraduationCap` icon

All four use the same violet color as the existing Inventory (`Package`) icon.

---

## Previously Done (summary)

### Session 22 — Legal Compliance (US-only)

**Goal:** Make the site meet its US legal responsibilities. Scope confirmed with the user: US-only (COPPA + CCPA/CPRA + state student-privacy + CAN-SPAM + ADA/WCAG; no GDPR/blocking cookie gate), 13+ age gate, tighten existing Privacy/Terms copy (counsel disclaimer kept), placeholders centralized.

**New files**
- `lib/legal/config.ts` — single source of truth `LEGAL` (entity, emails, mailing address, governing law, effective date, minAge) + age helpers (`ageFromBirthYear`, `isUnderMinAge`, `requiresParentalAck`, `validateAgeConsent`). All contact details are clearly-marked placeholders.
- `actions/account.ts` — `deleteAccount()`: admin-client `auth.admin.deleteUser` cascades all user-owned rows; signs out → `/login?deleted=1`.
- `components/settings/delete-account.tsx` — danger-zone card + type-DELETE confirm dialog.
- `components/legal/cookie-notice.tsx` — non-blocking, dismissible cookie/analytics notice (localStorage `sp-cookie-notice`); mounted in `app/layout.tsx`.
- `LEGAL_COMPLIANCE.md` — obligations→code matrix + operational pre-launch checklist.

**Age gate + consent (COPPA)**
- New `users` columns: `birth_year` (year only, not full DOB), `terms_accepted_at`, `parental_ack` (`supabase/schema.sql` + `types/database.ts`; **apply migration manually in Supabase**).
- Birth-year select + "I agree to Terms/Privacy" checkbox + conditional under-18 parental-permission checkbox on both `app/(auth)/signup/page.tsx` and the onboarding wizard Step 5 (`components/onboarding/onboarding-wizard.tsx`).
- **Server-side enforcement** via `validateAgeConsent` in `actions/auth.ts signUp()` and `actions/onboarding.ts signUpAndSaveOnboarding()` (blocks <13, requires consent, requires parental ack <18); consent/age persisted on the users upsert.

**Discoverability + consent surfaces**
- Privacy/Terms links + SAT-trademark disclaimer in landing footer; "By continuing you agree…" on login; waitlist consent microcopy under the wishlist form (`components/marketing/landing-page.tsx`, `app/(auth)/login/page.tsx`).
- CAN-SPAM: reminder email footer now carries entity + mailing address + unsubscribe (`lib/email/reminder-template.ts`).

**Tightened copy** — `app/(legal)/privacy/page.tsx` (CCPA notice-at-collection, SOPIPA/student-data, cookies, age, in-app deletion) and `terms/page.tsx` (entity, age/parental, communications, accessibility/WCAG); both now import from `LEGAL`.

**Verified** (preview): age-gate logic (under-13 block, under-18 parental checkbox, adult clean), privacy page render, landing footer links + disclaimer + waitlist consent, cookie notice, no console errors, `tsc --noEmit` clean. **Pending manual:** apply the `users` migration; replace `lib/legal/config.ts` placeholders; counsel review; DPAs (see `LEGAL_COMPLIANCE.md`).

### Session 21 — Landing Page Ring-Spin + Feature Timeline

**Goal:** Make the `/` landing scroll experience genuinely stunning. Per the request: (1) spin the Saturn **ring** as the user scrolls instead of rotating the whole planet, transitioning smoothly into the feature section; (2) add a purple line down the **middle** of the feature section; (3) make features appear slowly as the user scrolls. Landing page only — no backend/routing/schema changes.

**Changes — `components/marketing/landing-page.tsx`**
- **Ring-only spin.** `SaturnIllustration` was rebuilt so the **planet body is fixed and only the ring turns.** The ring is drawn as dashed ellipses (fine ring segments + one bright orbiting "moon") wrapped in a `<g>`; because `stroke-dashoffset` is an *inherited* SVG property, animating it on that one group carries every segment and the moon around together, while the back/front clip halves keep the "passes behind, then in front of the planet" depth. The hero ring's offset is driven imperatively from scroll (`ringRef`); the closing-CTA ring uses a slow ambient CSS loop (`ringIdle` → `.lp-ring-idle`).
- **Scroll handler rewrite.** The old single-listener that rotated the whole Saturn (`saturnRef.style.transform = rotate(...)`) is gone. With motion enabled, one rAF loop now drives: the header progress bar, the ring `stroke-dashoffset` (scroll term + a gentle ambient drift so it stays alive when idle), a soft hero parallax (`saturnParallaxRef`), the feature-timeline fill height, and the hero scroll-cue fade — all via direct style writes, **paused on `visibilitychange`** when the tab is hidden. With `prefers-reduced-motion`, it falls back to a rAF-throttled scroll listener that only updates the progress bar + timeline fill + cue (no ring spin, no parallax).
- **Feature timeline (the purple line).** The four showcase rows are wrapped in `.lp-timeline`; a centered vertical `.lp-timeline-track` runs down the **gutter between the alternating columns on desktop** (and a left rail on mobile, with each row given `pl-12 lg:pl-0` so content clears it). A `.lp-timeline-fill` (violet gradient) grows downward from scroll progress, led by a glowing `.lp-timeline-comet` head; a new `TimelineNode` (IntersectionObserver, `rootMargin` shrunk to a thin mid-screen band) lights each station violet as it passes the viewport center.
- **Slower, staggered reveals.** Fixed a latent bug: `.lp-reveal`'s transition was hardcoded `700ms` and ignored the `--lp-duration` the `Reveal` component sets — it now reads `var(--lp-duration, 700ms)`, so the `duration` prop actually works. Feature copy reveals at `950ms`, mocks at `1000ms`, and each bullet now reveals on its own staggered `Reveal`.
- **Extra polish.** Wired up the previously-dead `WordsReveal` for a word-by-word masked rise on the hero headline (new `.lp-word*` CSS); added ambient orbiting accent dots around the hero Saturn (`.lp-orbit*`) and a "Scroll to explore" cue (`.lp-bounce`, fades out on scroll).

**Changes — `app/globals.css`** — extended the Landing page section: `.lp-word-mask` / `.lp-word` (+ `lp-word-rise`), `lp-ring-spin` / `.lp-ring-idle`, `.lp-orbit*` (+ `lp-orbit-spin`), `.lp-bounce`, and the full `.lp-timeline*` set (track / fill / comet / node + `.lp-active`), with `left: 50%` centering at `lg`. The `prefers-reduced-motion` block now also stills the headline words, ring idle, orbit, and bounce loops. `.lp-reveal` transition now honors `--lp-duration`.

**Verified:** `npx tsc --noEmit` clean; `npx eslint` clean on the changed file. Rendered against the dev server (Turbopack, port 3000): no console errors, `GET / 200`. Confirmed the ring's inline `stroke-dashoffset` advances frame-to-frame (ambient + scroll) while the planet stays put; the timeline fill grows with scroll and **all four nodes activate** when centered; the purple line is centered in the column gutter at `lg` (≥1024px) and a left rail on mobile (content clears it). Checked desktop (1280), tablet/stacked (800), and mobile (375) widths, plus dark (default) and light.

### Session 20 — Landing Page Feature Showcase + Scroll Animations

**Goal:** Make the `/` landing page premium and demonstrative: add visual "screenshots" of the four headline features, impressive scroll animations, and a Saturn visual that turns as the user scrolls. (Branch `claude/landing-page-features-animations-id4qy1`.)

**Changes**
- **`components/marketing/landing-page.tsx` (rebuilt)**
  - **Four feature showcase sections** (alternating copy/visual layout): ① Adaptive planner — day-by-day schedule that rebuilds from performance, "no two schedules are the same"; ② Interactive sessions — one-tap A/B/C/D answer entry + adaptive pacing clock simulating real SAT timing (71s R&W / 95s Math); ③ Automated error log — every mistake recorded from every session for deep, targeted review; ④ Question Bank manager — manages the large CB Question Bank so every question is practiced once and never repeated. Each section pairs a headline + 3 bullets with an **illustrative in-code product mock** ("screenshot" placeholder) in a browser-chrome `MockFrame`: a week-calendar replanning mock, a session UI with an animated SVG pacing-clock ring, an error-log list with mistake-type badges, and a coverage dashboard with per-domain progress bars + "0 repeats" badge.
  - **Copyright safety in the mocks:** question content is represented by gray skeleton bars only; only public CB domain/skill labels and the student's own A/B/C/D letters appear; every mock is `aria-hidden` and captioned "Illustrative preview — no SAT content is ever shown or stored."
  - **Scroll animations:** `Reveal` component (IntersectionObserver, directional up/left/right/scale variants, `--lp-delay` stagger), `CountUp` hero stats (8 domains / 2 subjects / 0 repeats / 100% free), a header **scroll-progress bar**, and the hero **Saturn now rotates as the user scrolls** (single passive scroll listener, rAF-throttled, direct style writes — no re-renders; a small moon was added to the ring so rotation reads clearly; gentle `lp-float` idle animation on top).
  - **Reduced motion / no-JS:** `.lp-reveal` falls back to fully visible under `prefers-reduced-motion` (CSS, not JS), count-up jumps straight to the final value, and the Saturn scroll rotation is skipped. Content is never hidden if JS fails to run the observers.
  - Header gains a "Features" anchor link (`#features`, `scroll-mt-16`). The closing CTA mentions "completely free" (the old third feature card's message lives on in the stats strip + CTA). Hero, wishlist forms, how-it-works strip, and footer are otherwise preserved.
- **`app/globals.css`** — new "Landing page" section: `.lp-reveal` (+ `-left/-right/-scale`, `.lp-visible`), `lp-float`, `lp-clock-sweep` (pacing-ring), `lp-pulse` keyframes, all guarded by a `prefers-reduced-motion` block that forces reveals visible.
- No backend, routing, or schema changes — the wishlist form remains the only live interaction.

**Verified:** `npx tsc --noEmit` clean; `npx eslint` clean on changed files; `next build` succeeds (`/` still `ƒ` dynamic). Rendered in headless Chromium against the dev server (dummy Supabase envs): hero, all four showcase sections, how-it-works, CTA, and footer render in dark + light; Saturn transform measured before/after scroll (identity → ~86° rotation) confirming the scroll-rotation works; mobile 375px stacks correctly (clock reflows below answers, planner chips truncate legibly); only console errors were the dummy-Supabase TLS failures, expected outside prod.


### Session 19 — Marketing Landing Page + Wishlist Capture

**Goal:** Replace the root `/`→`/login` redirect with a polished, public marketing landing page for SaturnPath that introduces the product and captures pre-launch interest via a Join Wishlist email form. No real app features are wired up — the only backend touch is a new, isolated waitlist table.

**Changes**
- **`components/marketing/landing-page.tsx` (new)** — client component rendering the full landing page using the existing "Quiet Monochrome" tokens and `components/ui` primitives (`Button`, `Input`, `Label`) + `SaturnPathLogo`. Sections: sticky top bar (logo · Join Wishlist · discreet Sign in → `/login`), hero (headline, subhead, primary wishlist email form, brand Saturn SVG, "Launching in a few weeks" eyebrow), three core-feature cards (Adaptive planning / Automated error log / Completely free), a copyright-safe "Plan → Practice with CB Question Bank → Log & adapt" strip, a closing wishlist CTA ("Launching in a few weeks — be first in line. No spam."), and a footer (logo · © · Sign in). The top-bar Join Wishlist button smooth-scrolls to and focuses the hero email input (instant when `prefers-reduced-motion`). Fully responsive, dark (default) + light, accessible (real `<label>`s, focus rings, `aria-invalid`/`aria-describedby` on error). A shared `WaitlistForm` handles pending / success / inline-error states (mirrors the login page's form-state pattern).
- **`app/page.tsx`** — keeps the server-side Supabase `getUser()` check and still `redirect('/home')` for authenticated users; logged-out visitors now render `<LandingPage />` instead of being bounced to `/login`.
- **`next.config.ts`** — **removed** the hard `async redirects()` rule `{ source: '/', destination: '/home' }`. That rule fired *before* the page/proxy and was sending every visitor to `/home` (then proxy bounced logged-out users to `/login`), so `/` never reached the new page. The root redirect for authenticated users now lives only in `app/page.tsx`.
- **`actions/waitlist.ts` (new)** — `joinWaitlist(formData)` `'use server'` action: validates email shape server-side, inserts `{ email, source: 'landing' }` into `waitlist_signups`, maps unique-violation (`23505`) to a friendly `{ success: true }` ("you're already on the list"), returns `{ success }` / `{ error }`. Requires no auth and triggers no planner/replanner/app logic.
- **`supabase/schema.sql`** — appended the isolated `waitlist_signups` table (idempotent `CREATE TABLE IF NOT EXISTS`, `gen_random_uuid()` PK, `UNIQUE` email, `source DEFAULT 'landing'`, `created_at`), RLS enabled, single **INSERT-only** policy for `anon` + `authenticated`. **No public SELECT** — emails are readable only via the service role / dashboard.
- **`types/database.ts`** — hand-added the `waitlist_signups` Row/Insert/Update types to `Database['public']['Tables']` (keeps strict mode happy).
- **Docs** — updated `PROJECT_CONTEXT.md` (Pages table, Completed features, Key Directories), `DATABASE_SCHEMA.md` (overview, full table section, RLS summary). `COPYRIGHT_COMPLIANCE.md` re-verified: the page stores/displays no SAT questions, passages, or answer choices; it references the free CB Question Bank workflow by name only.

**Verified:** `npx tsc --noEmit` clean; `npx eslint` on changed files clean; `next build` succeeds (`/` is `ƒ` server-rendered on demand). In-browser (dev): logged-out `/` returns **200** and renders the full landing page; `/login` returns **200**; mobile (375px) stacks correctly; both dark (default) and light palettes render on-brand (primary CTA = high-contrast neutral fill, not the accent); no console errors.

**⚠️ Action item (production):** the `waitlist_signups` migration was **NOT** applied to the hosted Supabase project from this session (the automated migration was blocked pending explicit approval). Apply it before the form can accept sign-ups — run the `waitlist_signups` block from `supabase/schema.sql` in the Supabase SQL editor (or approve the MCP migration). Until then, `joinWaitlist` will return the generic error message. Duplicate-email handling was validated by code review against the `23505` path.

### Session 18 — Signup + Email-Confirmation Fix

**Trigger:** App review feedback — *"I tried signing up and it seemed to not work (the signup link didn't do anything), probably because of a missing environment variable,"* plus a request that the Supabase confirmation link land on the **login** page, not onboarding.

**Root causes**
1. Supabase clients used `process.env.NEXT_PUBLIC_SUPABASE_URL!` / `..._ANON_KEY!` (bare non-null assertions). A missing/empty value let the Supabase SDK throw deep inside the signup server action; the page handlers did not catch it, so the button hung on "Saving…/Signing in…" and *nothing visibly happened*.
2. `app/auth/confirm/page.tsx` redirected to `/home` after confirmation. For a brand-new (not-yet-onboarded) user the dashboard layout then bounced them to `/onboarding`; when no session was detected it was a dead-end ("the link may have expired").

**Root cause found:** the pulled `.vercel/.env.production.local` has `NEXT_PUBLIC_APP_URL=""` (empty). `signUpAndSaveOnboarding()` built `emailRedirectTo` with `process.env.NEXT_PUBLIC_APP_URL ?? …`, and `"" ?? fallback` is `""`, so the confirmation redirect became the relative `"/auth/confirm"` (no origin) — i.e. the broken "signup link." This is almost certainly the env var the reviewer hit.

**Changes**
- **`lib/app-url.ts` (new)** — `getAppUrl()` returns the absolute origin, preferring `NEXT_PUBLIC_APP_URL` → `VERCEL_URL` → localhost, **treating empty strings as unset** (`.trim()` truthiness, not `??`). Used by `actions/auth.ts` and `actions/onboarding.ts` for `emailRedirectTo`.
- **`lib/supabase/env.ts` (new)** — `getSupabaseUrl()` / `getSupabaseAnonKey()` validate the public Supabase env vars and throw a clear, actionable message naming the missing variable. Wired into `lib/supabase/server.ts`, `lib/supabase/client.ts`, `proxy.ts`.
- **Error surfacing** — `login`, `signup`, and the onboarding wizard now wrap their server-action call in `try/catch` (re-throwing `NEXT_REDIRECT`); a thrown error shows an inline message/toast instead of hanging the button.
- **Confirmation redirect** — `app/auth/confirm/page.tsx` clears any transient session and redirects to `/login?confirmed=1` (handles `error`/`error_description` from query **or** hash). `app/(auth)/login/page.tsx` renders a green "Your email is confirmed. Sign in to continue." banner (and a red banner for `?error=`).
- **Eager signup persistence** — `signUpAndSaveOnboarding()` now persists profile + question_sessions + study plan + score_history + notification via the **service-role admin client** when email confirmation is pending (no session ⇒ RLS would block writes), upserting `has_completed_onboarding: true`. So once the user confirms and signs in, they go **straight to the dashboard** — no second onboarding. (`SUPABASE_SERVICE_ROLE_KEY` must be set, which it is.)
- **Guest preview** — new `guestPreview()` action (anonymous sign-in + disposable demo plan, `has_completed_onboarding: true`); a "Preview the dashboard as a guest" button on the `/signup` **and** `/login` pages (login is the real entry — `/signup` isn't linked in-app). Lets visitors explore the real dashboard with no account; the existing `GuestUpgradeBanner` lets them convert. Verified end-to-end in-browser (anonymous sign-ins are enabled in Supabase). Not gated by `ENABLE_GUEST_ONBOARDING`. Abuse note: add CAPTCHA + anon-user cleanup before heavy traffic.

**Verified:** `npx tsc --noEmit` clean; `npx eslint` clean (only pre-existing `recs` unused warnings); `next build` succeeds; in-browser `/auth/confirm` → `/login?confirmed=1` with banner, wizard renders, no console errors. The eager-persistence DB path is covered by build/typecheck/logic review (a full run requires creating a real account).

**⚠️ Action items (production) — do these in the dashboards, then redeploy:**
1. **Vercel → Settings → Environment Variables (Production):** set `NEXT_PUBLIC_APP_URL = https://sat-prep-website-gold.vercel.app` (it is currently empty — this is the core bug), and confirm `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are present. **Redeploy** (env changes only take effect on a new build).
2. **Supabase → Authentication → URL Configuration:** Site URL = `https://sat-prep-website-gold.vercel.app`; add `https://sat-prep-website-gold.vercel.app/**` (and `/auth/confirm`) to the Redirect URLs allow-list.

### Session 16 — Inventory-Aware Question Assignment

**Goal:** Make plan generation respect the Question Bank inventory: never over-assign a skill, substitute another skill when one runs out, fill ≥80% of study time, keep both subjects on every study day, and stop + prompt when the whole bank is scheduled.

#### Plan Generation (`lib/study-plan-engine/plan-store.service.ts`)
- Replaced the old `applyInventoryCap()` (which assigned 1 question when a skill was exhausted) with a full assignment pipeline:
  - **80% time floor** — every study block targets at least `ceil(blockMinutes × 0.80 / 1.25)` questions before capping (applies even with no inventory configured).
  - **Inventory cap** — no `domain|skill|difficulty` is assigned more than its `available_count`; tracked via a cumulative `used` map.
  - **Cross-skill substitution** — when the planned skill can't fill the floor, `pickSlot()` substitutes another skill in the **same subject** by adaptive-planner priority (`buildSlotsBySubject()` sorts inventory slots by `priorityScore`). Substitutes rebuild title/description/filters/difficulty/metadata via `substituteBlock()`.
  - **Bank-complete** — when both subjects are exhausted, remaining study days become `bankCompleteToTask()` Review & Practice sessions and one `type:'system'` notification is written.
- `save()` now returns `inventoryExhausted` + `nearlyExhaustedSkills`.
- Added optional `inventoryExhausted?` / `nearlyExhaustedSkills?` to `StudyPlanEngineResult` (`lib/study-plan-engine/types.ts`).

#### Verification
- `npx tsc --noEmit` clean (strict mode), `npx eslint` clean on changed files.
- Not browser-verified: logic is server-side and requires auth + a seeded `question_inventory` + plan generation. To verify in-app: seed inventory on `/inventory`, generate a plan, and inspect `/calendar` (capped counts, substituted skills, Review & Practice days, "Question Bank fully scheduled" notification).

#### Copyright compliance
- No change to what is stored: tasks still carry only domain/skill label strings, difficulty, and integer question counts. No SAT content introduced. COPYRIGHT_COMPLIANCE.md remains accurate.

---

### Session 15 — Review Day Overhaul: Single Review Session + Inline Error Log

**Goal:** Replace the multiple domain-specific blocks on review days with a single "Review Session" task that shows active error log mistakes and lets users edit/master them inline on the calendar.

#### Plan Generation (`lib/study-plan-engine/plan-store.service.ts`)
- Replaced the per-domain `reviewBlockToTask()` loop with a single `reviewSessionToTask()` per review day
- New task: `category: 'Review Session'`, `subject: 'both'`, `title: 'Review Session'`
- No QB filters (`college_board_filters: null`), no skill label
- Duration = `day.totalDurationMinutes` (full review allocation), priority 50, replanning weight 0.5
- Removed the now-unused `applyInventoryCapReview()` private method and `ReviewBlock` import

#### Colors (`components/calendar/task-colors.ts`)
- Added `'Review Session'` entry with identical slate colors to `'Full Practice Test'`
- Legend in calendar updated: "Practice Test" → "Practice Test / Review"

#### Adaptive Replanner (`lib/adaptive-replanner/index.ts`)
- No code change needed — replanner already skips tasks whose `category` doesn't match a domain label, so `'Review Session'` tasks are silently skipped (same as the `Full Practice Test` path but via the `if (!rd) continue` guard)

#### New Component (`components/calendar/review-session-dialog.tsx`)
- Slide-over drawer (same layout pattern as `TaskDrawer`) opens when user clicks a Review Session task
- Fetches active error logs client-side: `mastered = false`, `archived = false`, ordered by `created_at` desc
- Displays count of active mistakes and a `ReviewErrorCard` per entry
- Each card: mastered toggle (circle → marks mastered, removes from list), Pencil edit button (opens `EditErrorDialog`), expand/collapse for full detail (what I did, correct approach, my explanation, mark mastered button)
- Empty state: "No active mistakes" with `BookOpenCheck` icon
- Loading skeleton while fetching
- Footer: "Mark Session Complete" button (calls `onMarkComplete` + closes drawer); shows "Session completed" badge if already done

#### Calendar Client (`components/calendar/calendar-client.tsx`)
- Added `reviewSessionTask` state
- `openDrawer()` now routes `category === 'Review Session'` tasks to `ReviewSessionDialog` instead of `TaskDrawer`
- `ReviewSessionDialog` rendered alongside other dialogs

**TypeScript:** `npx tsc --noEmit` → 0 errors.

---

### Session 13 — Premium UI/UX Rebuild: Foundation (Phases 0–2)

Ground-up visual elevation of the app. **Foundation only** this session (tokens →
primitives → layout shell); page-by-page redesign is the next checkpoint, paused for
review. Branch: `ui-rebuild-premium`. No functional, schema, action, or planner
changes — `npm run build` clean, `npm run test` green (44/44).

**Phase 0 — Design tokens (`app/globals.css`):**
- Single-sourced color ramps via `@theme`; `:root` ramp aliases point at them.
- New **surface-elevation** tokens (`--surface-base/-raised/-overlay/-sunken`),
  warm-tinted off-whites in light, layered slate-950→900→800 in dark.
- **Hairline border** tokens (`--border` ~8%, `--border-strong` ~12%, `--input-border`).
- **`shadow-xs`→`xl`** scale = 1px ring + soft layered shadow (light + dark variants).
- Refined type scale (body 15px, display 28–40px @ `-0.02em`), radii standardized to
  8/10/14 (`--radius-sm/-md/-lg`), motion 150–200ms.
- Added `--accent` / `--accent-soft` (brand text/active states; violet-400 in dark),
  `--gradient-mesh`, `.sp-hover-lift`, `.sp-display`, `.sp-mesh` helpers, and a global
  `prefers-reduced-motion` guard. All prior token names + `sp-*` helpers preserved.

**Phase 1 — Primitives (`components/ui/`):**
- Refined: Button (depth + `icon-sm` size), Card (`interactive` prop, radius-lg,
  shadow-xs), Input/Textarea/Select (size variants, accent focus ring, surfaces),
  Badge (size variants), Tabs, Switch, Checkbox, Progress, Skeleton (shimmer),
  Dialog/Dropdown/Select/Toast (overlay surface + shadow-lg/xl), Label.
- **New:** `tooltip.tsx`, `segmented-control.tsx`, `empty-state.tsx`,
  `stat-card.tsx` (StatCard + MetricCard + DeltaBadge), `page-header.tsx`.

**Phase 2 — Layout shell (sidebar + top bar):**
- New `components/layout/sidebar.tsx` — fixed left sidebar, icon+label nav with active
  rail, user menu at bottom. New `components/layout/topbar.tsx` — breadcrumb (desktop) /
  logo (mobile), theme toggle, notification bell.
- `app/(dashboard)/layout.tsx` rewired to sidebar + offset content column; `mobile-nav`
  restyled to accent tokens; notification badge given a ring.
- `components/layout/navbar.tsx` is now **orphaned** (old top pill-nav, left in place,
  not imported). Safe to delete during page-redesign phase.

**Next:** page redesigns in order home → calendar → data → error-log → onboarding →
auth → tutorial → settings → inventory → marketing landing.

---

### Session 12 — Remove "Systems of equations" from Advanced Math

Removed the `'Systems of equations'` skill from the **Advanced Math** category across all three source files:
- `lib/constants.ts` — removed from `MATH_DOMAINS` Advanced Math skills array
- `lib/study-plan-engine/domain-catalog.ts` — removed from `advancedMath` domain skills
- `lib/sat-planner.ts` — removed from `advancedMath` domain skills

The **Algebra** category's `'Systems of linear equations'` skill was left untouched in all files.

---

### Session 11 — Question Inventory Page

**New feature:** Full Question Inventory page at `/inventory`.

#### Database
- New table `question_inventory` (global, no user_id) — section, domain, skill, difficulty, available_count
- RLS: authenticated users can read/insert/update/delete
- 29 seed rows covering all 8 SAT domains × all skills × difficulties
- Migration SQL added to `supabase/schema.sql` (Block 6)
- TypeScript types added to `types/database.ts` and `types/index.ts`

#### Server Actions (`actions/question-inventory.ts`)
- `getInventoryWithStats()` — inventory + per-user assigned/completed/remaining computed from calendar_tasks + question_sessions
- `createInventoryItem()`, `updateInventoryItem()`, `deleteInventoryItem()`
- `bulkImportInventory()` — upsert via JSON or CSV, validates section/difficulty/count
- `getInventoryLimits()` — helper for the planner engine

#### Navigation
- Added `Inventory` to desktop nav (`lib/constants.ts` NAV_LINKS)
- Added `QB Stock` link with Package icon to mobile nav

#### Page & Components (`app/(dashboard)/inventory/`, `components/inventory/`)
- `page.tsx` — server component, noStore(), fetches via getInventoryWithStats
- `inventory-client.tsx` — tab orchestrator (Overview / Inventory / Admin)
- `summary-cards.tsx` — 4 stat cards: Available, Assigned, Completed, Remaining
- `progress-visualization.tsx` — SVG circular progress + section stacked progress bars
- `inventory-table.tsx` — sortable, filterable, searchable, paginated table with color-coded Remaining badges
- `inventory-charts.tsx` — Recharts: by-section bar, by-difficulty bar, most-depleted-skills horizontal bar
- `inventory-admin.tsx` — CRUD editor + bulk JSON/CSV import (file upload + paste)
- `empty-state.tsx` — empty state with Import + Create buttons

#### Planner Integration (`lib/study-plan-engine/plan-store.service.ts`)
- `loadInventoryLimits()` — loads inventory map at plan-generation time
- `applyInventoryCap()` — caps StudyBlock question counts against remaining inventory; tracks cumulative per domain+skill+difficulty
- `applyInventoryCapReview()` — same for ReviewBlocks
- Gracefully no-ops if inventory table is empty or unavailable

---

## Earlier Sessions

### Session 10 — UI/UX Overhaul + Info Page Deletion

#### UI/UX Overhaul (visual-only — no logic/type changes)

**Design system (`app/globals.css`)**
- Refined dark mode palette: `--background: #0c1524`, `--card: #172033`, `--border: #2a3a52`, `--muted: #1a2840`, `--muted-foreground: #8facc8`
- Added `--shadow-violet` CSS var (violet glow drop shadow)
- Added `sp-shimmer` utility class + `sp-fade-in-up` keyframe animation
- Custom `input[type="range"]` thumb styling (violet, shadowed)

**Icon policy — all emoji replaced with Lucide SVG icons**
Every UI emoji was replaced. No emoji remain in rendered component JSX. Toast strings also cleaned up.

| Component | Icons added |
|---|---|
| `notifications-dropdown.tsx` | Clock, Trophy, Radio, Bot |
| `welcome-banner.tsx` | Flame, CalendarDays, Target, PartyPopper |
| `score-card.tsx` | TrendingUp, Target, Sparkles, CalendarCheck, AlertCircle |
| `ai-planner-trigger.tsx` | CheckCircle2 (success state) |
| `consistency-chart.tsx` | Flame (streak display) |
| `notification-prefs.tsx` | ClipboardList, CalendarDays, AlertTriangle, FileText |
| `step-3-analysis.tsx` | AlertTriangle, TrendingUp, CheckCircle2 (LevelBadge) |
| `step-4-recommendations.tsx` | ClipboardList (QB Filters), CheckCircle2 (study tips) |
| `day-tasks-panel.tsx` | ClipboardList (QB Filters label) |
| `error-row.tsx` | CheckCircle2 in Mastered badge and "Mark mastered" button |
| All data chart empty states | Lucide icons in styled containers |
| `tutorial-client.tsx` | `'Critical'` badge text (was `'⚠️ Critical'`) |

**Calendar (`calendar-client.tsx`)**
- Month view: past cells → `bg-slate-50/70 dark:bg-slate-900/40`, muted day numbers; today cell → `bg-violet-50/60 dark:bg-violet-900/10`; future cells with tasks → small violet dot indicator
- Week view: today column → `border-violet-300 dark:border-violet-700`; past column headers muted at `opacity-60`

**Navbar (`navbar.tsx`)**
- Pill nav with `bg-slate-100/80 dark:bg-slate-800/80` frosted glass + ring border
- Active link: white card background + violet text + ring

**Mobile nav (`mobile-nav.tsx`)**
- Active item: `bg-violet-100 dark:bg-violet-900/40` pill

**Chart tooltips (all data charts)**
- Unified `TIP_STYLE` with `boxShadow: '0 4px 12px -2px rgba(15,23,42,0.12)'`

#### Info Page Deletion

- Deleted `app/(dashboard)/info/` (page.tsx, loading.tsx, error.tsx)
- Deleted `components/info/` (about-section.tsx, faq-accordion.tsx, contact-form.tsx)
- Removed `{ href: '/info', label: 'Info & Contact' }` from `NAV_LINKS` in `lib/constants.ts`
- Desktop nav now has 5 links: Home · Calendar · Error Log · Data · Tutorial

---

## Completed Features

### Infrastructure
- Next.js 16.2.7 App Router at `/Users/darcywang/sat-prep-website`
- Supabase auth + database (`lib/supabase/client.ts`, `lib/supabase/server.ts`)
- `proxy.ts` guards all dashboard routes (Next.js 16 renamed Middleware → Proxy)
- Full Postgres schema in `supabase/schema.sql` with RLS on all tables
- Hand-written TypeScript types in `types/database.ts` + `types/index.ts`

### Authentication
- Email/password sign-in and sign-up via Supabase Auth
- `actions/auth.ts` — `signIn`, `signUp` (handles email confirmation flow), `signOut`
- Postgres trigger auto-creates a `users` row on signup

### Onboarding (`/onboarding`)
- 4-step wizard — basics, domain performance entry, diagnostic analysis, deterministic recommendations
- Saves profile, diagnostic tests, question sessions, study plan, score history, welcome notification
- Fires `runAdaptiveReplanner` on completion to seed initial task metadata

### Study Plan Engine (`lib/study-plan-engine/`)
- Deterministic day-by-day schedule generator; entry point: `StudyPlanEngine.generate(input)`
- Writes one `study_plans` row + per-day `calendar_tasks` rows with QB filters and replanner metadata
- Supports `daySchedule` override (any DOW can be study/review/rest)
- Domain rotation uses running `studyDayGlobalIdx` counter (not day-of-week)
- **Inventory-aware assignment** (`plan-store.service.ts`): loads `question_inventory` at plan-generation time; enforces per-`(domain, skill, difficulty)` caps via cumulative tracking; floors each block at ≥80% of study time; substitutes another skill in the same subject (by adaptive priority) when the planned skill runs low; converts remaining study days to `'Review Session'` Review & Practice tasks once the full bank is exhausted; writes a `type:'system'` notification; returns `inventoryExhausted` + `nearlyExhaustedSkills` to the caller

### Adaptive Replanner (`lib/adaptive-replanner/`)
- Entry point: `runAdaptiveReplanner(supabase, userId, triggeredBy, triggerId?)`
- **Trigger types:** `question_session` | `error_log` | `practice_test_score` | `manual` | `behind_schedule`
- 6-factor mastery score (accuracy × 0.30, recent × 0.25, improvement × 0.15, mistakes × 0.15, confidence × 0.10, consistency × 0.05)
- Volume multipliers: Mastered ×0.70 / Proficient ×1.00 / Developing ×1.25 / Needs Work ×1.50
- Writes: `topic_mastery`, `score_predictions`, `plan_versions`, `adaptive_recommendations`, `replan_audit_logs`
- Returns `ReplannerResult` with `DomainChange[]`, `predictedScore`, `auditLogId`

### Calendar (`/calendar`)
- **Month / Week / Agenda views** with view switcher; color-coded task chips; drag-and-drop rescheduling
- **Visual states:** past cells muted, today cell violet tint, future task dot indicators
- **Task Drawer** — QB filters (ClipboardList icon label), step-by-step QB instructions, expected time, adaptive-planner stats
- Footer actions: "Log Session" → `SessionWorkflowDialog`, "Enter Score" → `PracticeTestScoreDialog`
- **Review Session routing** — clicking a `'Review Session'` task opens `ReviewSessionDialog` (not `TaskDrawer`)

### Review Session Dialog (`components/calendar/review-session-dialog.tsx`)
- Slide-over for Saturday review days; fetches active (unmastered, unarchived) error log entries
- Per-entry: inline mastered toggle (removes from list immediately), Pencil → `EditErrorDialog`, expand/collapse detail
- Empty state with `BookOpenCheck` icon; loading skeleton; "Mark Session Complete" footer button

### Session Workflow (`SessionWorkflowDialog`)
- **6-phase UX:** idle → active → review → results → missed_analysis → plan_updated
- Countdown timer (71s/q R&W, 95s/q Math), per-question A/B/C/D entry, correct-answer review
- **Missed-analysis phase:** per-wrong-answer selects for subtopic + mistake type; auto-creates `error_log` rows
- **Plan Updated phase:** improvement %, topic mastery bar, replanner domain changes, predicted score

### Question Inventory (`/inventory`)
- Admin-managed catalog (`question_inventory` table) of CB QB available question counts per `(section, domain, skill, difficulty)`
- Summary stat cards: Available / Assigned / Completed / Remaining
- SVG circular progress + section stacked progress bars
- Sortable/filterable/paginated table with color-coded Remaining badges
- Recharts: by-section bar, by-difficulty bar, most-depleted horizontal bar
- CRUD editor + bulk JSON/CSV import (file-upload + paste)
- `actions/question-inventory.ts` — `getInventoryWithStats()`, CRUD, `bulkImportInventory()`, `getInventoryLimits()`

### Error Log (`/error-log`)
- Full-text search, multi-field filters, sort, Active/Archived tabs
- Edit dialog, confidence rating (1–5), question ID chip (8-char alphanumeric)
- Mastered badge (CheckCircle2 icon), "Mark mastered" button with icon
- Mistake-type badges: BookOpen / Zap / Clock / Target / HelpCircle
- `archiveErrorLog(id, archived)` action

#### DB columns on `error_logs` (apply Block 2 migration if not done):
`corrected_explanation`, `confidence_rating`, `archived`, `custom_mistake_type`, `question_id`, `student_answer`, `correct_answer`

### Data / Analytics (`/data`)
- 8 parallel server fetches with `noStore()`
- Sections: Performance, Topic Analysis, Mistake Analysis, Study Habits, Planning Intelligence
- `useReplanLogs` hook bypasses router cache for fresh replan data
- `PredictedScoreWidget` + `TopicMasteryCards` imported from `components/ai-coach/`

### QB Tutorial (`/tutorial`)
- 7-step interactive QB workflow walkthrough; per-step help accordions; localStorage progress tracker; FAQ

### Settings (`/settings`)
- Notification preferences: email + in-app channels, reminder types (daily/overdue/practice test), timezone
- `saveNotificationPreferences()` + `sendTestReminder()` server actions

---

## Required DB Migrations

Run all three blocks in Supabase SQL Editor. Idempotent (safe to re-run).
Full SQL in `AI_HANDOFF.md` and `supabase/schema.sql`.

| Block | Tables/columns |
|---|---|
| Block 1 | `calendar_tasks` replanner columns + `replan_audit_logs` |
| Block 2 | `error_logs` extended columns |
| Block 3 | `topic_mastery`, `plan_versions`, `score_predictions`, `adaptive_recommendations` |
| Block 6 | `question_inventory` table (29 seed rows covering all 8 domains × skills × difficulties) |

If you see `Could not find column X in schema cache`: run migrations, then reload schema cache via Supabase Dashboard → Database → Reload Schema Cache.

---

## Not Yet Built

1. **"Replan Now" UI** — `triggerManualReplan()` action exists in `actions/adaptive-replanner.ts`. Still need a button in the UI (calendar header or home page).

2. **Notifications real-time badge** — `notifications` table is populated, `NotificationsDropdown` renders the list, but there is no live unread count on the bell icon. Options: Supabase Realtime subscription, or fetch-on-mount in the dropdown.

3. **QB Tutorial screenshots** — Each step in `tutorial-client.tsx` has a `ScreenshotPlaceholder`. Replace with `<Image>` tags pointing to `public/tutorial/step-{1–7}.png`.

---

## Known Issues

None known. TypeScript is clean (`npx tsc --noEmit` passes with zero errors).

---

## Dead Code (safe to delete — confirmed not imported)

| File | Reason |
|---|---|
| `components/calendar/day-tasks-panel.tsx` | Legacy sidebar, never rendered |
| `components/calendar/log-session-dialog.tsx` | Superseded by SessionWorkflowDialog |
| `components/data/topic-rankings.tsx` | Removed from Data tab in Session 8 |
| `components/data/stats-cards.tsx` | Legacy, not imported |
| `components/data/score-timeline.tsx` | Legacy (data tab uses `score-trend.tsx`) |
| `components/data/accuracy-chart.tsx` | Legacy (data tab uses `accuracy-trends.tsx`) |
| `components/data/category-stats.tsx` | Legacy, not imported |
| `components/ai-coach/ai-coach-panel.tsx` | Route `/ai-coach` deleted in Session 8 |

---

## Next Recommended Tasks

### Option A — "Replan Now" button
Add a manual replanning trigger. `triggerManualReplan()` is ready in `actions/adaptive-replanner.ts`. Add a button to the calendar header (`calendar-client.tsx`) or home page. Show a toast with `tasksUpdated` + `predictedScore` on success.

### Option B — Surface `inventoryExhausted` to the UI
`StudyPlanEngine.generate()` now returns `inventoryExhausted: boolean` and `nearlyExhaustedSkills: string[]`. Consider showing a warning banner when the Home page triggers plan generation and `inventoryExhausted` is true, or when the plan meta contains tasks with `category: 'Review & Practice — Question Bank Complete'`. The system notification is already written, but a proactive visual prompt would be more discoverable.

### Option C — Notifications live unread count
Wire the bell icon to show a red dot or count badge. Subscribe to the `notifications` table via `supabase.channel(...)` + `on('postgres_changes', ...)` in `notifications-dropdown.tsx`, or poll on mount. The dropdown UI is already built.

### Option D — QB Tutorial screenshots
Capture real screenshots of each QB step and save to `public/tutorial/step-{1–7}.png`. Replace `ScreenshotPlaceholder` in `components/tutorial/tutorial-client.tsx`.

### Option E — Delete dead code
Remove the 8 files listed in Dead Code above. No other files import them.

### Option F — Error Log analytics on /data
Surface the error log data in the Data page: mistake-type breakdown chart, domain weakness heatmap, confidence trend line. Components already exist (`MistakeFrequency`) — extend with date-filtered variants.

---

## Implementation Rules (never violate)

1. **No OpenAI.** All planning is deterministic TypeScript. Never introduce an LLM dependency.
2. **Tailwind CSS v4** — use `@import "tailwindcss"` in `globals.css`. Never use `@tailwind base/components/utilities`.
3. **TypeScript strict.** No `any` except intentional Supabase cast workarounds (marked with comments).
4. **`schema.sql` is a reference, not an auto-migration.** Always apply changes manually in Supabase.
5. **Never store SAT question content.** Question ID is an 8-char identifier only. Never store text, passages, or answer choices.
6. **Answer choices stored as A/B/C/D letters only.** Never store the text of answer choices.
7. **`replan_locked = true` tasks are immutable to the replanner.** Set by `toggleTaskComplete`.
8. **Replanner never deletes or adds tasks.** Only UPDATEs existing rows.
9. **`question_sessions` is the canonical source of truth** for topic performance — not `diagnostic_tests`.
10. **`data/page.tsx` must always use `noStore()`.** Never remove it.
11. **QB URL:** `https://satsuiteeducatorquestionbank.collegeboard.org/digital/search` — always in `lib/constants.ts`.
12. **No emoji in component JSX.** Use Lucide React icons. All emoji have been removed as of Session 10.
