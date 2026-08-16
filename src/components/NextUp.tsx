import { motion, AnimatePresence } from 'framer-motion'
import { useRhythm, fmtHM } from '../hooks/useRhythm'

const CIRC = 2 * Math.PI * 43

const ICONS: Record<string, { path: string; color: string; bg: string; border: string }> = {
  focus: { path: 'M12 7v5l3.5 2', color: '#bcd4ff', bg: 'rgba(76,141,255,0.1)', border: 'rgba(76,141,255,0.25)' },
  rest: { path: 'M12 2C8 6 6 9 6 13a6 6 0 0 0 12 0c0-4-2-7-6-11z', color: '#ffd7b0', bg: 'rgba(255,157,92,0.1)', border: 'rgba(255,157,92,0.25)' },
  lunch: { path: 'M7 9h10a3 3 0 0 1 0 6H7a3 3 0 0 1 0-6zM7 15v3M11 15v3M8 5h1M12 5h1', color: '#bff2e6', bg: 'rgba(79,212,196,0.1)', border: 'rgba(79,212,196,0.25)' },
}

export function NextUp({ rhythm }: { rhythm: ReturnType<typeof useRhythm> }) {
  const { nowMinutes, cur, resting, remain, ruleLabelAt, segments, progress } = rhythm
  const remainTotal = Math.max(1, cur.end - cur.start)
  const offset = CIRC * (1 - remain / remainTotal)

  const upcoming: typeof segments = (() => {
    const out: typeof segments = []
    const idx = segments.findIndex((s) => s.start > cur.start)
    for (let i = idx; i < segments.length && out.length < 2; i++) {
      if (segments[i].type !== 'off') out.push(segments[i])
    }
    return out
  })()

  const urgent = !resting && remain < 600

  const title = resting
    ? `${cur.type === 'lunch' ? 'Обеденный перерыв' : 'Перерыв'} · до ${fmtHM(cur.end)}`
    : cur.type === 'off'
      ? 'Вне графика'
      : `Фокус · ${cur.task}`

  const subtitle = resting
    ? `следующий фокус начнётся в ${fmtHM(cur.end)}`
    : cur.type === 'off'
      ? `следующее событие в ${fmtHM(cur.end)}`
      : `в ${fmtHM(cur.end)}, правило «${ruleLabelAt(nowMinutes)}»`

  return (
    <div className={`card card-lift relative z-[1] overflow-hidden p-6 flex flex-col ${resting ? 'resting' : ''}`}>
      <div
        className="absolute w-[460px] h-[460px] left-1/2 -translate-x-1/2 top-[-260px] pointer-events-none rounded-full transition-all duration-600"
        style={{
          background: resting
            ? 'radial-gradient(circle, rgba(255,157,92,0.12), transparent 65%)'
            : 'radial-gradient(circle, rgba(76,141,255,0.10), transparent 65%)',
        }}
      />

      <div className="absolute top-0 left-0 right-0 h-[2px] z-[2]" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{
            background: resting
              ? 'linear-gradient(90deg, var(--rest), var(--rest-2))'
              : 'linear-gradient(90deg, var(--focus), var(--focus-2))',
            boxShadow: resting
              ? '0 0 8px rgba(255,157,92,0.7)'
              : '0 0 8px rgba(76,141,255,0.7)',
          }}
          animate={{ width: `${Math.round(progress * 100)}%` }}
          transition={{ duration: 0.4, ease: 'linear' }}
        />
      </div>

      <div className="relative flex flex-col items-center text-center">
        <div className="text-[11px] uppercase tracking-[0.12em] text-[var(--text-faint)] font-semibold">
          {resting ? 'Сейчас' : 'Дальше по плану'}
        </div>

        <div className="relative w-[150px] h-[150px] mt-4">
          <div className={`nu-ring-glow ${resting ? 'rest' : ''}`} />
          <svg width="150" height="150" viewBox="0 0 100 100" className="-rotate-90">
            <defs>
              <linearGradient id="nuGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--focus)" />
                <stop offset="100%" stopColor="var(--focus-2)" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="43" fill="none" stroke="var(--surface-3)" strokeWidth="7" />
            <motion.circle
              cx="50" cy="50" r="43"
              fill="none"
              strokeWidth="7"
              strokeLinecap="round"
              stroke={resting ? 'var(--rest)' : 'url(#nuGrad)'}
              strokeDasharray={CIRC.toFixed(1)}
              initial={false}
              animate={{ strokeDashoffset: offset.toFixed(1) }}
              transition={{ duration: 0.3, ease: 'linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            {resting ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--rest)" strokeWidth="2">
                <path d="M12 2C8 6 6 9 6 13a6 6 0 0 0 12 0c0-4-2-7-6-11z" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--focus)" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3.5 2" />
              </svg>
            )}
            <div
              className="font-[var(--font-display)] text-[34px] font-semibold tabular-nums leading-none tracking-[-0.02em]"
              style={{ color: urgent ? 'var(--rest)' : 'var(--text)' }}
            >
              {fmtHM(remain)}
            </div>
            <div className="text-[10.5px] text-[var(--text-faint)]">осталось</div>
          </div>
        </div>

        <div className="relative min-h-[44px] mt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${cur.type}-${cur.start}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <div className="font-[var(--font-display)] text-[17px] font-semibold tracking-[-0.01em] text-[var(--text)]">
                {title}
              </div>
              <div className="text-[12.5px] text-[var(--text-dim)] mt-1">
                {subtitle}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {upcoming.length > 0 && (
          <div className="flex items-center justify-center gap-1.5 mt-2.5 flex-wrap">
            {upcoming.map((s) => {
              const cfg = ICONS[s.type] ?? ICONS.focus
              return (
                <span
                  key={s.start}
                  className="flex items-center gap-1.5 rounded-full px-2 py-1 text-[10.5px] font-semibold"
                  style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d={cfg.path} />
                  </svg>
                  {s.type === 'focus' ? (s.task ?? 'Фокус') : s.type === 'lunch' ? 'Обед' : 'Перерыв'}
                  <span className="opacity-60 font-mono">{fmtHM(s.start)}</span>
                </span>
              )
            })}
          </div>
        )}

        <div className="flex gap-2 mt-5 w-full">
          <motion.button
            whileTap={{ scale: 0.96 }}
            className="btn btn-ghost flex-1"
            onClick={() => {
              const el = document.querySelector('.timeline-viewport')
              if (el) el.scrollBy({ left: -200, behavior: 'smooth' })
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="13" r="8" />
              <path d="M12 9v4l2.5 1.5M9 3h6" />
            </svg>
            +5 мин
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            className={`btn btn-primary flex-1 ${resting ? '!bg-gradient-to-r !from-[var(--rest)] !to-[var(--rest-2)]' : ''}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
            {resting ? 'Закончить' : 'Начать сейчас'}
          </motion.button>
        </div>
      </div>
    </div>
  )
}