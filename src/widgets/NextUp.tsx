import { memo, useMemo, useRef } from 'react'
import { useRhythm, fmtHM, fmtMS } from '../entities/rhythm/useRhythm'
import { ACCENTS, ICON_PATHS } from '../entities/rhythm/activities'

const CIRC = 2 * Math.PI * 43

export const NextUp = memo(function NextUp({ rhythm }: { rhythm: ReturnType<typeof useRhythm> }) {
  const { cur, resting, remain, segments, progress } = rhythm
  const remainText = fmtMS(remain)
  const numTextRef = useRef<HTMLDivElement>(null)

  const remainTotal = useMemo(() => Math.max(1, cur.end - cur.start), [cur.end, cur.start])
  const offset = useMemo(() => CIRC * (1 - remain / remainTotal), [remain, remainTotal])

  const curAccent = useMemo(() => ACCENTS[cur.color as keyof typeof ACCENTS] ?? ACCENTS.blue, [cur.color])

  const upcoming = useMemo(() => segments.filter((s) => s.start > cur.start && s.type !== 'off').slice(0, 2), [segments, cur.start])

  const urgent = !resting && remain < 600

  const title = cur.type === 'off'
    ? 'Вне графика'
    : resting
      ? `${cur.label} · до ${fmtHM(cur.end)}`
      : `Фокус · ${cur.label}`

  const subtitle = cur.type === 'off'
    ? `следующий блок начнётся в ${fmtHM(cur.end)}`
    : `до ${fmtHM(cur.end)}`

  return (
    <div className={`card card-lift relative z-[1] h-full overflow-hidden p-6 flex flex-col ${resting ? 'resting' : ''}`}>
      <div
        className="absolute w-[460px] h-[460px] left-1/2 -translate-x-1/2 top-[-260px] pointer-events-none rounded-full will-change-transform"
        style={{
          background: `radial-gradient(circle, rgba(${curAccent.glow},0.12), transparent 65%)`,
        }}
      />

      <div className="absolute top-0 left-0 right-0 h-[2px] z-[2] overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div
          className="h-full rounded-full origin-left"
          style={{
            background: resting
              ? `linear-gradient(90deg, ${curAccent.dot}, ${curAccent.dot})`
              : 'linear-gradient(90deg, var(--focus), var(--focus-2))',
            boxShadow: `0 0 8px rgba(${curAccent.glow},0.7)`,
            transform: `scaleX(${progress})`,
            transition: 'transform 0.35s linear',
          }}
        />
      </div>

      <div className="relative flex-1 flex flex-col items-center text-center justify-center">
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
            <circle
              cx="50" cy="50" r="43"
              fill="none"
              strokeWidth="7"
              strokeLinecap="round"
              stroke={resting ? curAccent.dot : 'url(#nuGrad)'}
              strokeDasharray={CIRC.toFixed(1)}
              style={{
                strokeDashoffset: offset.toFixed(1),
                transition: 'stroke-dashoffset 0.3s linear',
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-2">
            {resting ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={curAccent.dot} strokeWidth="2">
                <path d={ICON_PATHS[cur.type] ?? ICON_PATHS.clock} />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={curAccent.dot} strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3.5 2" />
              </svg>
            )}
            <div className="w-full flex justify-center overflow-hidden">
              <div
                ref={numTextRef}
                className="font-[var(--font-display)] text-[23px] font-semibold tabular-nums leading-none tracking-[-0.02em] whitespace-nowrap inline-block"
                style={{
                  color: urgent ? 'var(--rest)' : 'var(--text)',
                }}
              >
                {remainText}
              </div>
            </div>
            <div className="text-[10.5px] text-[var(--text-faint)]">осталось</div>
          </div>
        </div>

        <div className="relative min-h-[44px] mt-4">
          <div key={`${cur.type}-${cur.start}`}>
            <div className="font-[var(--font-display)] text-[17px] font-semibold tracking-[-0.01em] text-[var(--text)]">
              {title}
            </div>
            <div className="text-[12.5px] text-[var(--text-dim)] mt-1">
              {subtitle}
            </div>
          </div>
        </div>

        {upcoming.length > 0 && (
          <div className="flex items-center justify-center gap-1.5 mt-2.5 flex-wrap">
            {upcoming.map((s) => {
              const a = ACCENTS[s.color as keyof typeof ACCENTS] ?? ACCENTS.blue
              return (
                <span
                  key={s.start}
                  className="flex items-center gap-1.5 rounded-full px-2 py-1 text-[10.5px] font-semibold"
                  style={{ background: a.bg, border: `1px solid ${a.border}`, color: a.color }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d={ICON_PATHS[s.type] ?? ICON_PATHS.clock} />
                  </svg>
                  {s.label}
                  <span className="opacity-60 font-mono">{fmtHM(s.start)}</span>
                </span>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
})