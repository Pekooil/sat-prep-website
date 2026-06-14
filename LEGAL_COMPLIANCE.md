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

All legal/contact details live in **`lib/legal/config.ts`** (`LEGAL`). Update them
once and every surface (policies, email footer, age gate) picks them up:
`legalEntity`, `privacyEmail`, `supportEmail`, `mailingAddress`, `governingLaw`,
`effectiveDate`, `minAge`.

**Operating model:** SaturnPath is a **free, non-commercial, individual-run project**
— there is **no registered company**, so `legalEntity` identifies the project/operator
rather than an LLC/Inc. This matters legally:
- **CCPA/CPRA likely does not strictly apply** — it binds for-profit "businesses"
  meeting revenue/volume thresholds. The CCPA-style rights in the Privacy Policy are
  kept as good practice (and because self-service deletion already exists), but a hobby
  project is generally out of scope.
- **COPPA still applies** — it governs collecting data from under-13s regardless of
  profit. The age gate (block <13) is the key control and is in place.
- **CAN-SPAM physical-address requirement is deferred** — it applies to *commercial*
  email only. Today's reminder emails are transactional (user-enabled, account-related)
  and exempt, so `mailingAddress` is intentionally empty and the address line is omitted
  everywhere. It MUST be set before any marketing email (the waitlist launch blast).

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

- [ ] **Apply the `users` migration** above (`birth_year` / `terms_accepted_at` /
      `parental_ack`) in the Supabase SQL Editor — **still pending** (production-schema
      changes are a manual human step). Signup will error until these columns exist.
- [x] **Contact details in `lib/legal/config.ts`** — `privacyEmail`/`supportEmail` set to
      `saturnpathsupport@gmail.com`; `legalEntity` reflects the non-commercial project
      (no LLC); `mailingAddress` intentionally empty (see operating-model note above).
- [ ] **Before any marketing email** (waitlist launch blast): set a real
      `mailingAddress` in `lib/legal/config.ts` (CAN-SPAM). Free options: your own
      home address, a relative's/friend's address with permission, or a free virtual-
      mailbox trial. USPS PO Boxes and paid virtual mailboxes also work but cost money.
      The blast MUST reuse the email footer (entity + address + one-click unsubscribe);
      the signup-point consent microcopy is already in place.
- [ ] **Counsel review** of Privacy Policy + Terms (optional for a hobby project, but
      recommended if usage grows) — focus on the minors (COPPA) and student-data
      (FERPA/SOPIPA) sections.
- [ ] **Sign DPAs** with subprocessors when feasible: Supabase, Vercel, Resend
      (standard click-through DPAs; lower priority for a non-commercial project).
- [ ] **Verify Resend** sender domain + `RESEND_FROM_EMAIL` before relying on email.
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
