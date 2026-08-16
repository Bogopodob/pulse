import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useRhythm, fmtHM } from '../hooks/useRhythm'

function fmtDur(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return m === 0 ? `${h} ч` : `${h} ч ${m} мин`
}

export function Timeline({ rhythm }: { rhythm: ReturnType<typeof useRhythm> }) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showJump, setShowJump] = useState(false)
  const [hv, setHv] = useState<{ x: number; min: number; type: string } | null>(null)
  const velocityRef = useRef(0)
  const offsetRef = useRef(0)
  const rafRef = useRef(0)
  const dragStartX = useRef(0)
  const dragStartOffset = useRef(0)
  const barsRef = useRef<HTMLDivElement>(null)
  const lensRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<HTMLDivElement>(null)
  const rulerRef = useRef<HTMLDivElement>(null)
  const playheadTimeRef = useRef<HTMLDivElement>(null)

  const { DAY_START, DAY_END, STEP_MIN, PITCH, segments } = rhythm

  const bars = rhythm.buildBars()
  const totalBars = bars.length
  const rowWidth = totalBars * PITCH

  const totals = useMemo(() => {
    const t: Record<string, number> = { focus: 0, rest: 0, lunch: 0 }
    for (const s of segments) if (s.type in t) t[s.type] += s.end - s.start
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
    if (lensRef.current) lensRef.current.style.transform = `translateX(${tx}px)`
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
    const id = setInterval(() => {
      applyTransform()
    }, 1000)
    return () => clearInterval(id)
  }, [applyTransform])

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  const animateTo = useCallback((min: number) => {
    const target = (min - rhythm.nowMinutes) / STEP_MIN * PITCH
    const onDone = () => {
      ;[barsRef, lensRef, markersRef, rulerRef].forEach((ref) => {
        if (ref.current) ref.current.style.transition = 'none'
      })
    }
    ;[barsRef, lensRef, markersRef, rulerRef].forEach((ref) => {
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
    <div className="card card-lift relative z-[1] p-0 overflow-hidden">
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
        className="relative h-[220px] mt-3 overflow-hidden cursor-grab"
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
          setHv({ x: relX, min, type: s.type })
        }}
        onMouseLeave={() => setHv(null)}
      >
        <div className="absolute inset-0 pointer-events-none z-[6]"
          style={{
            background: 'linear-gradient(90deg, var(--surface) 0%, transparent 120px, transparent calc(100% - 120px), var(--surface) 100%)',
          }}
        />

        {(() => {
          const t = rhythm.cur.type
          if (t === 'off') return null
          const c = t === 'rest' ? '255,157,92' : t === 'lunch' ? '79,212,196' : '76,141,255'
          return (
            <div
              className="absolute left-1/2 -translate-x-1/2 top-[30px] bottom-[62px] w-[320px] pointer-events-none rounded-full"
              style={{ background: `radial-gradient(ellipse at center, rgba(${c},0.14), transparent 70%)`, filter: 'blur(28px)' }}
            />
          )
        })()}

        <div ref={barsRef} className="absolute left-0 top-[30px] bottom-[62px] flex items-end will-change-transform" style={{ width: rowWidth, transformStyle: 'preserve-3d' }}>
          {bars.map((bar, i) => (
            <div
              key={i}
              className={`shrink-0 rounded-t-[3px] rounded-b-[1px] ${bar.type}`}
              style={{
                width: PITCH - 2,
                marginRight: 1,
                height: bar.height,
                background: bar.type === 'focus' ? 'linear-gradient(180deg, var(--focus-2), var(--focus))'
                  : bar.type === 'rest' ? 'linear-gradient(180deg, var(--rest-2), var(--rest))'
                  : bar.type === 'lunch' ? 'linear-gradient(180deg, var(--lunch-2), var(--lunch))'
                  : 'var(--off)',
                opacity: bar.type === 'off' ? 0.55 : 1,
              }}
            />
          ))}
        </div>

        <div className="absolute left-0 top-[30px] bottom-[62px] left-1/2 -translate-x-1/2 w-[170px] overflow-hidden pointer-events-none z-[4] rounded-[14px]"
          style={{
            boxShadow: '0 0 0 1px rgba(255,255,255,0.12), 0 0 40px rgba(76,141,255,0.18), inset 0 0 30px rgba(255,255,255,0.03)',
            background: 'rgba(255,255,255,0.025)',
            backdropFilter: 'blur(0.3px)',
          }}
        >
          <div ref={lensRef} className="flex items-end will-change-transform" style={{ width: rowWidth, marginLeft: -1000 }}>
            {bars.map((bar, i) => (
              <div
                key={i}
                style={{
                  width: PITCH - 2,
                  marginRight: 1,
                  height: bar.height * 1.32,
                  background: bar.type === 'focus' ? 'linear-gradient(180deg, var(--focus-2), var(--focus))'
                    : bar.type === 'rest' ? 'linear-gradient(180deg, var(--rest-2), var(--rest))'
                    : bar.type === 'lunch' ? 'linear-gradient(180deg, var(--lunch-2), var(--lunch))'
                    : 'var(--off)',
                  opacity: bar.type === 'off' ? 0.55 : 1,
                  filter: 'saturate(1.4) brightness(1.2)',
                  transformOrigin: 'bottom',
                  borderRadius: '3px 3px 1px 1px',
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
        </div>

        <div ref={markersRef} className="absolute left-0 top-[4px] h-[20px] will-change-transform z-[3]" style={{ width: rowWidth }}>
          {segments.filter(s => s.type === 'rest' || s.type === 'lunch').map((s) => {
            const x = ((s.start - DAY_START) / STEP_MIN) * PITCH
            return (
              <div
                key={s.start}
                className="absolute text-[10px] font-semibold whitespace-nowrap px-2 py-0.5 rounded-full"
                style={{
                  left: x,
                  transform: 'translateX(-50%)',
                  color: s.type === 'lunch' ? '#bff2e6' : '#ffd7b0',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--stroke)',
                  opacity: 0.55,
                }}
              >
                {s.type === 'lunch' ? `Обед · ${fmtHM(s.start)}` : `Перерыв · ${fmtHM(s.start)}`}
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
            boxShadow: '0 0 12px rgba(255,255,255,0.6)',
          }}
        >
          <div
            ref={playheadTimeRef}
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full font-mono text-[12px] text-white bg-[var(--surface-3)] border border-[var(--stroke)] px-2 py-0.5 rounded-md whitespace-nowrap -mt-2"
          >
            {fmtHM(rhythm.nowMinutes)}
          </div>
        </div>

        {hv && (() => {
          const cfg = segStyles[hv.type]
          return (
            <div className="absolute z-[8] pointer-events-none" style={{ left: hv.x, top: 26, transform: 'translateX(-50%)' }}>
              <div
                className="flex items-center gap-1.5 px-2 py-1 rounded-md whitespace-nowrap"
                style={{ background: 'var(--surface-3)', border: '1px solid var(--stroke)', boxShadow: '0 6px 18px rgba(0,0,0,0.4)' }}
              >
                <span style={{ color: cfg.color }}>{cfg.icon}</span>
                <span className="text-[10.5px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
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
              const c = s.type === 'focus' ? 'linear-gradient(180deg, var(--focus-2), var(--focus))'
                : s.type === 'rest' ? 'linear-gradient(180deg, var(--rest-2), var(--rest))'
                : s.type === 'lunch' ? 'linear-gradient(180deg, var(--lunch-2), var(--lunch))'
                : 'var(--off)'
              return (
                <button
                  key={s.start}
                  onClick={() => animateTo(s.start + 1)}
                  title={`${fmtHM(s.start)} — ${segStyles[s.type].label}`}
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
          { key: 'rest', label: 'Перерывы', color: 'var(--rest)' },
          { key: 'lunch', label: 'Обед', color: 'var(--lunch)' },
        ].map((c) => (
          <div key={c.key} className="flex items-center gap-1.5">
            <span className="size-[6px] rounded-full" style={{ background: c.color, boxShadow: `0 0 6px ${c.color}` }} />
            <span className="text-[10.5px] text-[var(--text-faint)] font-medium">{c.label}</span>
            <span className="text-[10.5px] font-semibold font-mono tabular-nums" style={{ color: c.color }}>{fmtDur(totals[c.key])}</span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-1.5 text-[10.5px] text-[var(--text-faint)] font-mono">
          {fmtHM(DAY_START)}–{fmtHM(DAY_END)}
        </div>
      </div>
    </div>
  )
}

const segStyles: Record<string, { label: string; gradient: string; bg: string; border: string; color: string; icon: React.ReactNode }> = {
  focus: {
    label: 'Фокус',
    gradient: 'linear-gradient(135deg, var(--focus), var(--focus-2))',
    bg: 'rgba(76,141,255,0.06)',
    border: 'rgba(76,141,255,0.2)',
    color: 'var(--focus)',
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  },
  rest: {
    label: 'Перерыв',
    gradient: 'linear-gradient(135deg, var(--rest), var(--rest-2))',
    bg: 'rgba(255,157,92,0.06)',
    border: 'rgba(255,157,92,0.2)',
    color: 'var(--rest)',
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C8 6 6 9 6 13a6 6 0 0 0 12 0c0-4-2-7-6-11z" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  },
  lunch: {
    label: 'Обед',
    gradient: 'linear-gradient(135deg, var(--lunch), var(--lunch-2))',
    bg: 'rgba(79,212,196,0.06)',
    border: 'rgba(79,212,196,0.2)',
    color: 'var(--lunch)',
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 0 0-7 17h14a10 10 0 0 0-7-17z" strokeLinecap="round"/><path d="M8 19v1a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-1"/></svg>,
  },
  off: {
    label: 'Вне графика',
    gradient: 'linear-gradient(135deg, var(--off), #5a5d65)',
    bg: 'rgba(74,77,85,0.06)',
    border: 'rgba(74,77,85,0.2)',
    color: 'var(--text-faint)',
    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h0" strokeLinecap="round"/></svg>,
  },
}


