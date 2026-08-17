import { motion } from 'framer-motion'
import { useRhythm, fmtHM } from '../entities/rhythm/useRhythm'
import { ACCENTS, ICON_PATHS } from '../entities/rhythm/activities'

export function SegmentStatus({ rhythm }: { rhythm: ReturnType<typeof useRhythm> }) {
  const { cur, resting, remain, total, nextSegment } = rhythm
  const cfg = ACCENTS[cur.color as keyof typeof ACCENTS] ?? ACCENTS.blue
  const progress = 1 - remain / Math.max(1, total)
  const nextLabel = nextSegment ? nextSegment.label : '—'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-sm overflow-hidden"
      style={{ borderColor: cfg.border }}
    >
      <div className="flex items-stretch gap-0">
        {/* Color accent bar */}
        <div className="w-[3px] shrink-0 rounded-l-sm" style={{ background: cfg.gradient }} />

        <div className="flex-1 flex items-center gap-3.5 px-4 py-3">
          {/* Icon */}
          <div
            className="flex items-center justify-center size-9 rounded-lg shrink-0"
            style={{ background: cfg.bg, color: cfg.color }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={ICON_PATHS[cur.type] ?? ICON_PATHS.clock} />
            </svg>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-1">
              <span className="text-[13px] font-semibold text-[var(--text)]">{cur.label}</span>
              <span className="text-[10px] text-[var(--text-faint)] font-mono px-1.5 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--stroke)]">
                {fmtHM(cur.start)}–{fmtHM(cur.end)}
              </span>
              {resting && (
                <span className="text-[9px] font-medium uppercase tracking-[0.1em] px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
                  сейчас
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-[11px] text-[var(--text-dim)]">
              <span>до {fmtHM(cur.end)}</span>
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
              style={{ color: cfg.color }}
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
