import { useEffect, useRef, useState, useCallback, useMemo, memo } from 'react'
import { useRhythm, fmtHM, fmtHMS, buildBars, SIM_SPEED_MIN_PER_SEC, DAY_START, DAY_END, STEP_MIN, PITCH } from '../entities/rhythm/useRhythm'
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
  const isDraggingRef = useRef(false)
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

  const baseRef = useRef({ min: rhythm.nowMinutes, ts: performance.now() })
  const smoothNowRef = useRef(rhythm.nowMinutes)

  /* Кэш геометрии вьюпорта: никаких clientWidth/getBoundingClientRect
     внутри покадровых обновлений — иначе layout thrash и фризы при драге. */
  const viewportCenterRef = useRef(300)
  const dirtyRef = useRef(false)
  const hoverFrameRef = useRef(0)
  const hoverEvtRef = useRef<number | null>(null)
  const lastHvKeyRef = useRef('')

  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return
    const update = () => {
      viewportCenterRef.current = vp.clientWidth / 2
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(vp)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    baseRef.current = { min: rhythm.nowMinutes, ts: performance.now() }
  }, [rhythm.nowMinutes])

  const applyTransform = useCallback((min: number) => {
    const homeOffsetPx = ((min - DAY_START) / STEP_MIN) * PITCH
    const total = homeOffsetPx + offsetRef.current
    const tx = viewportCenterRef.current - total

    /* Чистый translateX — композитор двигает готовую текстуру слоя.
       Никаких rotateX/perspective: 3D-проекция 720 полос = перерастеризация каждого кадра. */
    const style = `translateX(${tx}px)`
    if (barsRef.current) barsRef.current.style.transform = style
    if (markersRef.current) markersRef.current.style.transform = style
    if (rulerRef.current) rulerRef.current.style.transform = style

    const minuteAtCenter = DAY_START + total / PITCH * STEP_MIN
    if (playheadTimeRef.current) playheadTimeRef.current.textContent = fmtHMS(minuteAtCenter)
  }, [DAY_START, PITCH, STEP_MIN])

  /* Единственный владелец кадра: инерция, время и применение transform —
     в одном rAF-цикле. Раньше их было три (physicsLoop + 33мс-таймер + hover),
     и во время скролла они наедались друг на друга, подвешивая всю страницу. */
  useEffect(() => {
    let raf = 0
    const loop = (ts: number) => {
      // Инерция колеса: интегрируем скорость прямо здесь, по кадрам
      if (!isDraggingRef.current && Math.abs(velocityRef.current) > 0.02) {
        offsetRef.current += velocityRef.current
        velocityRef.current *= 0.9
        if (Math.abs(velocityRef.current) <= 0.02) velocityRef.current = 0
      }
      smoothNowRef.current = baseRef.current.min + (ts - baseRef.current.ts) / 1000 * SIM_SPEED_MIN_PER_SEC
      applyTransform(smoothNowRef.current)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [applyTransform])

  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      // Никаких своих rAF-циклов на каждое событие — просто подкидываем
      // скорость общему циклу и помечаем кадр.
      velocityRef.current = Math.max(-40, Math.min(40, velocityRef.current + delta * 0.9))
      dirtyRef.current = true
    }
    vp.addEventListener('wheel', handler, { passive: false })
    return () => vp.removeEventListener('wheel', handler)
  }, [])

  useEffect(() => {
    if (!isDragging) return
    const onMove = (e: MouseEvent) => {
      offsetRef.current = dragStartOffset.current - (e.clientX - dragStartX.current)
      /* Не пишем transform здесь — только помечаем кадр «грязным»,
         применит единый rAF-цикл (одна запись на кадр вместо 60–120). */
      dirtyRef.current = true
    }
    const onUp = () => {
      isDraggingRef.current = false
      setIsDragging(false)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [isDragging, applyTransform])

  useEffect(() => {
    setShowJump(Math.abs(offsetRef.current) > 4)
  }, [rhythm.nowMinutes])

  useEffect(() => {
    return () => cancelAnimationFrame(hoverFrameRef.current)
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
    applyTransform(smoothNowRef.current)
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
        className="timeline-viewport relative flex-1 min-h-[220px] mt-3 overflow-hidden cursor-grab select-none"
        style={{ contain: 'layout paint' }}
        onDragStart={(e) => e.preventDefault()}
        onMouseDown={(e) => {
          e.preventDefault()
          isDraggingRef.current = true
          setIsDragging(true)
          dragStartX.current = e.clientX
          dragStartOffset.current = offsetRef.current
          velocityRef.current = 0
          if (viewportRef.current) viewportRef.current.style.cursor = 'grabbing'
        }}
        onMouseUp={() => {
          if (viewportRef.current) viewportRef.current.style.cursor = 'grab'
        }}
        onMouseMove={(e) => {
          /* Троттлинг до одного раза на кадр + полный пропуск во время
             драга и инерции колеса — иначе React рендерит Timeline 60+ раз/сек. */
          if (isDraggingRef.current || Math.abs(velocityRef.current) > 0.3) {
            hoverEvtRef.current = null
            if (lastHvKeyRef.current) {
              lastHvKeyRef.current = ''
              setHv(null)
            }
            return
          }
          hoverEvtRef.current = e.clientX
          if (hoverFrameRef.current) return
          hoverFrameRef.current = requestAnimationFrame(() => {
            hoverFrameRef.current = 0
            const clientX = hoverEvtRef.current
            if (clientX == null || isDraggingRef.current || Math.abs(velocityRef.current) > 0.3) return
            const vp = viewportRef.current
            if (!vp) return
            const relX = clientX - vp.getBoundingClientRect().left
            const min = DAY_START + (relX + offsetRef.current) / PITCH * STEP_MIN
            const s = segments.find((sg) => min >= sg.start && min < sg.end) ?? segments[segments.length - 1]
            if (!s) return
            const key = `${s.type}|${s.label}|${Math.round(min)}`
            if (key === lastHvKeyRef.current) return
            lastHvKeyRef.current = key
            setHv({ x: relX, min, type: s.type, color: s.color, label: s.label })
          })
        }}
        onMouseLeave={() => {
          hoverEvtRef.current = null
          lastHvKeyRef.current = ''
          setHv(null)
        }}
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
              style={{ background: `radial-gradient(ellipse at center, rgba(${a.glow},0.14), transparent 60%)` }}
            />
          )
        })()}

        <div ref={barsRef} className="absolute left-0 top-[30px] bottom-[62px] flex items-end will-change-transform pointer-events-none" style={{ width: rowWidth }}>
          <BarsLayer bars={bars} pitch={PITCH} />
          {/* Одно «дышащее» свечение на весь слой вместо анимации каждой полосы */}
          <div
            className="absolute inset-0 z-[1] pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04) 50%, transparent)', animation: 'bars-shimmer 4.5s ease-in-out infinite' }}
          />
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 top-[30px] bottom-[62px] w-[200px] pointer-events-none z-[4]"
          style={{ background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.06), transparent 70%)' }}
        />

        <div ref={markersRef} className="absolute left-0 top-[4px] h-[20px] will-change-transform pointer-events-none z-[3]" style={{ width: rowWidth }}>
          <MarkersLayer segments={segments} />
        </div>

        <div ref={rulerRef} className="absolute left-0 bottom-[6px] h-[52px] will-change-transform pointer-events-none" style={{ width: rowWidth }}>
          <RulerLayer />
        </div>

        <div className="absolute top-[22px] bottom-[56px] left-1/2 w-[2px] z-5 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, transparent, #fff 15%, #fff 85%, transparent)',
          }}
        >
          <div
            ref={playheadTimeRef}
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[6] font-mono text-[12px] text-white bg-[var(--surface-3)] border border-[var(--stroke)] px-2 py-0.5 rounded-md whitespace-nowrap tabular-nums"
          >
            {fmtHMS(rhythm.nowMinutes)}
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <span className="absolute inset-0 rounded-full bg-white/50 animate-ping" />
            <span className="relative block h-[6px] w-[6px] rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.9)]" />
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

/* Слои вынесены в memo: их props стабильны между секундными тиками,
   поэтому vdom не пересобирается на каждом рендере Timeline. */
const MarkersLayer = memo(function MarkersLayer({ segments }: { segments: ReturnType<typeof useRhythm>['segments'] }) {
  return (
    <>
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
    </>
  )
})

const RulerLayer = memo(function RulerLayer() {
  return (
    <>
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
    </>
  )
})
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


