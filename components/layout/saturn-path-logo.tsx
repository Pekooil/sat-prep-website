import Link from 'next/link'

interface SaturnPathLogoProps {
  /** 'auto' CSS-switches between colored/white mark with dark mode; 'dark' forces the white mark (gradient panels). */
  variant?: 'auto' | 'dark'
  size?: 'sm' | 'md' | 'lg'
  /** Override the "Path" text color. Defaults to violet-600 (auto light) / violet-500 (dark). */
  pathColor?: string
  /** Wrap in a /home link. Default true. */
  asLink?: boolean
  className?: string
}

const sizeMap = {
  sm: { h: 26, gap: 'gap-2',   text: 'text-base' },
  md: { h: 32, gap: 'gap-2.5', text: 'text-xl'   },
  lg: { h: 40, gap: 'gap-3',   text: 'text-2xl'  },
}

export function SaturnPathLogo({
  variant = 'auto',
  size = 'md',
  pathColor,
  asLink = true,
  className = '',
}: SaturnPathLogoProps) {
  const { h, gap, text } = sizeMap[size]

  const mark =
    variant === 'dark' ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src="/saturn-mark-white.svg" alt="" width={h} height={h} className="shrink-0" />
    ) : (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/saturn-mark.svg"       alt="" width={h} height={h} className="shrink-0 dark:hidden" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/saturn-mark-white.svg" alt="" width={h} height={h} className="shrink-0 hidden dark:block" />
      </>
    )

  /* "Saturn" portion */
  const saturnText =
    variant === 'dark' ? (
      <span className="text-white">Saturn</span>
    ) : (
      <span className="text-slate-900 dark:text-white">Saturn</span>
    )

  /* "Path" portion — pathColor prop overrides the default */
  const pathStyle = pathColor ? { color: pathColor } : undefined
  const pathText =
    variant === 'dark' ? (
      <span style={pathStyle ?? { color: '#a855f7' }}>Path</span>
    ) : pathColor ? (
      /* explicit override in auto mode */
      <span style={pathStyle}>Path</span>
    ) : (
      <span className="text-violet-600 dark:text-violet-400">Path</span>
    )

  const wordmark = (
    <span
      className={`font-bold leading-none ${text}`}
      style={{ letterSpacing: 'var(--tracking-tighter)' }}
    >
      {saturnText}{pathText}
    </span>
  )

  const inner = (
    <span className={`flex items-center ${gap} ${className}`} aria-label="SaturnPath">
      {mark}
      {wordmark}
    </span>
  )

  if (asLink) {
    return (
      <Link href="/home" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] rounded-md">
        {inner}
      </Link>
    )
  }
  return inner
}
