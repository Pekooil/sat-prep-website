import type { Metadata } from 'next'

// NOTE FOR OPERATORS: This is a good-faith baseline drafted from the app's actual
// data practices — it is NOT a substitute for review by qualified legal counsel
// before public launch, especially regarding minors (COPPA/FERPA) and any
// EU/UK/California users (GDPR/CCPA). Update CONTACT_EMAIL + COMPANY to real values.
const APP_NAME = 'SaturnPath'
const CONTACT_EMAIL = 'privacy@saturnpath.app'
const EFFECTIVE_DATE = 'June 10, 2026'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `How ${APP_NAME} collects, uses, and protects your information.`,
  robots: { index: true, follow: true },
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 text-xl font-semibold text-[var(--text-heading)]">{children}</h2>
}

export default function PrivacyPolicyPage() {
  return (
    <>
      <h1 className="text-3xl font-bold text-[var(--text-heading)]">Privacy Policy</h1>
      <p className="text-sm text-[var(--text-muted)]">Effective {EFFECTIVE_DATE}</p>

      <p>
        {APP_NAME} (&ldquo;we,&rdquo; &ldquo;us&rdquo;) provides a personalized SAT study-planning
        tool. This policy explains what information we collect, how we use it, who we share it with,
        and the choices you have. By creating an account you agree to this policy.
      </p>

      <H2>Information we collect</H2>
      <ul className="list-disc space-y-1.5 pl-5">
        <li><strong>Account information</strong> — your name, email address, and password (passwords are stored and verified by our authentication provider; we never see them in plain text).</li>
        <li><strong>Study profile</strong> — your current and target SAT scores, test date, and study-time preferences.</li>
        <li><strong>Study activity</strong> — practice sessions you log (questions attempted/correct by topic), error-log notes you write, scores you enter, generated study tasks, and reminder/notification preferences including your timezone.</li>
        <li><strong>Usage &amp; device data</strong> — aggregate, privacy-preserving analytics about page performance and visits, collected via Vercel Analytics and Vercel Speed Insights. These do not use advertising cookies.</li>
      </ul>
      <p>
        We do <strong>not</strong> store College Board SAT questions, passages, or answer choices. The
        app only records the numeric results and your own written notes.
      </p>

      <H2>How we use your information</H2>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>To create and operate your account and generate your personalized study plan.</li>
        <li>To compute analytics, topic mastery, and score predictions shown to you.</li>
        <li>To send the reminder emails and in-app notifications you have enabled.</li>
        <li>To maintain security, prevent abuse, and improve reliability and performance.</li>
      </ul>
      <p>We do not sell your personal information, and we do not use it for third-party advertising.</p>

      <H2>Service providers</H2>
      <p>We share data only with vendors that process it on our behalf to run the service:</p>
      <ul className="list-disc space-y-1.5 pl-5">
        <li><strong>Supabase</strong> — authentication and database hosting (stores your account and study data).</li>
        <li><strong>Vercel</strong> — application hosting, plus Analytics and Speed Insights.</li>
        <li><strong>Resend</strong> — delivery of reminder emails (only if you enable email reminders).</li>
      </ul>

      <H2>Children&rsquo;s privacy (COPPA) &amp; student data</H2>
      <p>
        Our service is intended for students preparing for the SAT, who may be under 18. We do not
        knowingly collect personal information from children under 13 without verifiable parental
        consent. If you are under 13, please do not use the service or create an account. If you are a
        parent or guardian and believe your child under 13 has provided us information, contact us at{' '}
        <a className="text-[var(--accent)] hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>{' '}
        and we will delete it. If you use this product through a school, the school may have additional
        rights and responsibilities under FERPA and applicable state student-privacy laws.
      </p>

      <H2>Your choices &amp; rights</H2>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>Edit your profile and study data at any time from within the app.</li>
        <li>Turn email and in-app reminders on or off in Settings (this is also your email opt-out).</li>
        <li>Request access to, correction of, or deletion of your account and data by emailing us.</li>
      </ul>

      <H2>Data retention &amp; security</H2>
      <p>
        We keep your information for as long as your account is active. When you request deletion, we
        remove your account and associated study data. We use industry-standard safeguards including
        encryption in transit and database row-level security so that each account can access only its
        own data. No method of transmission or storage is 100% secure.
      </p>

      <H2>Changes to this policy</H2>
      <p>
        We may update this policy from time to time. Material changes will be reflected by updating the
        effective date above and, where appropriate, by notice within the app.
      </p>

      <H2>Contact</H2>
      <p>
        Questions about this policy or your data?{' '}
        <a className="text-[var(--accent)] hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </>
  )
}
