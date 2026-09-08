import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Check, Clock3, RotateCcw, Sparkles, TrendingUp } from 'lucide-react'

import styles from './auth.module.css'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

const PROOF_POINTS = ['No trial', 'No credit card', 'No premium tier']

function Brand() {
  return (
    <span className={styles.brand}>
      <span className={styles.brandMark} aria-hidden="true"><span /></span>
      <span>SaturnPath</span>
    </span>
  )
}

function ProgressPreview() {
  return (
    <div className={styles.previewStage} aria-hidden="true">
      <span className={styles.orbitOne} />
      <span className={styles.orbitTwo} />

      <article className={styles.trajectoryCard}>
        <header>
          <span><Sparkles /> Live learning path</span>
          <small>Today</small>
        </header>
        <div className={styles.trajectoryBody}>
          <div className={styles.rings}>
            <svg viewBox="0 0 240 240">
              <circle className={styles.ringTrack} cx="120" cy="120" r="96" strokeWidth="18" />
              <circle className={styles.ringViolet} cx="120" cy="120" r="96" strokeWidth="18" pathLength="100" strokeDasharray="100" strokeDashoffset="24" />
              <circle className={styles.ringTrack} cx="120" cy="120" r="70" strokeWidth="16" />
              <circle className={styles.ringMint} cx="120" cy="120" r="70" strokeWidth="16" pathLength="100" strokeDasharray="100" strokeDashoffset="36" />
              <circle className={styles.ringTrack} cx="120" cy="120" r="47" strokeWidth="14" />
              <circle className={styles.ringCoral} cx="120" cy="120" r="47" strokeWidth="14" pathLength="100" strokeDasharray="100" strokeDashoffset="49" />
            </svg>
            <span><small>Estimated</small><strong>1430</strong><em>+40 this month</em></span>
          </div>
          <div className={styles.pathSignals}>
            <span><TrendingUp /><small>Score path</small><strong>On track</strong></span>
            <span><RotateCcw /><small>Review ready</small><strong>3 skills</strong></span>
            <span><Clock3 /><small>Next session</small><strong>22 min</strong></span>
          </div>
        </div>
      </article>

      <div className={styles.floatingSignal}>
        <Sparkles />
        <span><small>Path adapted</small><strong>Every answer changes what comes next</strong></span>
      </div>
    </div>
  )
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className={styles.authShell} id="main-content">
      <div className={styles.auroraViolet} aria-hidden="true" />
      <div className={styles.auroraMint} aria-hidden="true" />

      <section className={styles.storyPanel} aria-label="About SaturnPath">
        <Link className={styles.desktopBrand} href="/" aria-label="SaturnPath home">
          <Brand />
        </Link>

        <div className={styles.storyCopy}>
          <span className={styles.productPill}><Sparkles /> Completely free adaptive SAT prep</span>
          <h2>Every question<br /><em>should earn its place.</em></h2>
          <p>Short, focused sessions that adapt after every answer—so your time goes toward the work most likely to move your score.</p>
          <div className={styles.proofRow}>
            {PROOF_POINTS.map((point) => <span key={point}><Check /> {point}</span>)}
          </div>
        </div>

        <ProgressPreview />
      </section>

      <section className={styles.formPanel} aria-label="Account access">
        <Link className={styles.mobileBrand} href="/" aria-label="SaturnPath home">
          <Brand />
        </Link>

        <div className={styles.formCard}>
          <span className={styles.formGlow} aria-hidden="true" />
          {children}
        </div>

        <p className={styles.independentNote}>
          SAT® is a registered trademark of College Board. SaturnPath is an independent study aid and is not affiliated with or endorsed by College Board.
        </p>
        <Link className={styles.returnHome} href="/">Explore SaturnPath <ArrowRight /></Link>
      </section>
    </main>
  )
}
