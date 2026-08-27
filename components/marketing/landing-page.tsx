'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  Bell,
  BookOpenCheck,
  Brain,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Focus,
  Home,
  Lightbulb,
  Menu,
  MessageSquareText,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  TimerReset,
  TrendingUp,
  X,
} from 'lucide-react'
import styles from './landing-page.module.css'

type PhoneView = 'today' | 'practice' | 'progress'

const NAV_LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#experience', label: 'Experience' },
  { href: '#mobile', label: 'Mobile' },
  { href: '#free', label: 'Why free' },
]

const FAQS = [
  {
    question: 'Is SaturnPath really completely free?',
    answer: 'Yes. SaturnPath is being built as a completely free SAT prep experience. There is no trial, credit card, or premium study tier required to use the core product.',
  },
  {
    question: 'What makes a session adaptive?',
    answer: 'Your next question is selected from the signals created by the question before it—accuracy, pace, confidence, skill, and mistake type. The goal is a short session where every question has a reason to be there.',
  },
  {
    question: 'Will SaturnPath work on web and mobile?',
    answer: 'That is the V2 vision. Your plan, practice history, error patterns, and score trajectory will stay connected across the laptop web app and the SaturnPath mobile app.',
  },
  {
    question: 'Is SaturnPath affiliated with College Board?',
    answer: 'No. SaturnPath is an independent SAT preparation product and is not affiliated with or endorsed by College Board.',
  },
]

function BrandMark() {
  return <span className={styles.brandMark} aria-hidden="true"><span /></span>
}

function Brand() {
  return <span className={styles.brand}><BrandMark /><span>SaturnPath</span></span>
}

function HeroProduct() {
  return (
    <div className={styles.heroProduct} aria-label="Preview of the SaturnPath V2 web dashboard">
      <div className={styles.productTopbar}>
        <span><i /><i /><i /></span>
        <small>saturnpath.app / today</small>
        <span className={styles.productAvatar}>DW</span>
      </div>
      <div className={styles.productBody}>
        <aside className={styles.productSidebar}>
          <BrandMark />
          <span className={styles.productNavActive}><Home /></span>
          <span><BarChart3 /></span>
          <span><RotateCcw /></span>
          <span><Target /></span>
        </aside>
        <div className={styles.productDashboard}>
          <div className={styles.productGreeting}>
            <div><small>Sunday, August 23</small><strong>Ready when you are.</strong></div>
            <span><Sparkles /> Plan adapted</span>
          </div>
          <div className={styles.productGrid}>
            <article className={styles.productScoreCard}>
              <div className={styles.productCardLabel}><span>Current trajectory</span><strong>1430</strong><small>estimated score</small></div>
              <div className={styles.productRings}>
                <svg viewBox="0 0 210 210" aria-hidden="true">
                  <circle className={styles.ringTrack} cx="105" cy="105" r="82" strokeWidth="16" />
                  <circle className={styles.ringViolet} cx="105" cy="105" r="82" strokeWidth="16" pathLength="100" strokeDasharray="100" strokeDashoffset="26" />
                  <circle className={styles.ringTrack} cx="105" cy="105" r="61" strokeWidth="14" />
                  <circle className={styles.ringMint} cx="105" cy="105" r="61" strokeWidth="14" pathLength="100" strokeDasharray="100" strokeDashoffset="38" />
                  <circle className={styles.ringTrack} cx="105" cy="105" r="42" strokeWidth="12" />
                  <circle className={styles.ringCoral} cx="105" cy="105" r="42" strokeWidth="12" pathLength="100" strokeDasharray="100" strokeDashoffset="48" />
                </svg>
                <span><strong>+40</strong><small>this month</small></span>
              </div>
              <div className={styles.productSkillBars}>
                <span><small>Math</small><i><b style={{ width: '82%' }} /></i><strong>82%</strong></span>
                <span><small>R&amp;W</small><i><b style={{ width: '68%' }} /></i><strong>68%</strong></span>
              </div>
            </article>
            <article className={styles.productSessionCard}>
              <div className={styles.productSessionTop}><span><Sparkles /> Next up</span><small>22 min</small></div>
              <span className={styles.productPlay}><Play /></span>
              <div><small>Focused practice</small><strong>One short session.<br />The right questions.</strong><p>12 questions · adaptive after every answer</p></div>
              <button type="button" tabIndex={-1}>Start practicing <ArrowRight /></button>
            </article>
          </div>
          <div className={styles.productMetrics}>
            <span><Target /><small>Target</small><strong>1500</strong></span>
            <span><CalendarDays /><small>Next SAT</small><strong>42 days</strong></span>
            <span><BookOpenCheck /><small>Review</small><strong>3 ready</strong></span>
          </div>
        </div>
      </div>
      <div className={styles.floatingInsight}><Brain /><span><small>SaturnPath noticed</small><strong>Transitions need one more pass.</strong></span></div>
      <div className={styles.floatingSaved}><TimerReset /><span><strong>8 min saved</strong><small>Low-value questions skipped</small></span></div>
    </div>
  )
}

function AdaptiveLoop() {
  const steps = [
    { number: '01', icon: MessageSquareText, title: 'Answer one question', body: 'Your choice, pace, and confidence create a useful signal.' },
    { number: '02', icon: Brain, title: 'SaturnPath diagnoses', body: 'It separates a concept gap from a timing or strategy mistake.' },
    { number: '03', icon: Sparkles, title: 'The next question adapts', body: 'Difficulty and skill focus shift while the session is still happening.' },
  ]
  return (
    <div className={styles.loopGrid}>
      {steps.map(({ number, icon: Icon, title, body }, index) => (
        <React.Fragment key={number}>
          <article className={styles.loopCard}>
            <div><span>{number}</span><Icon /></div>
            <h3>{title}</h3><p>{body}</p>
          </article>
          {index < steps.length - 1 && <span className={styles.loopArrow}><ArrowRight /></span>}
        </React.Fragment>
      ))}
    </div>
  )
}

function SessionPreview() {
  return (
    <div className={styles.sessionPreview} aria-label="Adaptive SAT practice question preview">
      <div className={styles.sessionPreviewHeader}>
        <span>Question 4 of 12</span><i><b /></i><span><Clock3 /> 18:42</span>
      </div>
      <div className={styles.sessionPreviewMeta}><span>Reading &amp; Writing</span><i /><span>Command of Evidence</span><strong>Adaptive</strong></div>
      <article className={styles.sessionQuestion}>
        <span /><span /><span className={styles.shortLine} />
        <strong>Which choice most effectively supports the conclusion?</strong>
      </article>
      <div className={styles.sessionAnswers}>
        {['A', 'B', 'C', 'D'].map((letter) => <span key={letter} className={letter === 'C' ? styles.sessionAnswerSelected : undefined}><i>{letter}</i><b /><CheckCircle2 /></span>)}
      </div>
      <div className={styles.sessionFeedback}><Lightbulb /><span><strong>Exactly right.</strong><small>SaturnPath is making the next question slightly harder.</small></span></div>
    </div>
  )
}

function ProgressPreview() {
  return (
    <div className={styles.progressPreview} aria-label="Score progress and skill mastery preview">
      <div className={styles.progressPreviewTop}><div><small>Predicted score</small><strong>1430 <span>+40</span></strong></div><span>High confidence</span></div>
      <div className={styles.progressChart}>
        <i /><i /><i /><i />
        <svg viewBox="0 0 600 210" preserveAspectRatio="none" aria-hidden="true">
          <defs><linearGradient id="landing-score-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6857f6" stopOpacity=".25"/><stop offset="1" stopColor="#6857f6" stopOpacity="0"/></linearGradient></defs>
          <path className={styles.progressArea} d="M0 180 C75 170 90 150 150 158 S242 126 300 136 S390 98 448 112 S525 61 600 53 L600 210 L0 210 Z" />
          <path className={styles.progressLine} d="M0 180 C75 170 90 150 150 158 S242 126 300 136 S390 98 448 112 S525 61 600 53" />
          <circle cx="600" cy="53" r="7" />
        </svg>
      </div>
      <div className={styles.progressSkills}>
        <span><i className={styles.skillViolet} /><b>Linear equations</b><small>82%</small><strong>+8%</strong></span>
        <span><i className={styles.skillMint} /><b>Words in context</b><small>71%</small><strong>+4%</strong></span>
        <span><i className={styles.skillCoral} /><b>Transitions</b><small>64%</small><strong>+11%</strong></span>
      </div>
    </div>
  )
}

function ReviewPreview() {
  return (
    <div className={styles.reviewPreview} aria-label="Automatic mistake review preview">
      <div className={styles.reviewPreviewHeader}><div><small>Review, then release</small><strong>3 ideas ready</strong></div><span><RotateCcw /></span></div>
      {[
        ['Command of Evidence', 'Concept gap', 'Today'],
        ['Linear functions', 'Careless error', 'Tomorrow'],
        ['Transitions', 'Timing', 'Friday'],
      ].map(([skill, reason, date], index) => (
        <article key={skill}><span>0{index + 1}</span><div><small>{reason}</small><strong>{skill}</strong></div><i>{date}</i><ArrowRight /></article>
      ))}
      <div className={styles.reviewMastered}><CheckCircle2 /><span><strong>12 ideas strengthened</strong><small>Mastered mistakes leave your queue.</small></span></div>
    </div>
  )
}

function PhoneToday() {
  return (
    <div className={styles.phoneView}>
      <div className={styles.phoneIntro}><small>Sunday, August 23</small><strong>Ready when you are.</strong></div>
      <div className={styles.phoneScore}>
        <div className={styles.phoneRings}><i /><i /><i /><span><small>Estimated</small><strong>1430</strong></span></div>
        <div className={styles.phoneLegend}><span><i />Overall <b>74%</b></span><span><i />Math <b>82%</b></span><span><i />R&amp;W <b>68%</b></span></div>
      </div>
      <div className={styles.phoneSession}><span><Sparkles /> Recommended today</span><strong>20 min focused practice</strong><small>12 adaptive questions</small><button type="button" tabIndex={-1}>Start practicing <ArrowRight /></button></div>
    </div>
  )
}

function PhonePractice() {
  return (
    <div className={styles.phoneView}>
      <div className={styles.phonePracticeTop}><span>4 of 12</span><i><b /></i><strong>18:42</strong></div>
      <div className={styles.phoneQuestion}><small>Command of Evidence</small><span /><span /><span className={styles.phoneShortLine} /><strong>Which choice best supports the conclusion?</strong></div>
      <div className={styles.phoneAnswers}>{['A','B','C','D'].map(letter => <span key={letter} className={letter === 'C' ? styles.phoneAnswerActive : undefined}><i>{letter}</i><b /></span>)}</div>
      <div className={styles.phoneFeedback}><CheckCircle2 /><span><strong>Exactly right.</strong><small>Next question: slightly harder</small></span></div>
      <button type="button" tabIndex={-1} className={styles.phoneNext}>Next question <ArrowRight /></button>
    </div>
  )
}

function PhoneProgress() {
  return (
    <div className={styles.phoneView}>
      <div className={styles.phoneIntro}><small>Your trajectory</small><strong>Progress</strong></div>
      <div className={styles.phoneProgressScore}><small>Predicted score</small><strong>1430 <span>+40</span></strong><div><i /><i /><i /><svg viewBox="0 0 240 90" preserveAspectRatio="none"><path d="M0 76 C32 70 47 57 74 61 S120 40 147 47 S194 19 240 14" /></svg></div></div>
      <div className={styles.phoneSkills}><small>Skill mastery</small>{[['Linear equations','82%'],['Words in context','71%'],['Transitions','64%']].map(([skill,value], index)=><span key={skill}><i className={index === 1 ? styles.phoneMint : index === 2 ? styles.phoneCoral : undefined} /><b>{skill}</b><strong>{value}</strong></span>)}</div>
      <div className={styles.phoneInsight}><TrendingUp /><span><small>Strongest gain</small><strong>Linear equations +18%</strong></span></div>
    </div>
  )
}

function PhoneMock({ view }: { view: PhoneView }) {
  return (
    <div className={styles.phoneStage}>
      <div className={styles.phoneShadow} />
      <div className={styles.phone}>
        <div className={styles.phoneHardware}><span>9:41</span><i /><span><b /><b /><b /></span></div>
        <header className={styles.phoneHeader}><Brand /><span>DW</span></header>
        <div className={styles.phoneScreen}>{view === 'today' ? <PhoneToday /> : view === 'practice' ? <PhonePractice /> : <PhoneProgress />}</div>
        <nav className={styles.phoneNav} aria-hidden="true"><span className={view === 'today' ? styles.phoneNavActive : undefined}><Home />Today</span><span className={view === 'progress' ? styles.phoneNavActive : undefined}><BarChart3 />Progress</span><span><RotateCcw />Review</span><span><Target />Profile</span></nav>
      </div>
      <span className={styles.phoneOrbitOne} /><span className={styles.phoneOrbitTwo} />
    </div>
  )
}

export function LandingPage() {
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [phoneView, setPhoneView] = React.useState<PhoneView>('today')

  return (
    <main id="main-content" className={styles.landing}>
      <div className={styles.auroraOne} /><div className={styles.auroraTwo} />
      <header className={styles.siteHeader}>
        <Link href="/" aria-label="SaturnPath home"><Brand /></Link>
        <nav className={styles.desktopNav} aria-label="Landing page navigation">{NAV_LINKS.map(link => <a href={link.href} key={link.href}>{link.label}</a>)}</nav>
        <div className={styles.headerCtas}><Link href="/login">Log in</Link><Link href="/signup" className={styles.navCta}>Start free <ArrowRight /></Link></div>
        <button type="button" className={styles.menuButton} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X /> : <Menu />}</button>
        {menuOpen && <nav className={styles.mobileMenu} aria-label="Mobile landing page navigation">{NAV_LINKS.map(link => <a href={link.href} key={link.href} onClick={() => setMenuOpen(false)}>{link.label}</a>)}<Link href="/login">Log in</Link><Link href="/signup" className={styles.mobileMenuCta}>Start free <ArrowRight /></Link></nav>}
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.freePill}><Sparkles /> Completely free adaptive SAT prep</span>
          <h1>Every question<br /><em>should earn its place.</em></h1>
          <p>SaturnPath turns SAT prep into short, adaptive sessions that change after every answer—so you spend less time grinding and more time improving.</p>
          <div className={styles.heroCtas}><Link href="/signup" className={styles.primaryCta}>Start learning free <ArrowRight /></Link><a href="#how-it-works" className={styles.secondaryCta}><Play /> See how it adapts</a></div>
          <div className={styles.freeProof}><span><Check /> No trial</span><span><Check /> No credit card</span><span><Check /> No premium tier</span></div>
        </div>
        <div className={styles.heroVisual}><HeroProduct /></div>
      </section>

      <section className={styles.promiseBar} aria-label="SaturnPath product promises">
        <span><strong>20–30 min</strong><small>focused sessions</small></span><i />
        <span><strong>1 question</strong><small>at a time</small></span><i />
        <span><strong>Every answer</strong><small>changes what comes next</small></span><i />
        <span><strong>$0</strong><small>completely free</small></span>
      </section>

      <section id="how-it-works" className={styles.section}>
        <div className={styles.sectionHeading}><span className={styles.eyebrow}>The adaptive loop</span><h2>Not more questions.<br /><em>Better next questions.</em></h2><p>A normal question bank waits until the end to tell you how you did. SaturnPath uses each answer while you are still practicing.</p></div>
        <AdaptiveLoop />
      </section>

      <section id="experience" className={styles.experienceSection}>
        <div className={styles.sectionHeading}><span className={styles.eyebrow}>The SaturnPath experience</span><h2>Small sessions.<br /><em>A complete learning system.</em></h2><p>Practice, review, and progress all share the same signals. Nothing gets lost between pages—or between days.</p></div>
        <div className={styles.bentoGrid}>
          <article className={`${styles.bentoCard} ${styles.bentoPractice}`}><div className={styles.bentoCopy}><span className={styles.bentoIconViolet}><Focus /></span><small>Adaptive practice</small><h3>Stay with one question.</h3><p>A calm interface gives you room to think. Once you answer, difficulty and skill focus adjust immediately.</p></div><SessionPreview /></article>
          <article className={`${styles.bentoCard} ${styles.bentoProgress}`}><div className={styles.bentoCopy}><span className={styles.bentoIconMint}><TrendingUp /></span><small>Useful progress</small><h3>See what is actually moving.</h3><p>Your predicted score and skill mastery update from the work you just completed.</p></div><ProgressPreview /></article>
          <article className={`${styles.bentoCard} ${styles.bentoReview}`}><div className={styles.bentoCopy}><span className={styles.bentoIconCoral}><RotateCcw /></span><small>Automatic review</small><h3>Mistakes return at the right time.</h3><p>SaturnPath remembers the pattern, schedules the review, and lets mastered ideas leave the queue.</p></div><ReviewPreview /></article>
        </div>
      </section>

      <section id="mobile" className={styles.mobileSection}>
        <div className={styles.mobileCopy}>
          <span className={styles.eyebrow}>SaturnPath mobile</span>
          <h2>Your next session<br /><em>goes where you go.</em></h2>
          <p>The mobile app is not a smaller dashboard. It is a focused practice companion built around one useful action at a time.</p>
          <div className={styles.mobileTabs} role="tablist" aria-label="Mobile app preview screens">
            <button type="button" role="tab" aria-selected={phoneView === 'today'} className={phoneView === 'today' ? styles.mobileTabActive : undefined} onClick={() => setPhoneView('today')}><Home /> Today</button>
            <button type="button" role="tab" aria-selected={phoneView === 'practice'} className={phoneView === 'practice' ? styles.mobileTabActive : undefined} onClick={() => setPhoneView('practice')}><Focus /> Practice</button>
            <button type="button" role="tab" aria-selected={phoneView === 'progress'} className={phoneView === 'progress' ? styles.mobileTabActive : undefined} onClick={() => setPhoneView('progress')}><BarChart3 /> Progress</button>
          </div>
          <div className={styles.mobileFeatureList}><span><CheckCircle2 /><div><strong>Continue anywhere</strong><small>Your plan and review queue stay in sync.</small></div></span><span><CheckCircle2 /><div><strong>Built for short sessions</strong><small>Open the app, focus, and finish without setup.</small></div></span><span><CheckCircle2 /><div><strong>One shared trajectory</strong><small>Mobile and web feed the same learning model.</small></div></span></div>
          <span className={styles.comingPill}><Bell /> Mobile app in development</span>
        </div>
        <PhoneMock view={phoneView} />
      </section>

      <section className={styles.philosophySection}>
        <div><span className={styles.eyebrow}>Why SaturnPath feels different</span><h2>Most SAT prep measures effort.<br /><em>We protect it.</em></h2></div>
        <div className={styles.philosophyGrid}><article><span>01</span><h3>Less noise</h3><p>No giant assignment list waiting to make you feel behind. You see the next useful session.</p></article><article><span>02</span><h3>Less repetition</h3><p>Questions are chosen for information value, not because a workbook still has pages left.</p></article><article><span>03</span><h3>More clarity</h3><p>Every chart answers a real question: what changed, why, and what should you do next?</p></article></div>
      </section>

      <section id="free" className={styles.freeSection}>
        <div className={styles.freeCard}>
          <div><span className={styles.freeCardIcon}><Sparkles /></span><span className={styles.eyebrow}>Completely free</span><h2>Good SAT prep should not depend on what you can pay.</h2><p>SaturnPath is being built so every student can get a focused plan, adaptive practice, automatic review, and clear progress without a subscription standing in the way.</p></div>
          <aside><span className={styles.price}><small>$</small>0</span><strong>Free to use</strong><ul><li><Check /> Adaptive practice sessions</li><li><Check /> Personalized study plan</li><li><Check /> Error review and analytics</li><li><Check /> Web and mobile experience</li></ul><Link href="/signup" className={styles.primaryCta}>Create your free account <ArrowRight /></Link><small>No trial · No credit card · No premium tier</small></aside>
        </div>
      </section>

      <section className={styles.faqSection}>
        <div className={styles.faqHeading}><span className={styles.eyebrow}>Questions, answered</span><h2>Before you begin.</h2><p>SaturnPath V2 is a new adaptive experience currently being designed across web and mobile.</p></div>
        <div className={styles.faqList}>{FAQS.map((faq) => <details key={faq.question}><summary>{faq.question}<ChevronDown /></summary><p>{faq.answer}</p></details>)}</div>
      </section>

      <section className={styles.finalCta}>
        <div className={styles.finalOrbit}><BrandMark /><span /><span /></div>
        <span className={styles.eyebrow}>Your next question is ready</span><h2>Shorter sessions.<br /><em>Smarter progress.</em></h2><p>Start building your path to test day—for free.</p><Link href="/signup" className={styles.primaryCta}>Start with SaturnPath <ArrowRight /></Link>
      </section>

      <footer className={styles.footer}><div><Brand /><p>Free, adaptive SAT preparation built around your next best question.</p></div><nav aria-label="Footer navigation"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/login">Log in</Link><Link href="/signup">Sign up</Link></nav><small>SAT® is a registered trademark of College Board. SaturnPath is not affiliated with or endorsed by College Board.</small></footer>
    </main>
  )
}
