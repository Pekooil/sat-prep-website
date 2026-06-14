# Legal Compliance

This document maps SaturnPath's US legal responsibilities to where each is
satisfied in the codebase, and lists the operational steps that must be done
**outside the code** before public launch.

> Scope decision: **US-only** audience. COPPA + CCPA/CPRA + state student-privacy
> (e.g. California SOPIPA) + CAN-SPAM + ADA/WCAG. No GDPR data-subject workflows or
> blocking cookie-consent gate are implemented (analytics are cookieless).
>
> ⚠️ These are good-faith baselines drafted from the app's actual practices. They
> are **not a substitute for review by qualified legal counsel** before launch.

---

## Single source of truth

All legal/contact details live in **`lib/legal/config.ts`** (`LEGAL`). Update the
placeholders there once and every surface (policies, email footer, age gate) picks
them up: `legalEntity`, `privacyEmail`, `supportEmail`, `mailingAddress`,
`governingLaw`, `effectiveDate`, `minAge`.

---

## Obligations → where satisfied

| Obligation | How it's met | Files |
|---|---|---|
| **COPPA** — no accounts for under-13 | Neutral birth-year age screen; under-13 blocked client- and server-side (`validateAgeConsent`) before any account is created | `lib/legal/config.ts`, `app/(auth)/signup/page.tsx`, `components/onboarding/onboarding-wizard.tsx`, `actions/auth.ts`, `actions/onboarding.ts` |
| **Minor consent** — parent/guardian permission for under-18 | Conditional parental-acknowledgement checkbox (required when age < 18); recorded as `users.parental_ack` | same as above + `users.terms_accepted_at` |
| **Consent record** | Timestamp of Terms/Privacy acceptance stored at signup (`users.terms_accepted_at`); explicit "I agree" checkbox | signup + onboarding |
| **CCPA/CPRA** — notice at collection, rights (know/correct/delete/non-discrimination), "do not sell/share" | Dedicated section in Privacy Policy; **self-service deletion** in Settings | `app/(legal)/privacy/page.tsx`, `actions/account.ts`, `components/settings/delete-account.tsx` |
| **Right to delete** | One-click account + data deletion (admin cascade delete of `auth.users` → all user-owned tables) | `actions/account.ts`, `components/settings/delete-account.tsx`, login `?deleted=1` banner |
| **Student data / SOPIPA / FERPA** | Statement: no sale of student data, no targeted ads, no behavioral profiling; school/FERPA cooperation note | `app/(legal)/privacy/page.tsx` |
| **CAN-SPAM** — unsubscribe + physical address in commercial email | Reminder email footer includes manage-preferences/unsubscribe link + `LEGAL.legalEntity` + `LEGAL.mailingAddress` | `lib/email/reminder-template.ts` |
| **Cookie / analytics transparency** | Non-blocking dismissible notice + Privacy Policy "Cookies & analytics" section (cookieless Vercel Analytics) | `components/legal/cookie-notice.tsx`, `app/layout.tsx`, `app/(legal)/privacy/page.tsx` |
| **Policy discoverability** | Privacy + Terms linked from landing footer, login, signup, onboarding, legal layout, and email | `components/marketing/landing-page.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx`, `app/(legal)/layout.tsx` |
| **College Board copyright / SAT™** | No SAT content stored/shown (see `COPYRIGHT_COMPLIANCE.md`); trademark + "not affiliated" disclaimer in Terms and landing footer | `COPYRIGHT_COMPLIANCE.md`, `app/(legal)/terms/page.tsx`, `components/marketing/landing-page.tsx` |
| **Accessibility (ADA/WCAG)** | WCAG 2.1 AA commitment + accessibility contact in Terms; skip-link + `prefers-reduced-motion` in app | `app/(legal)/terms/page.tsx`, `app/layout.tsx`, `app/globals.css` |

---

## Database

Migration adds three columns to `users` (apply manually in the Supabase SQL Editor —
`schema.sql` is reference-only). Idempotent:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_year        SMALLINT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS parental_ack      BOOLEAN DEFAULT FALSE;
```

Only the birth **year** is stored (not full DOB) to minimize personal data held
about minors.

---

## Operational pre-launch checklist (NOT code)

- [ ] **Apply the `users` migration** above in the Supabase SQL Editor (signup will
      error until `birth_year` / `terms_accepted_at` / `parental_ack` exist).
- [ ] **Replace every placeholder in `lib/legal/config.ts`** — real legal entity name,
      monitored `privacyEmail` + `supportEmail`, and a valid physical `mailingAddress`
      (the address is **legally required** by CAN-SPAM for any marketing email).
- [ ] **Counsel review** of Privacy Policy + Terms, especially the minors (COPPA),
      student-data (FERPA/SOPIPA), and CCPA/CPRA sections.
- [ ] **Sign DPAs** with subprocessors: Supabase (DB/auth), Vercel (hosting/analytics),
      Resend (email).
- [ ] **Verify Resend** sender domain + `RESEND_FROM_EMAIL`; confirm the postal address
      renders in a real reminder email.
- [ ] **Waitlist launch email**: when you build the marketing blast that emails
      `waitlist_signups`, it MUST reuse the CAN-SPAM footer (entity + address +
      one-click unsubscribe). The consent microcopy at the signup point is in place.
- [ ] **Abuse protection** for anonymous auth (Supabase Auth CAPTCHA / Turnstile) +
      an anonymous-user cleanup job before re-enabling guest paths at scale (see
      `ENABLE_GUEST_ONBOARDING`).
- [ ] **`ADMIN_EMAILS` + `CRON_SECRET`** set in prod (carried over from Session 17).

---

## Notes / out of scope

- **GDPR/UK-GDPR**: not implemented (US-only). If EU/UK users are ever targeted, add a
  blocking cookie-consent gate, lawful-basis disclosures, and DSAR workflows.
- **Verifiable parental consent for under-13**: not built — under-13 is blocked instead.
- `waitlist_signups` holds only an email and is intentionally unlinked from user data;
  `deleteAccount()` does not touch it (covered by an emailed request).
