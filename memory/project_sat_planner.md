---
name: project-sat-planner-ai
description: Core project details for SAT Study Planner AI — tech stack, architecture, and setup requirements
metadata:
  type: project
---

Full-stack SAT prep platform built with Next.js 16 App Router + Supabase + OpenAI.

**Why:** Production-ready SAT study planning app with AI-generated study plans, error tracking, score analytics, and College Board QB filter recommendations (no actual questions stored — copyright compliant).

**Tech Stack:**
- Next.js 16.2.7 (App Router, proxy.ts NOT middleware.ts)
- React 19.2.4
- Tailwind CSS v4 (`@import "tailwindcss"`, `@custom-variant dark`)
- Supabase (auth + PostgreSQL via @supabase/ssr)
- OpenAI gpt-4o-mini for study plan generation
- Recharts for data visualization
- Radix UI primitives for components

**Architecture:** Route groups `/(auth)` and `/(dashboard)`, server components by default, `'use client'` only for interactivity. Params are Promises in Next.js 16.

**Required env vars:** NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, OPENAI_API_KEY

**Database setup:** Run `supabase/schema.sql` in the Supabase SQL editor before first use. Includes RLS policies and auto-user-profile trigger.

**How to apply:** When working on this project, check schema.sql first for table structure. Use `createClient()` from `@/lib/supabase/server` in Server Components/Actions, `createClient()` from `@/lib/supabase/client` in Client Components.

[[feedback-nextjs16-patterns]]
