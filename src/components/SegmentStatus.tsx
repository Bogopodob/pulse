import { motion } from 'framer-motion'
import { useRhythm, fmtHM } from '../hooks/useRhythm'

const segmentConfig = {
  focus: {
    label: 'Фокус',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2">
        <circle cx="12" cy="12" r="9" stroke="currentColor" />
        <path d="M12 7v5l3.5 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    gradient: 'linear-gradient(135deg, var(--focus), var(--focus-2))',
    bgGlow: 'rgba(76,141,255,0.06)',
    borderGlow: 'rgba(76,141,255,0.2)',
    textColor: 'var(--focus)',
  },
  rest: {
    label: 'Перерыв',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2">
        <path d="M12 2C8 6 6 9 6 13a6 6 0 0 0 12 0c0-4-2-7-6-11z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    gradient: 'linear-gradient(135deg, var(--rest), var(--rest-2))',
    bgGlow: 'rgba(255,157,92,0.06)',
    borderGlow: 'rgba(255,157,92,0.2)',
    textColor: 'var(--rest)',
  },
  lunch: {
    label: 'Обед',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2">
        <path d="M12 2a10 10 0 0 0-7 17h14a10 10 0 0 0-7-17z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 19v1a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-1" stroke="currentColor" />
      </svg>
    ),
    gradient: 'linear-gradient(135deg, var(--lunch), var(--lunch-2))',
    bgGlow: 'rgba(79,212,196,0.06)',
    borderGlow: 'rgba(79,212,196,0.2)',
    textColor: 'var(--lunch)',
  },
  off: {
    label: 'Вне графика',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2">
        <circle cx="12" cy="12" r="9" stroke="currentColor" />
        <path d="M12 8v4M12 16h0" stroke="currentColor" strokeLinecap="round" />
      </svg>
    ),
    gradient: 'linear-gradient(135deg, var(--off), #5a5d65)',
    bgGlow: 'rgba(74,77,85,0.06)',
    borderGlow: 'rgba(74,77,85,0.2)',
    textColor: 'var(--text-faint)',
  },
}

export function SegmentStatus({ rhythm }: { rhythm: ReturnType<typeof useRhythm> }) {
  const { nowMinutes, cur, resting, remain, total, nextSegment, ruleLabelAt } = rhythm
  const cfg = segmentConfig[cur.type]
  const progress = 1 - remain / Math.max(1, total)
  const nextLabel = nextSegment ? segmentConfig[nextSegment.type].label : '—'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-sm overflow-hidden"
      style={{ borderColor: cfg.borderGlow }}
    >
      <div className="flex items-stretch gap-0">
        {/* Color accent bar */}
        <div className="w-[3px] shrink-0 rounded-l-sm" style={{ background: cfg.gradient }} />

        <div className="flex-1 flex items-center gap-3.5 px-4 py-3">
          {/* Icon */}
          <div
            className="flex items-center justify-center size-9 rounded-lg shrink-0"
            style={{ background: cfg.bgGlow, color: cfg.textColor }}
          >
            {cfg.icon}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-1">
              <span className="text-[13px] font-semibold text-[var(--text)]">{cfg.label}</span>
              <span className="text-[10px] text-[var(--text-faint)] font-mono px-1.5 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--stroke)]">
                {fmtHM(cur.start)}–{fmtHM(cur.end)}
              </span>
              {resting && (
                <span className="text-[9px] font-medium uppercase tracking-[0.1em] px-2 py-0.5 rounded-full" style={{ background: cfg.bgGlow, color: cfg.textColor }}>
                  сейчас
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-[11px] text-[var(--text-dim)]">
              <span>{ruleLabelAt(nowMinutes)}</span>
              <span className="w-px h-3 bg-[var(--stroke)]" />
              <span>далее: {nextLabel}</span>
              {nextSegment && (
                <span className="font-mono text-[var(--text-faint)]">{fmtHM(nextSegment.start)}</span>
              )}
            </div>
          </div>

          {/* Time + progress */}
          <div className="shrink-0 flex flex-col items-end gap-1.5">
            <motion.span
              key={Math.round(remain)}
              initial={{ opacity: 0.5, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[18px] font-semibold font-[var(--font-display)] tabular-nums tracking-tight"
              style={{ color: cfg.textColor }}
            >
              {fmtHM(remain)}
            </motion.span>
            <div className="flex items-center gap-2">
              <div className="w-[72px] h-[3px] rounded-full bg-[var(--surface-2)] overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: cfg.gradient }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(2, progress * 100)}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              <span className="text-[9px] text-[var(--text-faint)] tabular-nums font-mono">
                {Math.round(progress * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
