---
name: feedback-nextjs16-patterns
description: Next.js 16 breaking changes and correct patterns to use in this project
metadata:
  type: feedback
---

Next.js 16 uses `proxy.ts` (not `middleware.ts`). The exported function must be named `proxy` or be a default export. The `middleware` export name is deprecated.

**Why:** Next.js 16 renamed Middleware to Proxy. Using `middleware.ts` still works but logs a deprecation warning.

**How to apply:** Always create `proxy.ts` at the project root with `export function proxy(request: NextRequest)` and the `config.matcher`.

---

Supabase Database type requires `Relationships: []` on every table and `Views/Functions` fields at the schema level to match `GenericTable`/`GenericSchema` types, otherwise `.insert()` resolves to `never[]`.

**Why:** Supabase's `GenericTable` requires all four fields (Row, Insert, Update, Relationships). Missing any causes TypeScript to fail to match the type, collapsing insert to never.

**How to apply:** Every table in `types/database.ts` must include `Relationships: []`. The public schema must include `Views: Record<string, never>` and `Functions: Record<string, never>`.

---

Tailwind CSS v4 dark mode class variant must be declared with `@custom-variant dark (&:where(.dark, .dark *))` in globals.css.

**Why:** v4 uses a different config system — no tailwind.config.js. Variants are declared in CSS directly.

**How to apply:** Add this line at the top of globals.css after `@import "tailwindcss"`.
