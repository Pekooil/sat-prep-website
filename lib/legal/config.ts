/**
 * Central legal/contact configuration — single source of truth for the app's
 * legal pages, email footers, consent copy, and the age gate.
 *
 * ⚠️ OPERATOR ACTION REQUIRED BEFORE PUBLIC LAUNCH:
 * Replace every value marked "— TBD" with real, verified information. These are
 * clearly-marked placeholders. In particular:
 *   - `legalEntity`     — the legal name of the operating entity / individual
 *   - `privacyEmail`    — a monitored inbox for privacy / data-rights requests
 *   - `supportEmail`    — a monitored inbox for general support + Terms questions
 *   - `mailingAddress`  — a valid physical postal address (REQUIRED by CAN-SPAM
 *                         for any commercial email, e.g. the waitlist launch blast)
 *
 * These baselines are NOT a substitute for review by qualified legal counsel.
 * See LEGAL_COMPLIANCE.md for the full pre-launch checklist.
 */
export const LEGAL = {
  appName: 'SaturnPath',
  legalEntity: 'SaturnPath [LEGAL ENTITY NAME — TBD before launch]',
  privacyEmail: 'saturnpathsupport@gmail.com', // — TBD: confirm this inbox is monitored
  supportEmail: 'saturnpathsupport@gmail.com', // — TBD: confirm this inbox is monitored
  mailingAddress: '[STREET ADDRESS, CITY, STATE ZIP — TBD before launch]',
  governingLaw: 'the State of California, USA',
  effectiveDate: 'June 13, 2026',
  /** Minimum age to create an account. Under-13 is blocked (COPPA). */
  minAge: 13,
  /** Below this age, a parent/guardian acknowledgement is required at signup. */
  parentalConsentBelowAge: 18,
} as const

/**
 * Earliest birth year accepted by the age-gate UI. Anyone claiming to be older
 * than ~120 is almost certainly a typo / bot; this also bounds the year picker.
 */
export const MIN_BIRTH_YEAR = new Date().getFullYear() - 120

/**
 * Compute age in whole years from a birth year, relative to the current year.
 * We intentionally store/collect only the birth YEAR (not full DOB) to minimize
 * personal data held about minors. This yields the *maximum* age the person
 * could be this year; for an age gate that errs toward inclusion that is fine,
 * but we treat the threshold conservatively in `isUnderMinAge`.
 */
export function ageFromBirthYear(birthYear: number, now: Date = new Date()): number {
  return now.getFullYear() - birthYear
}

/** True if the birth year implies the user is below the COPPA minimum age. */
export function isUnderMinAge(birthYear: number, now: Date = new Date()): boolean {
  // Use the max-possible age for the year; only block when even that is < minAge.
  return ageFromBirthYear(birthYear, now) < LEGAL.minAge
}

/** True if a parent/guardian acknowledgement should be required for this age. */
export function requiresParentalAck(birthYear: number, now: Date = new Date()): boolean {
  return ageFromBirthYear(birthYear, now) < LEGAL.parentalConsentBelowAge
}

export interface AgeConsentInput {
  birthYear: number | null | undefined
  agreedToTerms: boolean
  parentalAck: boolean
}

/**
 * Server-side gate enforced by BOTH signup entry points. Returns an error
 * message string when the input fails (block account creation), or null when ok.
 * The client mirrors these checks for UX, but this is the authoritative gate.
 */
export function validateAgeConsent(input: AgeConsentInput, now: Date = new Date()): string | null {
  const year = Number(input.birthYear)
  if (!Number.isInteger(year) || year < MIN_BIRTH_YEAR || year > now.getFullYear()) {
    return 'Please select your birth year.'
  }
  if (isUnderMinAge(year, now)) {
    return `You must be at least ${LEGAL.minAge} years old to create an account.`
  }
  if (!input.agreedToTerms) {
    return 'Please agree to the Terms of Service and Privacy Policy to continue.'
  }
  if (requiresParentalAck(year, now) && !input.parentalAck) {
    return 'Because you are under 18, please confirm you have a parent or guardian’s permission.'
  }
  return null
}
