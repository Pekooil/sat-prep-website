# SaturnPath — Full UI/UX Rebuild (paste this into Claude Code)

## Read this first

You are doing a **ground-up rebuild of the entire visual layer** of SaturnPath. This is not a touch-up. The last attempt only moved the navigation to the left and recolored a few classes — that is an explicit failure of this task. If at the end the app is recognizably the same skin with minor tweaks, you have not done the job.

**The bargain:** every pixel of presentation is yours to delete and re-author. Every line of business logic, data flow, and persistence must survive untouched. You are replacing *how it looks and feels*, not *what it does*.

Before writing any code, read these and confirm you understand the system:
`CLAUDE.md`, `AGENTS.md`, `PROJECT_CONTEXT.md`, `AI_HANDOFF.md`, `DATABASE_SCHEMA.md`, `PLANNER_ALGORITHM.md`, `COPYRIGHT_COMPLIANCE.md`, `PROJECT_HANDOFF.md`, and `app/globals.css` (the current design-token system).

---

## Non-negotiable constraints (do NOT change)

1. **No behavior changes.** All server actions in `actions/`, the planner engine in `lib/study-plan-engine/` and `lib/adaptive-replanner/`, Supabase queries, auth flow, onboarding gating, and email/reminder logic must keep working identically.
2. **No database changes.** Do not alter the schema, table names, columns, RLS, or `lib/supabase/` clients. UI reads/writes the same shapes it does today.
3. **No route changes.** Keep every route in `app/`: `(auth)/login`, `(auth)/signup`, `(dashboard)/{home,calendar,data,error-log,inventory,settings,tutorial}`, `onboarding`. Keep the `(auth)` / `(dashboard)` group structure and their `layout.tsx` data-loading.
4. **Preserve component prop contracts and data flow.** You may completely rewrite a component's JSX and styling, but a component's inputs/outputs (props, server-action calls, returned data) must stay compatible so nothing upstream breaks.
5. **Copyright rules stand.** Per `COPYRIGHT_COMPLIANCE.md`: never store, display, or reproduce SAT questions or College Board content. Only ever reference Question Bank *filters*. The redesign must not introduce any UI that displays question content.
6. **TypeScript strict mode stays green.** No `any` escape hatches, no `@ts-ignore` to paper over a refactor.
7. **Keep the stack.** Next.js 16 App Router, React 19, Tailwind v4 (CSS-first `@theme` in `globals.css`), Radix primitives, `class-variance-authority` + `clsx` + `tailwind-merge`, `lucide-react`, `recharts`, Geist font. Do not add a UI framework (no MUI/Chakra/etc.) or a second styling system.
8. **Update docs at the end** per `CLAUDE.md`'s Session End Requirements (`PROJECT_HANDOFF.md`, and `PROJECT_CONTEXT.md` if the design system section changed).

---

## What this rebuild is NOT

To be unambiguous, the following do **not** count as completing this task:
- Moving, recoloring, or restyling only the navigation.
- Swapping the accent hue while leaving layouts, spacing, type, and components as-is.
- Adding a few shadows or rounding a few corners.
- Editing only `globals.css` token values without re-authoring the components that consume them.

A correct result re-authors the **token system, every shared UI primitive, the app shell, and every screen's layout and visual treatment.**

---

## Target aesthetic

Reference quality bar: **Vercel, Linear, Notion, Superhuman.** Match their *level of craft*, not their literal screens. Synthesize them into one coherent system:

- **Near-monochrome with a single restrained accent.** Neutrals (true grays, near-black, near-white) do almost all the work. Color appears only with intent: primary actions, focus, active/selected state, and a few key data points. No gradient fills, no mesh backgrounds, no gradient avatars, no decorative violet washes. Retire the current `--gradient-brand`, `--gradient-mesh`, `--gradient-card`, `--gradient-avatar` usage in favor of flat, confident neutral surfaces.
- **Both themes fully polished.** Light mode = Vercel/Notion: crisp near-white, high contrast, generous whitespace, hairline borders, soft shadows. Dark mode = Linear/Superhuman: deep near-black charcoal, elevation expressed through subtle borders and faint top highlights rather than heavy shadows, quiet glow only on the accent. Neither theme is an afterthought — review both on every screen.
- **Typography-led hierarchy.** Tighter tracking on headings, a clear type scale, restrained weights (favor 500/600 over 700), and real vertical rhythm. Let type and spacing create hierarchy instead of boxes-within-boxes.
- **Calm density.** Linear/Superhuman density without clutter: comfortable line-height, consistent 8px spacing grid, clear sections, no nested-card soup.
- **Quiet, fast motion.** 120–200ms ease-out transitions on hover/active/state changes; subtle entrance for dialogs/menus. Nothing bouncy or slow. Respect `prefers-reduced-motion`.
- **Premium primary action.** Primary buttons read as high-contrast neutral (near-black on light, near-white on dark) — the Vercel/Linear signature — while the chromatic accent is reserved for focus rings, active nav, selection, and key chart highlights.

---

## Design system to author (in `app/globals.css`)

Keep the existing **semantic token *names*** (`--surface-base/raised/overlay/sunken`, `--background`, `--card`, `--border`, `--border-strong`, `--accent`, `--accent-soft`, `--primary`, `--text-heading/body/muted`, radius/shadow/motion/type scales, `--sidebar-width`, `--topbar-height`). Re-author their **values**. Reusing the names means the cascade does the heavy lifting and components stay wired up — but you must still revisit each component's treatment (below).

Author concrete, premium values for **both** themes. Suggested starting targets — tune for contrast (WCAG AA for text), don't paste blindly:

**Light (`:root`)**
- `--surface-base: #ffffff` (or a hair off, e.g. `#fafafa`); `--surface-raised: #ffffff`; `--surface-sunken: #f4f4f5`; `--surface-overlay: #ffffff`
- `--border: rgba(0,0,0,0.07)`; `--border-strong: rgba(0,0,0,0.12)`
- `--text-heading: #0a0a0a`; `--text-body: #3f3f46`; `--text-muted: #71717a`
- Shadows: very soft, low-spread (Vercel-like). Keep the 1px ring + faint drop pattern but lighten it.

**Dark (`.dark`)**
- `--surface-base: #09090b` (near-black); `--surface-raised: #141417`; `--surface-overlay: #1c1c20`; `--surface-sunken: #0c0c0f`
- `--border: rgba(255,255,255,0.08)`; `--border-strong: rgba(255,255,255,0.14)`
- `--text-heading: #fafafa`; `--text-body: #c8c8cd`; `--text-muted: #8a8a92`
- Elevation: lean on borders + a faint inset top highlight (`inset 0 1px 0 rgba(255,255,255,0.04)`); keep drop shadows minimal.

**Accent (single, both themes)**
- One chromatic token used sparingly. To retain a hint of SaturnPath identity while reading monochrome, a refined indigo/violet works (e.g. light `--accent: #6d28d9`, dark `--accent: #8b5cf6`), with `--ring` matching. You may retune this in one place — it must remain a single restrained accent, not a fill color spread across surfaces.
- `--primary` (primary button fill) = high-contrast neutral: near-black on light, near-white on dark, with the opposite for `--primary-foreground`. This is the "premium" CTA treatment; keep the chromatic accent off of large filled areas.

**Type / spacing / radius / motion**
- Refine the existing scales for tighter, more deliberate hierarchy. Consider slightly smaller default radii for a sharper Linear/Vercel feel (e.g. cards ~10–12px, controls ~8px) — your call, but apply it consistently via the radius tokens.
- Keep the 8px spacing grid and motion tokens; make motion fast and ease-out.

Document the new system briefly at the top of `globals.css` so future sessions understand the monochrome-plus-accent intent.

---

## Components to re-author (in `components/ui/` and `components/layout/`)

Rewrite the visual treatment of every shared primitive so they express the new language. Logic/variants/Radix wiring stay; the look changes.

- **Primitives:** `button` (incl. cva variants — neutral primary, quiet secondary/ghost, subtle destructive), `input`, `textarea`, `select`, `checkbox`, `switch`, `label`, `badge`, `card`, `dialog`, `dropdown-menu`, `tabs`, `segmented-control`, `progress`, `separator`, `tooltip`, `toast`/`toaster`, `skeleton`, `empty-state`, `page-header`, `stat-card`.
- **Shell/layout:** `sidebar`, `topbar`, `mobile-nav`, `navbar`, `notifications-dropdown`, `saturn-path-logo`, `theme-toggle`, `theme-provider`.

Treatment direction: hairline borders over heavy shadows; generous padding; clear hover/active/focus states using the focus ring; quiet badges (text + subtle tint, not loud fills); cards as calm neutral surfaces, not gradient panels; tabs/segmented-control as Linear-style minimal switches; dialogs/menus with soft entrance motion and overlay scrim tuned per theme.

**Charts (`recharts`):** restyle to match — neutral gridlines/axes, the single accent for the primary series, muted neutrals for secondary series, theme-aware colors (read CSS vars / pass theme-aware palettes), tooltips that match the new card/overlay styling. Components in `components/data/`, `components/inventory/`, `components/ai-coach/`, `components/home/`.

---

## App shell & navigation

Redesign the shell to feel like Linear/Superhuman: a refined left sidebar (`--sidebar-width`), a quiet topbar (`--topbar-height`), and a polished mobile nav. Nav items get crisp active states (the accent rail/indicator can stay but make it tasteful), clean iconography (consistent `lucide-react` size/stroke), and a tidy user/account menu. Keep `NAV_LINKS` from `lib/constants` and the existing routes/icons mapping. The sidebar already lives on the left — improving only that is not sufficient; the whole shell and its contents must be rebuilt.

---

## Screen-by-screen

Redesign the layout and visual treatment of each, preserving all data and actions:

- **Home (`(dashboard)/home`)** — welcome, quick stats, score card, upcoming tasks, AI planner trigger. Make it a calm, scannable dashboard: a clear hero/summary, restrained stat tiles, a focused "today" list. Kill the banner-gradient look.
- **Calendar (`(dashboard)/calendar`)** — the daily-task calendar, day panel, task drawer, log-session / practice-test / session-workflow dialogs. Prioritize legibility of the month/week grid and a clean task drawer; tasteful color-coding via `task-colors.ts` retuned to the new palette.
- **Data (`(dashboard)/data`)** — the analytics surface (many charts/heatmaps/timelines). This is the showcase: a coherent grid of restyled charts, consistent card framing, theme-aware viz, clear section headers.
- **Error log (`(dashboard)/error-log`)** — mistake table, rows, type badges, add/edit dialogs. Make it a clean data table (Linear-grade rows, quiet badges, comfortable density). Never display question content — filters/metadata only.
- **Inventory (`(dashboard)/inventory`)** — Question Bank *filter* tracking, tables, charts, summary cards. Filters only, per copyright rules.
- **Settings (`(dashboard)/settings`)** — notification prefs. Clean settings layout with grouped sections and the new switches/inputs.
- **Onboarding (`onboarding`)** — the 4-step wizard + progress. Make it feel premium and effortless: focused single-column steps, clear progress, refined inputs. Preserve step logic and the completion gate.
- **Tutorial (`(dashboard)/tutorial`)** — restyle to match; keep the zoom/animation behavior.
- **Auth (`(auth)/login`, `(auth)/signup`)** — minimal, confident split or centered layout in the new language.

---

## Execution plan — foundation first, with review gates

Work in phases. **Stop and report at each gate** so the result can be reviewed before you go wider. Do not attempt the whole app in one undifferentiated pass.

**Phase 0 — Audit (no code).** Read the docs and `globals.css`. Produce a short written plan: the exact new token values for both themes, the component list you'll rewrite, and any risks. List what you will NOT touch (logic/data/routes). Wait for confirmation.

**Phase 1 — Foundation (STOP at the end for sign-off).**
1. Re-author the `globals.css` token system for both themes (monochrome + single accent).
2. Rewrite the shared UI primitives in `components/ui/` to the new language.
3. Rebuild the app shell: `sidebar`, `topbar`, `mobile-nav`, `theme-toggle`, logo.
4. Verify build + typecheck + lint + tests pass, and that **both themes** look right on at least the Home screen.
5. **Stop. Show before/after of the shell and primitives and the new token table. Wait for sign-off before redesigning screens.**

**Phase 2+ — Screens, one batch at a time.** After sign-off, redesign screens in this order, pausing between batches: (a) Home + Auth, (b) Data + charts, (c) Calendar, (d) Error log + Inventory, (e) Settings + Onboarding + Tutorial. After each batch: typecheck, lint, build, run tests, and visually verify both light and dark.

**Final — Docs + verification.** Update `PROJECT_HANDOFF.md` (and `PROJECT_CONTEXT.md` design section), re-verify `COPYRIGHT_COMPLIANCE.md` holds (no question content introduced), and summarize the work.

---

## Acceptance criteria / verification

Before calling any phase done, confirm:
- `npm run build` succeeds; TypeScript strict has no errors; `npm run lint` is clean; `npm run test` passes.
- Both **light and dark** themes are deliberately styled on every screen touched — check each.
- Responsive: mobile, tablet, desktop all hold up; mobile nav works.
- Accessibility: text meets WCAG AA contrast, focus states are visible everywhere, `prefers-reduced-motion` is respected, interactive elements are keyboard-reachable, Radix a11y intact.
- No question content is displayed anywhere; inventory/error-log reference filters/metadata only.
- No server action, query, route, or prop contract changed behavior.
- The result is visibly a different, premium product — not the old skin recolored.

## How to work

Make substantial, confident changes — you have permission to delete and rewrite presentation freely. When a layout isn't working, redesign it rather than patching it. Show before/after at each gate. If a constraint above ever seems to block a clearly better design, stop and ask rather than changing behavior or data. Prefer fewer, decisive commits per phase with clear messages.
