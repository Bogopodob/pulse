import { useEffect, useRef, useState, useCallback, useMemo, memo } from 'react'
import { useRhythm, fmtHM, buildBars } from '../entities/rhythm/useRhythm'
import { ACCENTS, ICON_PATHS } from '../entities/rhythm/activities'

function fmtDur(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return m === 0 ? `${h} ч` : `${h} ч ${m} мин`
}

const BREAK_GROUP = new Set(['break', 'smoke', 'rest'])
const FOOD_GROUP = new Set(['lunch', 'breakfast', 'dinner'])

export function Timeline({ rhythm }: { rhythm: ReturnType<typeof useRhythm> }) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showJump, setShowJump] = useState(false)
  const [hv, setHv] = useState<{ x: number; min: number; type: string; color: string; label: string } | null>(null)
  const velocityRef = useRef(0)
  const offsetRef = useRef(0)
  const rafRef = useRef(0)
  const dragStartX = useRef(0)
  const dragStartOffset = useRef(0)
  const barsRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<HTMLDivElement>(null)
  const rulerRef = useRef<HTMLDivElement>(null)
  const playheadTimeRef = useRef<HTMLDivElement>(null)

  const { DAY_START, DAY_END, STEP_MIN, PITCH, segments } = rhythm

  const bars = useMemo(() => buildBars(segments), [segments])
  const totalBars = bars.length
  const rowWidth = totalBars * PITCH

  const totals = useMemo(() => {
    const t = { focus: 0, break: 0, food: 0 }
    for (const s of segments) {
      if (s.type === 'focus') t.focus += s.end - s.start
      else if (BREAK_GROUP.has(s.type)) t.break += s.end - s.start
      else if (FOOD_GROUP.has(s.type)) t.food += s.end - s.start
    }
    return t
  }, [segments])

  const homeOffsetPx = ((rhythm.nowMinutes - DAY_START) / STEP_MIN) * PITCH

  const viewportCenterPx = useCallback(() => {
    return viewportRef.current ? viewportRef.current.clientWidth / 2 : 300
  }, [])

  const applyTransform = useCallback(() => {
    const total = homeOffsetPx + offsetRef.current
    const tx = viewportCenterPx() - total
    const tilt = Math.max(-8, Math.min(8, velocityRef.current * 0.12))
    const blur = Math.min(3, Math.abs(velocityRef.current) * 0.05)
    const style = `translateX(${tx}px) rotateX(${tilt}deg)`

    if (barsRef.current) barsRef.current.style.transform = style
    if (markersRef.current) markersRef.current.style.transform = `translateX(${tx}px)`
    if (rulerRef.current) rulerRef.current.style.transform = `translateX(${tx}px)`
    if (barsRef.current) {
      barsRef.current.style.filter = blur > 0.15 ? `blur(${blur}px)` : 'none'
    }

    const minuteAtCenter = DAY_START + total / PITCH * STEP_MIN
    if (playheadTimeRef.current) playheadTimeRef.current.textContent = fmtHM(minuteAtCenter)

    setShowJump(Math.abs(offsetRef.current) > 4)
  }, [homeOffsetPx, viewportCenterPx, DAY_START, PITCH, STEP_MIN])

  const physicsLoop = useCallback(() => {
    if (Math.abs(velocityRef.current) > 0.02) {
      offsetRef.current += velocityRef.current
      velocityRef.current *= 0.90
      applyTransform()
      rafRef.current = requestAnimationFrame(physicsLoop)
    } else {
      velocityRef.current = 0
    }
  }, [applyTransform])

  const applyRef = useRef(applyTransform)
  applyRef.current = applyTransform

  useEffect(() => {
    let raf = 0
    const loop = () => {
      applyRef.current()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      velocityRef.current += delta * 0.9
      velocityRef.current = Math.max(-40, Math.min(40, velocityRef.current))
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(physicsLoop)
    }
    vp.addEventListener('wheel', handler, { passive: false })
    return () => vp.removeEventListener('wheel', handler)
  }, [physicsLoop])

  useEffect(() => {
    if (!isDragging) return
    const onMove = (e: MouseEvent) => {
      offsetRef.current = dragStartOffset.current - (e.clientX - dragStartX.current)
      applyTransform()
    }
    const onUp = () => setIsDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [isDragging, applyTransform])

  useEffect(() => {
    applyTransform()
  }, [bars])

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  const animateTo = useCallback((min: number) => {
    const target = (min - rhythm.nowMinutes) / STEP_MIN * PITCH
    const onDone = () => {
      ;[barsRef, markersRef, rulerRef].forEach((ref) => {
        if (ref.current) ref.current.style.transition = 'none'
      })
    }
    ;[barsRef, markersRef, rulerRef].forEach((ref) => {
      if (ref.current) ref.current.style.transition = 'transform 0.6s cubic-bezier(0.2,0.9,0.25,1)'
    })
    offsetRef.current = target
    velocityRef.current = 0
    applyTransform()
    setTimeout(onDone, 620)
  }, [applyTransform, rhythm.nowMinutes, STEP_MIN, PITCH])

  useEffect(() => {
    const handler = (e: Event) => {
      const min = (e as CustomEvent<{ min: number }>).detail?.min
      if (typeof min === 'number') animateTo(min)
    }
    window.addEventListener('rhythm:go-to', handler)
    return () => window.removeEventListener('rhythm:go-to', handler)
  }, [animateTo])

  const handleJumpNow = () => {
    animateTo(rhythm.nowMinutes)
  }

  return (
    <div className="card card-lift relative z-[1] h-full flex flex-col p-0 overflow-hidden">
      <div className="flex items-center justify-between px-6 pt-5 pb-1">
        <h3 className="font-[var(--font-display)] text-[15.5px] font-semibold">Ритм дня</h3>
        <div className="flex items-center gap-2.5">
          <button
            className={`text-[11px] font-semibold text-[var(--focus)] bg-[rgba(76,141,255,0.1)] border border-[rgba(76,141,255,0.25)] px-2.5 py-1 rounded-full cursor-pointer transition-all ${showJump ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-[-4px] pointer-events-none'}`}
            onClick={handleJumpNow}
          >
            К текущему моменту
          </button>
          <div className="flex items-center gap-1 text-[11px] text-[var(--text-faint)]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 19V5M12 5l-5 5M12 5l5 5" />
              <path d="M5 21h14" />
            </svg>
            крутите колесо мыши
          </div>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="timeline-viewport relative flex-1 min-h-[220px] mt-3 overflow-hidden cursor-grab"
        style={{ perspective: '1000px' }}
        onMouseDown={(e) => {
          setIsDragging(true)
          dragStartX.current = e.clientX
          dragStartOffset.current = offsetRef.current
          velocityRef.current = 0
          cancelAnimationFrame(rafRef.current)
          if (viewportRef.current) viewportRef.current.style.cursor = 'grabbing'
        }}
        onMouseUp={() => {
          if (viewportRef.current) viewportRef.current.style.cursor = 'grab'
        }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const relX = e.clientX - rect.left
          const min = DAY_START + (relX + offsetRef.current) / PITCH * STEP_MIN
          const s = segments.find((sg) => min >= sg.start && min < sg.end) ?? segments[segments.length - 1]
          setHv({ x: relX, min, type: s.type, color: s.color, label: s.label })
        }}
        onMouseLeave={() => setHv(null)}
      >
        <div className="absolute inset-0 pointer-events-none z-[6]"
          style={{
            background: 'linear-gradient(90deg, var(--surface) 0%, transparent 120px, transparent calc(100% - 120px), var(--surface) 100%)',
          }}
        />

        {(() => {
          const t = rhythm.cur
          if (t.type === 'off') return null
          const a = ACCENTS[t.color as keyof typeof ACCENTS] ?? ACCENTS.blue
          return (
            <div
              className="absolute left-1/2 -translate-x-1/2 top-[30px] bottom-[62px] w-[320px] pointer-events-none rounded-full"
              style={{ background: `radial-gradient(ellipse at center, rgba(${a.glow},0.14), transparent 70%)`, filter: 'blur(28px)' }}
            />
          )
        })()}

        <div ref={barsRef} className="absolute left-0 top-[30px] bottom-[62px] flex items-end will-change-transform" style={{ width: rowWidth, transformStyle: 'preserve-3d' }}>
          <BarsLayer bars={bars} pitch={PITCH} />
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 top-[30px] bottom-[62px] w-[200px] pointer-events-none z-[4]"
          style={{ background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.06), transparent 70%)' }}
        />

        <div ref={markersRef} className="absolute left-0 top-[4px] h-[20px] will-change-transform z-[3]" style={{ width: rowWidth }}>
          {segments.filter(s => s.type !== 'focus' && s.type !== 'off').map((s) => {
            const x = ((s.start - DAY_START) / STEP_MIN) * PITCH
            const a = ACCENTS[s.color as keyof typeof ACCENTS] ?? ACCENTS.blue
            return (
              <div
                key={s.start}
                className="absolute text-[10px] font-semibold whitespace-nowrap px-2 py-0.5 rounded-full"
                style={{
                  left: x,
                  transform: 'translateX(-50%)',
                  color: a.color,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--stroke)',
                  opacity: 0.55,
                }}
              >
                {`${s.label} · ${fmtHM(s.start)}`}
              </div>
            )
          })}
        </div>

        <div ref={rulerRef} className="absolute left-0 bottom-[6px] h-[52px] will-change-transform" style={{ width: rowWidth }}>
          {Array.from({ length: Math.ceil((DAY_END - DAY_START) / 60) + 1 }, (_, i) => {
            const m = DAY_START + i * 60
            const x = ((m - DAY_START) / STEP_MIN) * PITCH
            return (
              <div key={m} className="absolute bottom-0 font-mono text-[10.5px] text-[var(--text-faint)]" style={{ left: x, transform: 'translateX(-50%)' }}>
                <div className="absolute bottom-[16px] left-1/2 w-px h-[6px] bg-[var(--stroke)]" />
                {fmtHM(m)}
              </div>
            )
          })}

        </div>

        <div className="absolute top-[22px] bottom-[56px] left-1/2 w-[2px] z-5 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, transparent, #fff 15%, #fff 85%, transparent)',
          }}
        >
          <div
            ref={playheadTimeRef}
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[6] font-mono text-[12px] text-white bg-[var(--surface-3)] border border-[var(--stroke)] px-2 py-0.5 rounded-md whitespace-nowrap"
          >
            {fmtHM(rhythm.nowMinutes)}
          </div>
        </div>

        {hv && (() => {
          const a = ACCENTS[hv.color as keyof typeof ACCENTS] ?? ACCENTS.blue
          return (
            <div className="absolute z-[8] pointer-events-none" style={{ left: hv.x, top: 26, transform: 'translateX(-50%)' }}>
              <div
                className="flex items-center gap-1.5 px-2 py-1 rounded-md whitespace-nowrap"
                style={{ background: 'var(--surface-3)', border: '1px solid var(--stroke)', boxShadow: '0 6px 18px rgba(0,0,0,0.4)' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={a.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={ICON_PATHS[hv.type] ?? ICON_PATHS.clock} />
                </svg>
                <span className="text-[10.5px] font-semibold" style={{ color: a.color }}>{hv.label}</span>
                <span className="text-[10px] text-[var(--text-dim)] font-mono">{fmtHM(hv.min)}</span>
              </div>
            </div>
          )
        })()}
      </div>

      <div className="px-6 pt-1 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-faint)] font-semibold shrink-0">Карта дня</span>
          <div className="flex-1 h-[12px] rounded-full overflow-hidden flex gap-px">
            {segments.map((s) => {
              const c = s.type === 'off' ? 'var(--off)' : (ACCENTS[s.color as keyof typeof ACCENTS] ?? ACCENTS.blue).gradient
              return (
                <button
                  key={s.start}
                  onClick={() => animateTo(s.start + 1)}
                  title={`${fmtHM(s.start)} — ${s.label}`}
                  className="h-full cursor-pointer transition-[filter] hover:brightness-125"
                  style={{ flex: s.end - s.start, background: c, opacity: s.type === 'off' ? 0.3 : 1 }}
                />
              )
            })}
          </div>
          <span className="text-[10px] font-mono text-[var(--text-faint)] shrink-0">24:00</span>
        </div>
      </div>

      <div className="flex items-center gap-5 px-6 py-3 border-t border-[var(--stroke)]">
        {[
          { key: 'focus', label: 'Фокус', color: 'var(--focus)' },
          { key: 'break', label: 'Паузы', color: 'var(--rest)' },
          { key: 'food', label: 'Еда', color: 'var(--lunch)' },
        ].map((c) => (
          <div key={c.key} className="flex items-center gap-1.5">
            <span className="size-[6px] rounded-full" style={{ background: c.color, boxShadow: `0 0 6px ${c.color}` }} />
            <span className="text-[10.5px] text-[var(--text-faint)] font-medium">{c.label}</span>
            <span className="text-[10.5px] font-semibold font-mono tabular-nums" style={{ color: c.color }}>{fmtDur(totals[c.key as keyof typeof totals])}</span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-1.5 text-[10.5px] text-[var(--text-faint)] font-mono">
          {fmtHM(DAY_START)}–{fmtHM(DAY_END)}
        </div>
      </div>
    </div>
  )
}

const BarsLayer = memo(function BarsLayer({ bars, pitch }: { bars: { type: string; height: number; color: string }[]; pitch: number }) {
  return (
    <>
      {bars.map((bar, i) => (
        <div
          key={i}
          className={`shrink-0 rounded-t-[3px] rounded-b-[1px] ${bar.type}`}
          style={{
            width: pitch - 2,
            marginRight: 1,
            height: bar.height,
            background: bar.type === 'off' ? 'var(--off)' : (ACCENTS[bar.color as keyof typeof ACCENTS] ?? ACCENTS.blue).gradient,
            opacity: bar.type === 'off' ? 0.55 : 1,
          }}
        />
      ))}
    </>
  )
})


