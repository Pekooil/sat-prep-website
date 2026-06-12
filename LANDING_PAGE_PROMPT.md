# Claude Code Prompt — Replace `/login` redirect with a Demo + Wishlist Landing Page

Copy everything below the line into Claude Code.

---

## Task

We launch in 5 weeks. Replace the current root experience (which just redirects visitors to `/login`) with a polished, marketing-grade **landing page** at `/` for **SaturnPath**. The page introduces the product and captures interest via a **Join Wishlist** email form. It must NOT wire up any real app features (no onboarding, no planner, no dashboard) — the only backend it touches is a brand-new, isolated waitlist table.

## First, read the project docs (required by AGENTS.md / CLAUDE.md)

Read these before writing any code: `PROJECT_CONTEXT.md`, `AI_HANDOFF.md`, `DATABASE_SCHEMA.md`, `PLANNER_ALGORITHM.md`, `COPYRIGHT_COMPLIANCE.md`, and `AGENTS.md`. Note the hard rules: this is **Next.js 16** (App Router, Server Components, Server Actions, Middleware is renamed `proxy.ts`) with **breaking changes from older Next.js** — read `node_modules/next/dist/docs/` before using any API you're unsure about. **TypeScript strict mode** must be maintained. Never store or display SAT questions or College Board content.

## Design system to reuse (do not invent a new one)

The app uses a "Quiet Monochrome" system defined in `app/globals.css`: near-monochrome true-gray (the `slate-*` ramp is re-authored to zinc values), a single restrained **violet** accent (`violet-400/500/600`), dark mode on by default (`<html class="dark">`). Primary actions are high-contrast neutral fills (near-black on light / near-white on dark) — the Vercel/Linear signature — NOT the accent color. Hairline borders + soft shadows for elevation, no gradient washes or mesh. Reuse semantic tokens (`--surface-*`, `--border`, `--accent`, `--primary`, `--text-*`) and existing primitives in `components/ui/` (`button.tsx`, `input.tsx`, `card.tsx`, `badge.tsx`, etc.). Reuse `components/layout/saturn-path-logo.tsx` (`SaturnPathLogo`) for branding. Fonts are Geist Sans/Mono via the root layout. Honor `prefers-reduced-motion`; keep motion quiet and fast (120–200ms ease-out). The existing `app/(auth)/layout.tsx` has a hand-drawn Saturn SVG and orbit textures you can draw inspiration from for visual cohesion.

## Routing changes

Currently `app/page.tsx` is a server component that redirects authenticated users to `/home` and everyone else to `/login`. Change it so that:

- **Logged-in users** are still redirected straight to `/home` (preserve the existing Supabase `getUser()` check).
- **Logged-out users** see the new landing page instead of being bounced to `/login`.

Keep `/login` and `/signup` fully functional at their URLs. Add a **discreet "Sign in" link** in the landing page's top nav pointing to `/login` so existing users (and you) can still get in. Verify `proxy.ts` does not redirect `/` away — `/` should be publicly reachable.

Build the landing UI as a dedicated client component (e.g. `components/marketing/landing-page.tsx`) rendered by the server `app/page.tsx`, so the redirect logic stays server-side and the interactive form stays client-side.

## Page structure & content

Make it impressive and demonstrative — take inspiration from high-quality SaaS landing pages (Linear, Vercel, Superhuman, Notion): generous whitespace, strong typographic hierarchy, a focused hero, and clean feature sections. Sections, top to bottom:

1. **Top bar** — `SaturnPathLogo` on the left; on the right, the title/wordmark area plus a primary **Join Wishlist** button (smooth-scrolls to the wishlist form or focuses the hero email input) and a small secondary **Sign in** link to `/login`.
2. **Hero** — the product title/headline and a prominent **Join Wishlist** call to action at the very top of the page content (per the requirement that "the top should be the title and the join wishlist button"). One-line subhead positioning SaturnPath as a personalized, data-driven SAT prep planner. Include the email input + Join Wishlist submit here as the primary conversion point. Consider a tasteful Saturn/orbit visual consistent with the brand.
3. **Core features** — three feature blocks, each with a Lucide icon, short title, and 1–2 sentence description:
   - **Adaptive planning** — a study plan that reranks your weak domains as you practice and reshapes your day-by-day schedule automatically. (Describe the value; do not expose internal planner mechanics or any SAT question content.)
   - **Automated error log** — your mistakes are captured and turned into targeted review, so you stop missing the same things twice.
   - **Completely free for everyone** — full access, no paywall, no tiers.
4. **Secondary "how it works" / demo strip (optional but encouraged)** — a brief, visual 3-step explanation (plan → practice with College Board Question Bank → log results & adapt). Keep it copyright-safe: reference the official free CB Question Bank workflow, never embed or mock real SAT questions.
5. **Closing CTA** — repeat the Join Wishlist form with a short reassurance line ("Launching on 7/17/2026 — be first in line. No spam.").
6. **Footer** — logo, copyright, and the discreet sign-in link.

All marketing copy is yours to write — keep it confident and concise. Do **not** link any button to onboarding, the planner, or dashboard routes. The only working interaction is the wishlist form.

## Wishlist email capture (the only backend touch)

Store submissions in a brand-new, isolated Supabase table — keep it completely separate from app/user tables.

**Schema** — add to `supabase/schema.sql` following the existing conventions (idempotent `CREATE TABLE IF NOT EXISTS`, `gen_random_uuid()` PKs, `TIMESTAMPTZ DEFAULT NOW()`):

```sql
CREATE TABLE IF NOT EXISTS waitlist_signups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  source      TEXT DEFAULT 'landing',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE waitlist_signups ENABLE ROW LEVEL SECURITY;

-- Public sign-up: anonymous + authenticated may INSERT only. No public SELECT/UPDATE/DELETE.
DROP POLICY IF EXISTS "Anyone can join the waitlist" ON waitlist_signups;
CREATE POLICY "Anyone can join the waitlist"
  ON waitlist_signups FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
```

Do not add a public SELECT policy — rows should only be readable via the service role / Supabase dashboard, so emails aren't exposed to anonymous visitors.

**Server action** — create `actions/waitlist.ts` (`'use server'`) mirroring the pattern in `actions/error-logs.ts` (use `createClient()` from `@/lib/supabase/server`). A `joinWaitlist(formData)` action that: validates the email server-side (basic shape check), inserts `{ email, source: 'landing' }`, treats a unique-violation as a friendly success ("You're already on the list"), and returns `{ success: true }` or `{ error: string }`. Do **not** require auth and do **not** trigger the replanner or any app logic. The client form should show pending, success, and error states using the existing toast (`components/ui/use-toast.ts`) or inline messaging, matching how `app/(auth)/login/page.tsx` handles form state.

**Types** — regenerate or hand-add the `waitlist_signups` row/insert types in `types/database.ts` to keep TypeScript strict mode happy (the codebase uses hand-written Supabase types there). Follow the existing `Database['public']['Tables']` shape.

## Constraints recap

- Keep TypeScript strict mode clean; run the type-check/lint the project uses before finishing.
- Reuse existing design tokens and `components/ui` primitives — no new design language, no new color ramps.
- Fully responsive (mobile → desktop) and accessible: real `<label>`s, keyboard-focusable, visible focus rings, honors reduced motion, works in dark mode (default) and light.
- No SAT questions, passages, answer choices, or College Board content anywhere on the page (per `COPYRIGHT_COMPLIANCE.md`). Referencing the free CB Question Bank workflow by name is fine.
- The landing page must not connect to onboarding/planner/dashboard. Wishlist is the only live action.

## Verification (do this before reporting done)

1. Type-check + lint pass with zero new errors (strict mode).
2. Build succeeds (`next build` or the project's build script).
3. Logged-out visit to `/` shows the landing page; logged-in visit to `/` still redirects to `/home`; `/login` and `/signup` still work; "Sign in" link reaches `/login`.
4. Submitting the wishlist form inserts a row into `waitlist_signups` and a duplicate email returns the friendly already-on-list message rather than an error.
5. Visually check hero, three feature blocks, and CTA in both dark and light mode and at mobile width.

## Documentation (required by CLAUDE.md session-end rules)

After implementing, update `PROJECT_HANDOFF.md` and `PROJECT_CONTEXT.md` (new `/` landing page behavior, new `waitlist_signups` table, new `actions/waitlist.ts`), update `DATABASE_SCHEMA.md` with the `waitlist_signups` table, and verify `COPYRIGHT_COMPLIANCE.md` still holds (it does — no SAT content is added). Summarize the completed work at the end.
