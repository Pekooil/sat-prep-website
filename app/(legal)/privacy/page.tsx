import type { Metadata } from 'next'
import { LEGAL } from '@/lib/legal/config'

// NOTE FOR OPERATORS: This is a good-faith baseline drafted from the app's actual
// data practices — it is NOT a substitute for review by qualified legal counsel
// before public launch, especially regarding minors (COPPA/FERPA/state student-
// privacy) and California residents (CCPA/CPRA). All contact/entity details live in
// lib/legal/config.ts — update those placeholders before launch.
const APP_NAME = LEGAL.appName
const CONTACT_EMAIL = LEGAL.privacyEmail
const EFFECTIVE_DATE = LEGAL.effectiveDate

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
        and the choices you have. By creating an account you agree to this policy. This service is
        intended for users in the United States.
      </p>

      <H2>Information we collect</H2>
      <ul className="list-disc space-y-1.5 pl-5">
        <li><strong>Account information</strong> — your name, email address, and password (passwords are stored and verified by our authentication provider; we never see them in plain text).</li>
        <li><strong>Age &amp; consent records</strong> — the birth year you provide at sign-up (used to confirm you meet our minimum age and to determine whether a parent/guardian acknowledgement is required), and a timestamp recording your acceptance of our Terms and this policy. We do not collect your full date of birth.</li>
        <li><strong>Study profile</strong> — your current and target SAT scores, test date, and study-time preferences.</li>
        <li><strong>Study activity</strong> — practice sessions you log (questions attempted/correct by topic), error-log notes you write, scores you enter, generated study tasks, and reminder/notification preferences including your timezone.</li>
        <li><strong>Usage &amp; device data</strong> — aggregate, privacy-preserving analytics about page performance and visits, collected via Vercel Analytics and Vercel Speed Insights. These do not use advertising cookies and do not track you across other websites.</li>
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
        <li>To confirm you meet our minimum-age requirement and comply with children&rsquo;s and student privacy laws.</li>
        <li>To maintain security, prevent abuse, and improve reliability and performance.</li>
      </ul>
      <p>
        We do not sell or share your personal information, we do not use it for targeted advertising,
        and we do not build advertising profiles about you.
      </p>

      <H2>Cookies &amp; analytics</H2>
      <p>
        We use a small amount of strictly necessary browser storage to keep you signed in and to
        remember your preferences (for example, your theme and whether you have dismissed our cookie
        notice). For product analytics we use Vercel Analytics and Vercel Speed Insights, which are
        designed to be privacy-preserving and <strong>do not use advertising or cross-site tracking
        cookies</strong>. Because we do not use advertising cookies, we do not show a blocking cookie
        consent gate; you can control non-essential storage through your browser settings.
      </p>

      <H2>Service providers</H2>
      <p>We share data only with vendors that process it on our behalf to run the service:</p>
      <ul className="list-disc space-y-1.5 pl-5">
        <li><strong>Supabase</strong> — authentication and database hosting (stores your account and study data).</li>
        <li><strong>Vercel</strong> — application hosting, plus Analytics and Speed Insights.</li>
        <li><strong>Resend</strong> — delivery of reminder emails (only if you enable email reminders).</li>
      </ul>

      <H2>Children&rsquo;s privacy (COPPA) &amp; student data</H2>
      <p>
        Our service is intended for students preparing for the SAT, who may be under 18. You must be at
        least {LEGAL.minAge} years old to create an account. We <strong>do not knowingly collect
        personal information from children under {LEGAL.minAge}</strong>; we ask for your birth year at
        sign-up and block account creation if you are under {LEGAL.minAge}. If you are under 18, we ask
        you to confirm that a parent or guardian has given permission for you to use the service. If we
        learn that we have collected information from a child under {LEGAL.minAge} without verifiable
        parental consent, we will delete it. Parents or guardians who believe their child under{' '}
        {LEGAL.minAge} has provided us information can contact us at{' '}
        <a className="text-[var(--accent)] hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
      <p>
        We treat the information you enter as student data: we do not sell it, we do not use it for
        targeted advertising, and we do not create advertising or behavioral profiles for non-
        educational purposes. If you use this product through a school, the school may have additional
        rights and responsibilities under FERPA and applicable state student-privacy laws (such as
        California&rsquo;s SOPIPA), and we will support the school&rsquo;s lawful requests regarding its
        students&rsquo; data.
      </p>

      <H2>California privacy rights (CCPA/CPRA)</H2>
      <p>
        If you are a California resident, you have rights regarding your personal information. In the
        past 12 months we collect the categories described under &ldquo;Information we collect&rdquo;
        above (identifiers such as name and email, your age/consent records, and your study profile and
        activity), for the business purposes described under &ldquo;How we use your information.&rdquo;
        We <strong>do not sell or share</strong> personal information as those terms are defined under
        the CCPA/CPRA, and we do not sell or share the personal information of minors.
      </p>
      <ul className="list-disc space-y-1.5 pl-5">
        <li><strong>Right to know / access</strong> the personal information we hold about you.</li>
        <li><strong>Right to correct</strong> inaccurate personal information.</li>
        <li><strong>Right to delete</strong> your personal information.</li>
        <li><strong>Right to non-discrimination</strong> for exercising these rights.</li>
      </ul>
      <p>
        You can exercise the access and correction rights for most data directly in the app, delete your
        account and data yourself from <strong>Settings &rarr; Delete account</strong>, or contact us at{' '}
        <a className="text-[var(--accent)] hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        We will not discriminate against you for exercising any of these rights.
      </p>

      <H2>Your choices &amp; rights</H2>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>Edit your profile and study data at any time from within the app.</li>
        <li>Turn email and in-app reminders on or off in Settings (this is also your email opt-out).</li>
        <li>Delete your account and associated data yourself from <strong>Settings &rarr; Delete account</strong>, or by emailing us.</li>
      </ul>

      <H2>Data retention &amp; security</H2>
      <p>
        We keep your information for as long as your account is active. When you delete your account (in
        Settings) or request deletion, we remove your account and associated study data. We use
        industry-standard safeguards including encryption in transit and database row-level security so
        that each account can access only its own data. No method of transmission or storage is 100%
        secure.
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
        {' '}&middot; {LEGAL.legalEntity}{LEGAL.mailingAddress ? `, ${LEGAL.mailingAddress}` : ''}
      </p>
    </>
  )
}
