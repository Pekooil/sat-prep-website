/**
 * Central legal/contact configuration — single source of truth for the app's
 * legal pages, email footers, consent copy, and the age gate.
 *
 * SaturnPath is run as a free, independent, non-commercial project — there is no
 * registered company, so `legalEntity` simply identifies the project + operator,
 * not an LLC/Inc. Contact for any legal/data request is `privacyEmail`.
 *
 * `mailingAddress` is intentionally left empty. A physical postal address is only
 * legally required by CAN-SPAM for *commercial* (marketing) email — e.g. a future
 * "we've launched" blast to the waitlist. The reminder emails the app sends today
 * are transactional/relationship messages (account-enabled study reminders), which
 * are exempt. When `mailingAddress` is empty, every consumer omits the address line
 * gracefully. ⚠️ Set a real address here BEFORE sending any marketing email.
 *
 * These baselines are NOT a substitute for review by qualified legal counsel.
 * See LEGAL_COMPLIANCE.md for the full pre-launch checklist.
 */
export const LEGAL = {
  appName: 'SaturnPath',
  legalEntity: 'SaturnPath — an independent, non-commercial study project',
  privacyEmail: 'saturnpathsupport@gmail.com',
  supportEmail: 'saturnpathsupport@gmail.com',
  /** Empty until a real postal address is needed for marketing email (CAN-SPAM). */
  mailingAddress: '',
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
