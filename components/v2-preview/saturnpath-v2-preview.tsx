'use client'

import * as React from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpenCheck,
  Brain,
  Calculator,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Flame,
  Focus,
  HelpCircle,
  Home,
  Lightbulb,
  LogOut,
  Menu,
  MessageSquareText,
  NotebookPen,
  PenLine,
  Play,
  RotateCcw,
  Settings,
  Sparkles,
  Target,
  TimerReset,
  TrendingUp,
  Trophy,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import styles from './saturnpath-v2-preview.module.css'

type AppScreen = 'home' | 'progress' | 'review' | 'profile'
type PracticeState = 'idle' | 'question' | 'complete' | 'summary'
type ToolTab = 'notes' | 'scratch' | 'calculator'

interface NavItem {
  id: AppScreen
  label: string
  icon: LucideIcon
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Today', icon: Home },
  { id: 'progress', label: 'Progress', icon: BarChart3 },
  { id: 'review', label: 'Review', icon: RotateCcw },
  { id: 'profile', label: 'Profile', icon: CircleUserRound },
]

const answers = [
  'The seedling grew fastest in Plot A.',
  'Seedlings in both plots grew at similar rates.',
  'The fertilizer was more effective in Plot B.',
  'The data do not support either conclusion.',
]

const skillRows = [
  { label: 'Linear equations', value: 82, change: '+8%', tone: 'violet' },
  { label: 'Words in context', value: 71, change: '+4%', tone: 'mint' },
  { label: 'Transitions', value: 64, change: '+11%', tone: 'coral' },
  { label: 'Problem solving', value: 58, change: '+3%', tone: 'sky' },
]

const reviewItems = [
  {
    subject: 'Reading & Writing',
    skill: 'Command of Evidence',
    title: 'Greenhouse growth study',
    reason: 'Concept gap',
    due: 'Due today',
    tone: 'coral',
  },
  {
    subject: 'Math',
    skill: 'Linear functions',
    title: 'Interpreting slope from a table',
    reason: 'Careless error',
    due: 'Tomorrow',
    tone: 'violet',
  },
  {
    subject: 'Reading & Writing',
    skill: 'Transitions',
    title: 'Connecting contrasting claims',
    reason: 'Timing issue',
    due: 'Friday',
    tone: 'mint',
  },
]

function BrandMark() {
  return (
    <span className={styles.brandMark} aria-hidden="true">
      <span />
    </span>
  )
}

function Brand() {
  return (
    <span className={styles.brand}>
      <BrandMark />
      <span>SaturnPath</span>
    </span>
  )
}

function IconButton({ label, children, onClick }: { label: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button className={styles.iconButton} type="button" aria-label={label} onClick={onClick}>
      {children}
    </button>
  )
}

function AppSidebar({ active, onNavigate }: { active: AppScreen; onNavigate: (screen: AppScreen) => void }) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarBrand}><Brand /></div>
      <nav className={styles.desktopNav} aria-label="Primary navigation">
        <p className={styles.navLabel}>Workspace</p>
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={active === id ? styles.navItemActive : styles.navItem}
            aria-current={active === id ? 'page' : undefined}
            onClick={() => onNavigate(id)}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
            {id === 'review' && <span className={styles.navBadge}>3</span>}
          </button>
        ))}
      </nav>
      <div className={styles.sidebarGoal}>
        <div className={styles.goalIcon}><Target aria-hidden="true" /></div>
        <div>
          <span>October SAT</span>
          <strong>42 days to go</strong>
        </div>
        <div className={styles.goalProgress}><span /></div>
        <small>On pace for 1500</small>
      </div>
      <div className={styles.sidebarUser}>
        <span className={styles.avatar}>DW</span>
        <span><strong>Darcy</strong><small>Student plan</small></span>
        <Settings aria-hidden="true" />
      </div>
    </aside>
  )
}

function Header({ active, onMenu }: { active: AppScreen; onMenu: () => void }) {
  const labels: Record<AppScreen, string> = {
    home: 'Today',
    progress: 'Your progress',
    review: 'Review queue',
    profile: 'Profile',
  }
  return (
    <header className={styles.header}>
      <div className={styles.mobileBrand}><Brand /></div>
      <div className={styles.headerTitle}>
        <span>SaturnPath workspace</span>
        <strong>{labels[active]}</strong>
      </div>
      <div className={styles.headerActions}>
        <span className={styles.previewPill}><Sparkles aria-hidden="true" /> UI preview</span>
        <IconButton label="View notifications"><Bell aria-hidden="true" /></IconButton>
        <button className={styles.headerAvatar} type="button" aria-label="Open profile">DW</button>
        <IconButton label="Open navigation" onClick={onMenu}><Menu aria-hidden="true" /></IconButton>
      </div>
    </header>
  )
}

function ScoreRings() {
  return (
    <div className={styles.scoreVisual} aria-label="Estimated score 1430. Overall progress 36 percent, Math 45 percent, Reading and Writing 25 percent.">
      <svg viewBox="0 0 280 280" aria-hidden="true">
        <circle className={styles.ringTrack} cx="140" cy="140" r="116" strokeWidth="22" />
        <circle className={styles.ringOverall} cx="140" cy="140" r="116" strokeWidth="22" pathLength="100" strokeDasharray="100" strokeDashoffset="64" />
        <circle className={styles.ringTrack} cx="140" cy="140" r="88" strokeWidth="20" />
        <circle className={styles.ringMath} cx="140" cy="140" r="88" strokeWidth="20" pathLength="100" strokeDasharray="100" strokeDashoffset="55" />
        <circle className={styles.ringTrack} cx="140" cy="140" r="62" strokeWidth="18" />
        <circle className={styles.ringReading} cx="140" cy="140" r="62" strokeWidth="18" pathLength="100" strokeDasharray="100" strokeDashoffset="75" />
      </svg>
      <div className={styles.scoreCenter}>
        <span>Estimated</span>
        <strong>1430</strong>
        <small>± 30 points</small>
      </div>
    </div>
  )
}

function HomeScreen({ onStart, onNavigate }: { onStart: () => void; onNavigate: (screen: AppScreen) => void }) {
  return (
    <div className={styles.screenContent}>
      <section className={styles.welcomeRow}>
        <div>
          <p className={styles.eyebrow}>Sunday, August 23</p>
          <h1>Ready when you are.</h1>
          <p>Your plan has already adjusted around this week. Just take the next small step.</p>
        </div>
        <div className={styles.streakPill}><Flame aria-hidden="true" /><strong>8</strong><span>day streak</span></div>
      </section>

      <div className={styles.homeGrid}>
        <section className={`${styles.glassCard} ${styles.scoreCard}`}>
          <div className={styles.cardHeading}>
            <div><p className={styles.eyebrow}>Current trajectory</p><h2>Your score is moving.</h2></div>
            <button type="button" className={styles.textButton} onClick={() => onNavigate('progress')}>Full progress <ChevronRight aria-hidden="true" /></button>
          </div>
          <div className={styles.scoreCardBody}>
            <ScoreRings />
            <div className={styles.scoreNarrative}>
              <span className={styles.trendPill}><TrendingUp aria-hidden="true" /> +40 this month</span>
              <h3>70 points from your goal</h3>
              <p>Your recent gains are coming from algebra and command of evidence. We’ll keep the next sessions focused there.</p>
              <div className={styles.legend}>
                <span><i className={styles.violetDot} />Overall <strong>36%</strong></span>
                <span><i className={styles.mintDot} />Math <strong>45%</strong></span>
                <span><i className={styles.coralDot} />R&amp;W <strong>25%</strong></span>
              </div>
            </div>
          </div>
        </section>

        <section className={`${styles.glassCard} ${styles.sessionCard}`}>
          <div className={styles.sessionTopline}>
            <span className={styles.recommendedPill}><Sparkles aria-hidden="true" /> Recommended next</span>
            <span>30 min</span>
          </div>
          <div className={styles.sessionOrb}><Play aria-hidden="true" /></div>
          <div className={styles.sessionCopy}>
            <p className={styles.eyebrow}>Focused practice</p>
            <h2>One short session.<br />The right questions.</h2>
            <p>20 adaptive questions · 10 minute review</p>
          </div>
          <div className={styles.savingsRow}>
            <div><TimerReset aria-hidden="true" /><span><strong>6 min saved</strong><small>12 low-value questions skipped</small></span></div>
          </div>
          <button type="button" className={styles.primaryButton} onClick={onStart}>
            Start practicing <span><ArrowRight aria-hidden="true" /></span>
          </button>
        </section>
      </div>

      <div className={styles.metricsGrid}>
        <article className={styles.metricCard}><span className={styles.metricIconViolet}><Target /></span><div><small>Target score</small><strong>1500</strong><span>70 points to go</span></div></article>
        <article className={styles.metricCard}><span className={styles.metricIconMint}><CalendarDays /></span><div><small>Next SAT</small><strong>Oct 4</strong><span>42 days · on track</span></div></article>
        <article className={styles.metricCard}><span className={styles.metricIconCoral}><BookOpenCheck /></span><div><small>Review queue</small><strong>3</strong><span>2 due today</span></div></article>
        <article className={styles.metricCard}><span className={styles.metricIconSky}><Clock3 /></span><div><small>Time this week</small><strong>2h 40m</strong><span>4 of 5 sessions</span></div></article>
      </div>

      <section className={styles.focusStrip}>
        <div className={styles.focusIcon}><Focus aria-hidden="true" /></div>
        <div><p className={styles.eyebrow}>This week’s focus</p><h2>Build consistency in two high-impact skills.</h2></div>
        <div className={styles.focusSkills}>
          <span>Linear equations <strong>82%</strong></span>
          <span>Command of evidence <strong>68%</strong></span>
        </div>
        <button type="button" onClick={() => onNavigate('progress')}>See insights <ChevronRight aria-hidden="true" /></button>
      </section>
    </div>
  )
}

function ProgressScreen() {
  return (
    <div className={styles.screenContent}>
      <section className={styles.pageIntro}>
        <div><p className={styles.eyebrow}>Your trajectory</p><h1>Progress you can use.</h1><p>Clear signals about what is working and where the next point gains are hiding.</p></div>
        <div className={styles.rangeControl} aria-label="Chart date range"><button type="button">7D</button><button type="button" className={styles.rangeActive}>30D</button><button type="button">All</button></div>
      </section>
      <div className={styles.progressGrid}>
        <section className={`${styles.glassCard} ${styles.trendCard}`}>
          <div className={styles.cardHeading}><div><p className={styles.eyebrow}>Predicted score</p><h2>1430 <span>+40</span></h2></div><span className={styles.confidencePill}>High confidence</span></div>
          <div className={styles.chart} aria-label="Predicted score increased from 1370 to 1430 over six weeks">
            <div className={styles.chartGrid}><i /><i /><i /><i /></div>
            <svg viewBox="0 0 720 250" preserveAspectRatio="none" aria-hidden="true">
              <defs><linearGradient id="score-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6857f6" stopOpacity=".25"/><stop offset="1" stopColor="#6857f6" stopOpacity="0"/></linearGradient></defs>
              <path className={styles.chartArea} d="M0 206 C95 192 114 175 190 179 S292 145 368 154 S472 118 534 128 S628 76 720 68 L720 250 L0 250 Z" />
              <path className={styles.chartLine} d="M0 206 C95 192 114 175 190 179 S292 145 368 154 S472 118 534 128 S628 76 720 68" />
              <circle cx="720" cy="68" r="7" />
            </svg>
            <div className={styles.chartLabels}><span>Jul 12</span><span>Jul 26</span><span>Aug 9</span><span>Today</span></div>
          </div>
        </section>
        <aside className={styles.gainCard}>
          <span className={styles.gainIcon}><Trophy aria-hidden="true" /></span>
          <p className={styles.eyebrow}>Strongest gain</p>
          <h2>Linear equations</h2>
          <strong>+18%</strong>
          <p>Accuracy over the last 14 days</p>
          <div className={styles.gainMeter}><span /></div>
        </aside>
      </div>
      <section className={`${styles.glassCard} ${styles.skillsCard}`}>
        <div className={styles.cardHeading}><div><p className={styles.eyebrow}>Skill mastery</p><h2>What’s changing</h2></div><span>Last 30 days</span></div>
        <div className={styles.skillList}>
          {skillRows.map((skill) => (
            <div className={styles.skillRow} key={skill.label}>
              <div><span className={`${styles.skillDot} ${styles[skill.tone]}`} /><strong>{skill.label}</strong></div>
              <div className={styles.skillBar}><span className={styles[skill.tone]} style={{ width: `${skill.value}%` }} /></div>
              <strong>{skill.value}%</strong><span>{skill.change}</span>
            </div>
          ))}
        </div>
      </section>
      <div className={styles.insightGrid}>
        <article><Brain aria-hidden="true" /><div><small>Best study window</small><strong>4:00–6:00 PM</strong><span>9% higher accuracy</span></div></article>
        <article><Clock3 aria-hidden="true" /><div><small>Average question time</small><strong>1m 18s</strong><span>12 seconds faster</span></div></article>
        <article><Flame aria-hidden="true" /><div><small>Consistency</small><strong>4.6 days/week</strong><span>Best month yet</span></div></article>
      </div>
    </div>
  )
}

function ReviewScreen() {
  return (
    <div className={styles.screenContent}>
      <section className={styles.pageIntro}>
        <div><p className={styles.eyebrow}>Review, then release</p><h1>Turn misses into memory.</h1><p>We’ll resurface each error only when it is useful—not forever.</p></div>
        <button type="button" className={styles.secondaryButton}><Play aria-hidden="true" /> Start 10-min review</button>
      </section>
      <div className={styles.reviewStats}>
        <article><strong>3</strong><span>Ready to review</span></article>
        <article><strong>12</strong><span>Strengthened</span></article>
        <article><strong>84%</strong><span>Retention</span></article>
      </div>
      <section className={styles.reviewList}>
        <div className={styles.sectionTitle}><div><p className={styles.eyebrow}>Spaced review</p><h2>Ready now</h2></div><span>Ordered by impact</span></div>
        {reviewItems.map((item, index) => (
          <article className={styles.reviewCard} key={item.title}>
            <span className={`${styles.reviewIndex} ${styles[item.tone]}`}>0{index + 1}</span>
            <div className={styles.reviewMain}><div className={styles.reviewMeta}><span>{item.subject}</span><i /> <span>{item.skill}</span></div><h3>{item.title}</h3><p>You chose an answer that matched one detail, but not the study’s full comparison.</p></div>
            <div className={styles.reviewTags}><span>{item.reason}</span><strong>{item.due}</strong></div>
            <button type="button" aria-label={`Review ${item.title}`}><ChevronRight aria-hidden="true" /></button>
          </article>
        ))}
      </section>
      <section className={styles.masteredBanner}><CheckCircle2 aria-hidden="true" /><div><strong>12 ideas strengthened this month</strong><span>Once a mistake stays mastered, SaturnPath gets it out of your way.</span></div><button type="button">View history</button></section>
    </div>
  )
}

function ProfileScreen() {
  return (
    <div className={styles.screenContent}>
      <section className={styles.profileHero}>
        <span className={styles.profileAvatar}>DW</span>
        <div><p className={styles.eyebrow}>Your workspace</p><h1>Darcy Wang</h1><p>Preparing for the October SAT · joined June 2026</p></div>
        <button type="button" className={styles.secondaryButton}><Settings aria-hidden="true" /> Edit preferences</button>
      </section>
      <div className={styles.profileGrid}>
        <section className={styles.profilePanel}>
          <div className={styles.sectionTitle}><div><p className={styles.eyebrow}>Study plan</p><h2>Your defaults</h2></div></div>
          <div className={styles.preferenceList}>
            <div><span className={styles.metricIconViolet}><Clock3 /></span><span><small>Session length</small><strong>30 minutes</strong></span><ChevronRight /></div>
            <div><span className={styles.metricIconMint}><CalendarDays /></span><span><small>Study rhythm</small><strong>5 days per week</strong></span><ChevronRight /></div>
            <div><span className={styles.metricIconCoral}><Bell /></span><span><small>Reminder</small><strong>4:00 PM</strong></span><ChevronRight /></div>
            <div><span className={styles.metricIconSky}><Target /></span><span><small>Target score</small><strong>1500 by October 4</strong></span><ChevronRight /></div>
          </div>
        </section>
        <section className={styles.profilePanel}>
          <div className={styles.sectionTitle}><div><p className={styles.eyebrow}>Account</p><h2>Settings</h2></div></div>
          <div className={styles.accountLinks}>
            <button type="button"><span><CircleUserRound />Personal information</span><ChevronRight /></button>
            <button type="button"><span><HelpCircle />Help &amp; feedback</span><ChevronRight /></button>
            <button type="button"><span><MessageSquareText />Learning preferences</span><ChevronRight /></button>
            <button type="button" className={styles.signOut}><span><LogOut />Sign out</span><ChevronRight /></button>
          </div>
        </section>
      </div>
      <section className={styles.previewNote}><Sparkles aria-hidden="true" /><div><strong>Front-end design preview</strong><span>This concept uses local mock data. Nothing here changes your account, schedule, or current College Board workflow.</span></div></section>
    </div>
  )
}

function PracticeWorkspace({ tool, onToolChange }: { tool: ToolTab; onToolChange: (tab: ToolTab) => void }) {
  return (
    <aside className={styles.practiceWorkspace}>
      <div className={styles.workspaceHeader}><div><p className={styles.eyebrow}>Workspace</p><h2>Think it through.</h2></div><span className={styles.autoSave}><Check aria-hidden="true" /> Local only</span></div>
      <div className={styles.toolTabs} role="tablist" aria-label="Practice tools">
        <button type="button" role="tab" aria-selected={tool === 'notes'} className={tool === 'notes' ? styles.toolActive : undefined} onClick={() => onToolChange('notes')}><NotebookPen /> Notes</button>
        <button type="button" role="tab" aria-selected={tool === 'scratch'} className={tool === 'scratch' ? styles.toolActive : undefined} onClick={() => onToolChange('scratch')}><PenLine /> Scratch</button>
        <button type="button" role="tab" aria-selected={tool === 'calculator'} className={tool === 'calculator' ? styles.toolActive : undefined} onClick={() => onToolChange('calculator')}><Calculator /> Calculator</button>
      </div>
      {tool === 'notes' && <textarea className={styles.notesArea} aria-label="Session notes" placeholder="Capture a pattern, rule, or question…" />}
      {tool === 'scratch' && (
        <div className={styles.scratchArea}>
          <div className={styles.scratchTools}><button type="button" className={styles.toolSelected}>Pen</button><button type="button">Eraser</button><button type="button">Clear</button></div>
          <div className={styles.graphPaper}><span>Use this space to sketch your reasoning.</span></div>
        </div>
      )}
      {tool === 'calculator' && (
        <div className={styles.calculator}>
          <div className={styles.calculatorScreen}><small>Expression</small><strong>0</strong></div>
          <div className={styles.calculatorKeys}>{['7','8','9','÷','4','5','6','×','1','2','3','−','0','.','=','+'].map(key => <button type="button" key={key}>{key}</button>)}</div>
          <button type="button" className={styles.desmosButton}>Open Desmos graphing calculator <ArrowRight /></button>
        </div>
      )}
      <div className={styles.workspaceTip}><Lightbulb aria-hidden="true" /><span><strong>Quick strategy</strong> Restate the claim, then look for the choice that uses all of the evidence.</span></div>
    </aside>
  )
}

function PracticeScreen({ onExit, onFinish }: { onExit: () => void; onFinish: () => void }) {
  const [question, setQuestion] = React.useState(1)
  const [selected, setSelected] = React.useState<number | null>(null)
  const [checked, setChecked] = React.useState(false)
  const [classification, setClassification] = React.useState<string | null>(null)
  const [tool, setTool] = React.useState<ToolTab>('notes')
  const correct = selected === 2

  function advance() {
    if (question >= 5) {
      onFinish()
      return
    }
    setQuestion((value) => value + 1)
    setSelected(null)
    setChecked(false)
    setClassification(null)
  }

  return (
    <div className={styles.practiceShell}>
      <header className={styles.practiceHeader}>
        <button type="button" className={styles.backButton} onClick={onExit}><ArrowLeft aria-hidden="true" /> Exit session</button>
        <div className={styles.practiceProgress}><span><strong>Question {question}</strong> of 5</span><div><i style={{ width: `${question * 20}%` }} /></div></div>
        <div className={styles.sessionTimer}><Clock3 aria-hidden="true" /><span><strong>22:18</strong><small>remaining</small></span></div>
      </header>
      <div className={styles.practiceLayout}>
        <section className={styles.questionPane}>
          <div className={styles.questionMeta}><span>Reading &amp; Writing</span><i /> <span>Command of Evidence</span><strong>Adaptive</strong></div>
          <article className={styles.questionCard}>
            <p>A research team grew genetically identical seedlings in two greenhouse plots. Plot A received a standard fertilizer, while Plot B received a newly developed fertilizer. After six weeks, the team found that seedlings in Plot B were, on average, 14 percent taller than those in Plot A.</p>
            <p>Which choice most effectively uses the data to support a conclusion about the new fertilizer?</p>
          </article>
          <div className={styles.answerList} role="radiogroup" aria-label="Answer choices">
            {answers.map((answer, index) => {
              const isSelected = selected === index
              const isCorrect = checked && index === 2
              const isWrong = checked && isSelected && index !== 2
              return (
                <button key={answer} type="button" role="radio" aria-checked={isSelected} disabled={checked} className={`${styles.answerChoice} ${isSelected ? styles.answerSelected : ''} ${isCorrect ? styles.answerCorrect : ''} ${isWrong ? styles.answerWrong : ''}`} onClick={() => setSelected(index)}>
                  <span>{String.fromCharCode(65 + index)}</span><p>{answer}</p>{isCorrect && <CheckCircle2 aria-hidden="true" />}{isWrong && <XCircle aria-hidden="true" />}
                </button>
              )
            })}
          </div>
          {checked && (
            <div className={correct ? styles.correctFeedback : styles.wrongFeedback} role="status">
              {correct ? <CheckCircle2 aria-hidden="true" /> : <Lightbulb aria-hidden="true" />}
              <div><strong>{correct ? 'Exactly right.' : 'Here’s the key connection.'}</strong><p>The comparison shows that the new fertilizer used in Plot B was associated with greater average growth.</p></div>
            </div>
          )}
          {checked && !correct && (
            <div className={styles.classificationPanel}>
              <div><strong>What got in the way?</strong><span>This helps shape your next question.</span></div>
              <div>{['Concept gap', 'Careless error', 'Timing', 'Unsure'].map(item => <button key={item} type="button" className={classification === item ? styles.classificationActive : undefined} onClick={() => setClassification(item)}>{item}</button>)}</div>
            </div>
          )}
          <div className={styles.questionActions}>
            <button type="button" className={styles.skipButton} onClick={advance}>Skip for now</button>
            {!checked ? (
              <button type="button" className={styles.checkButton} disabled={selected === null} onClick={() => setChecked(true)}>Check answer <ArrowRight aria-hidden="true" /></button>
            ) : (
              <button type="button" className={styles.checkButton} onClick={advance}>{question === 5 ? 'Finish session' : 'Next question'} <ArrowRight aria-hidden="true" /></button>
            )}
          </div>
        </section>
        <PracticeWorkspace tool={tool} onToolChange={setTool} />
      </div>
    </div>
  )
}

function CompletionScreen({ onSummary, onHome }: { onSummary: () => void; onHome: () => void }) {
  return (
    <div className={styles.completionScreen}>
      <div className={styles.completionGlow} />
      <span className={styles.completionIcon}><Check aria-hidden="true" /></span>
      <p className={styles.eyebrow}>Session complete</p>
      <h1>Nice work. That was enough.</h1>
      <p>Five focused questions moved your plan forward. SaturnPath will use the patterns from this session when your adaptive backend is connected.</p>
      <span className={styles.savedPill}><TimerReset aria-hidden="true" /> 6 minutes saved by skipping low-value practice</span>
      <div className={styles.completionStats}><div><strong>4/5</strong><span>correct</span></div><div><strong>7:42</strong><span>focused</span></div><div><strong>+3%</strong><span>mastery</span></div></div>
      <div className={styles.completionButtons}><button type="button" className={styles.primaryButton} onClick={onSummary}>See session summary <ArrowRight /></button><button type="button" className={styles.secondaryButton} onClick={onHome}>Back to today</button></div>
    </div>
  )
}

function SummaryScreen({ onHome, onPractice }: { onHome: () => void; onPractice: () => void }) {
  return (
    <div className={styles.summaryScreen}>
      <div className={styles.summaryTop}><div><button type="button" onClick={onHome}><ArrowLeft /> Today</button><p className={styles.eyebrow}>Session summary</p><h1>A small session with a clear signal.</h1><p>You were strongest on evidence questions. The next session will reinforce one remaining transition pattern.</p></div><span className={styles.summaryScore}><strong>80%</strong><small>accuracy</small></span></div>
      <div className={styles.summaryGrid}>
        <section className={styles.summaryPanel}><div className={styles.sectionTitle}><div><p className={styles.eyebrow}>What changed</p><h2>Mastery updates</h2></div></div><div className={styles.masteryUpdate}><span>Command of Evidence</span><strong>68% <ArrowRight /> 74%</strong></div><div className={styles.masteryUpdate}><span>Transitions</span><strong>64% <ArrowRight /> 65%</strong></div><div className={styles.nextFocus}><Sparkles /><span><small>Next focus</small><strong>Contrasting transitions</strong></span></div></section>
        <section className={styles.summaryPanel}><div className={styles.sectionTitle}><div><p className={styles.eyebrow}>Session details</p><h2>Five questions</h2></div></div><div className={styles.summaryRows}><span><i className={styles.correctDot} />Correct<strong>4</strong></span><span><i className={styles.wrongDot} />Needs review<strong>1</strong></span><span><Clock3 />Average pace<strong>1m 32s</strong></span><span><TimerReset />Time saved<strong>6 min</strong></span></div></section>
      </div>
      <div className={styles.summaryActions}><button type="button" className={styles.secondaryButton} onClick={onPractice}><RotateCcw /> Try the flow again</button><button type="button" className={styles.primaryButton} onClick={onHome}>Return home <ArrowRight /></button></div>
    </div>
  )
}

export function SaturnpathV2Preview() {
  const [screen, setScreen] = React.useState<AppScreen>('home')
  const [practiceState, setPracticeState] = React.useState<PracticeState>('idle')
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [screen, practiceState])

  function navigate(next: AppScreen) {
    setScreen(next)
    setPracticeState('idle')
    setMobileMenuOpen(false)
  }

  if (practiceState === 'question') return <PracticeScreen onExit={() => setPracticeState('idle')} onFinish={() => setPracticeState('complete')} />
  if (practiceState === 'complete') return <CompletionScreen onSummary={() => setPracticeState('summary')} onHome={() => navigate('home')} />
  if (practiceState === 'summary') return <SummaryScreen onHome={() => navigate('home')} onPractice={() => setPracticeState('question')} />

  return (
    <div className={styles.appCanvas}>
      <div className={styles.auroraOne} /><div className={styles.auroraTwo} />
      <AppSidebar active={screen} onNavigate={navigate} />
      <div className={styles.appMain}>
        <Header active={screen} onMenu={() => setMobileMenuOpen((open) => !open)} />
        {mobileMenuOpen && <div className={styles.mobileMenu}>{NAV_ITEMS.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={screen === id ? styles.mobileMenuActive : undefined} onClick={() => navigate(id)}><Icon />{label}</button>)}</div>}
        {screen === 'home' && <HomeScreen onStart={() => setPracticeState('question')} onNavigate={navigate} />}
        {screen === 'progress' && <ProgressScreen />}
        {screen === 'review' && <ReviewScreen />}
        {screen === 'profile' && <ProfileScreen />}
      </div>
      <nav className={styles.bottomNav} aria-label="Mobile navigation">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={screen === id ? styles.bottomNavActive : undefined} aria-current={screen === id ? 'page' : undefined} onClick={() => navigate(id)}><Icon /><span>{label}</span></button>)}
      </nav>
    </div>
  )
}
