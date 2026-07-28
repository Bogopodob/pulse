import { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useRhythm, fmtHM } from '../hooks/useRhythm'

export function Timeline({ rhythm }: { rhythm: ReturnType<typeof useRhythm> }) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showJump, setShowJump] = useState(false)
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

  const handleJumpNow = () => {
    const onDone = () => {
      if (barsRef.current) barsRef.current.style.transition = 'none'
      if (lensRef.current) lensRef.current.style.transition = 'none'
      if (markersRef.current) markersRef.current.style.transition = 'none'
      if (rulerRef.current) rulerRef.current.style.transition = 'none'
    }
    ;[barsRef, lensRef, markersRef, rulerRef].forEach((ref) => {
      if (ref.current) ref.current.style.transition = 'transform 0.6s cubic-bezier(0.2,0.9,0.25,1)'
    })
    offsetRef.current = 0
    velocityRef.current = 0
    applyTransform()
    setTimeout(onDone, 620)
  }

  return (
    <div className="card p-0 overflow-hidden">
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
      >
        <div className="absolute inset-0 pointer-events-none z-[6]"
          style={{
            background: 'linear-gradient(90deg, var(--surface) 0%, transparent 120px, transparent calc(100% - 120px), var(--surface) 100%)',
          }}
        />

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

        {(() => {
          const { cur, nowMinutes } = rhythm
          const cfg = cur ? segStyles[cur.type] : null
          if (!cfg || cur.type === 'off') return null
          const remain = Math.max(0, cur.end - nowMinutes)
          const total = Math.max(1, cur.end - cur.start)
          const pct = 1 - remain / total
          return (
            <div className="absolute left-1/2 z-10 pointer-events-none" style={{ bottom: '62px', transform: 'translateX(-50%)' }}>
              <div
                className="flex items-center gap-2 px-2.5 py-1 rounded-lg whitespace-nowrap"
                style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
              >
                <div className="flex items-center justify-center size-5 rounded shrink-0" style={{ color: cfg.color }}>
                  {cfg.icon}
                </div>
                <span className="text-[11px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                {cur.task && (
                  <span className="text-[10px] text-[var(--text-dim)] font-medium max-w-[90px] truncate">{cur.task}</span>
                )}
                <span className="w-px h-3 bg-[var(--stroke)]" />
                <span className="text-[9px] text-[var(--text-faint)] font-mono">{fmtHM(cur.start)}–{fmtHM(cur.end)}</span>
                <span className="w-px h-3 bg-[var(--stroke)]" />
                <motion.span
                  key={Math.round(remain * 2)}
                  initial={{ opacity: 0.4 }}
                  animate={{ opacity: 1 }}
                  className="text-[13px] font-semibold font-[var(--font-display)] tabular-nums leading-none min-w-[44px] text-right"
                  style={{ color: cfg.color }}
                >
                  {fmtHM(remain)}
                </motion.span>
                <div className="w-[32px] h-[2px] rounded-full bg-[var(--surface-2)] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(2, pct * 100)}%`, background: cfg.gradient }} />
                </div>
              </div>
            </div>
          )
        })()}
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


