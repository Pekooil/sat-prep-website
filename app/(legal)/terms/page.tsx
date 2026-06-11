import type { Metadata } from 'next'

// NOTE FOR OPERATORS: Baseline terms drafted to match the product. Have qualified
// legal counsel review before public launch. Update CONTACT_EMAIL + GOVERNING_LAW.
const APP_NAME = 'SaturnPath'
const CONTACT_EMAIL = 'support@saturnpath.app'
const GOVERNING_LAW = 'the State of California, USA'
const EFFECTIVE_DATE = 'June 10, 2026'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: `The terms that govern your use of ${APP_NAME}.`,
  robots: { index: true, follow: true },
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 text-xl font-semibold text-[var(--text-heading)]">{children}</h2>
}

export default function TermsOfServicePage() {
  return (
    <>
      <h1 className="text-3xl font-bold text-[var(--text-heading)]">Terms of Service</h1>
      <p className="text-sm text-[var(--text-muted)]">Effective {EFFECTIVE_DATE}</p>

      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of {APP_NAME}
        (the &ldquo;Service&rdquo;). By creating an account or using the Service, you agree to these
        Terms. If you do not agree, do not use the Service.
      </p>

      <H2>Who may use the Service</H2>
      <p>
        You must be at least 13 years old to use the Service. If you are under 18, you represent that
        your parent or legal guardian has reviewed and agreed to these Terms on your behalf. You are
        responsible for keeping your account credentials secure and for all activity under your account.
      </p>

      <H2>What the Service does</H2>
      <p>
        {APP_NAME} generates personalized study schedules and recommends free, official College Board
        Question Bank filters (domain, skill, difficulty) for you to practice on the College Board
        website. The Service is an independent study aid. It is <strong>not affiliated with,
        endorsed by, or sponsored by the College Board</strong>, and &ldquo;SAT&rdquo; is a trademark
        of the College Board. Score predictions and analytics are estimates for guidance only and are
        not a guarantee of any actual SAT result.
      </p>

      <H2>Acceptable use</H2>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>Do not misuse the Service, attempt to access other users&rsquo; data, or disrupt its operation.</li>
        <li>Do not attempt to probe, scan, or breach security or authentication measures.</li>
        <li>Do not use automated means to create accounts, scrape, or overload the Service.</li>
        <li>Do not upload unlawful content or content that infringes others&rsquo; rights, including copyrighted SAT question content.</li>
      </ul>

      <H2>Your content</H2>
      <p>
        You retain ownership of the notes, scores, and study data you enter. You grant us a limited
        license to store and process that content solely to operate and improve the Service for you, as
        described in our{' '}
        <a className="text-[var(--accent)] hover:underline" href="/privacy">Privacy Policy</a>.
      </p>

      <H2>Disclaimers</H2>
      <p>
        The Service is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without warranties
        of any kind, whether express or implied, including fitness for a particular purpose and
        non-infringement. We do not warrant that the Service will be uninterrupted, error-free, or that
        results (including predicted scores) will be accurate.
      </p>

      <H2>Limitation of liability</H2>
      <p>
        To the maximum extent permitted by law, {APP_NAME} and its operators will not be liable for any
        indirect, incidental, special, consequential, or punitive damages, or any loss of data, arising
        from your use of the Service.
      </p>

      <H2>Termination</H2>
      <p>
        You may stop using the Service and request deletion of your account at any time. We may suspend
        or terminate access if you violate these Terms or to protect the Service and its users.
      </p>

      <H2>Changes to these Terms</H2>
      <p>
        We may update these Terms from time to time. Material changes take effect when we post the
        updated Terms and revise the effective date above. Continued use after changes constitutes
        acceptance.
      </p>

      <H2>Governing law</H2>
      <p>These Terms are governed by the laws of {GOVERNING_LAW}, without regard to conflict-of-laws rules.</p>

      <H2>Contact</H2>
      <p>
        Questions about these Terms?{' '}
        <a className="text-[var(--accent)] hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </>
  )
}
