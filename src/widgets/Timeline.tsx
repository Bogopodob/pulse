import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react'
import { fmtHM, fmtHMS, buildBars, DAY_START, DAY_END, STEP_MIN, PITCH, type Segment } from '../entities/rhythm/useRhythm'
import { ACCENTS, ICON_PATHS } from '../entities/rhythm/activities'

const BREAK_GROUP = new Set(['break', 'smoke', 'rest'])
const FOOD_GROUP = new Set(['lunch', 'breakfast', 'dinner'])
/** Полная ширина ленты суток в пикселях (график конечен — ровно 24 часа). */
const ROW_WIDTH = Math.ceil((DAY_END - DAY_START) / STEP_MIN) * PITCH

/** Контентная координата минуты на ленте. */
const pxOf = (min: number) => ((min - DAY_START) / STEP_MIN) * PITCH

interface Bar {
  type: string
  height: number
  color: string
}

/* ── Зоны суток: фоновый контекст времени за графиком ─────────────────── */

const ZONE_SUNRISE = 'M12 3v5M8.5 6.5L12 3l3.5 3.5M4 19h16M7.5 19a4.5 4.5 0 0 1 9 0'
const ZONE_SUNSET = 'M12 8V3M8.5 4.5L12 8l3.5-3.5M4 19h16M7.5 19a4.5 4.5 0 0 1 9 0'

const DAY_ZONES = [
  { from: 0, to: 360, label: 'Ночь', icon: ICON_PATHS.moon, color: '#a79bff', tint: 'rgba(124,107,255,0.07)' },
  { from: 360, to: 720, label: 'Утро', icon: ZONE_SUNRISE, color: '#ffc15e', tint: 'rgba(255,157,92,0.06)' },
  { from: 720, to: 1080, label: 'День', icon: ICON_PATHS.sun, color: '#bcd4ff', tint: 'rgba(76,141,255,0.06)' },
  { from: 1080, to: 1440, label: 'Вечер', icon: ZONE_SUNSET, color: '#f9a8d4', tint: 'rgba(244,114,182,0.05)' },
]

export interface TimelineProps {
  segments: Segment[]
  /** Дробные минуты реального времени (с секундами) — двигает плейхед. */
  nowMinutes: number
  cur: Segment
}

/** Бинарный поиск сегмента по минуте — O(log n) вместо O(n) линейного find */
function findSegment(min: number, segments: Segment[]): Segment | undefined {
  let lo = 0
  let hi = segments.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const s = segments[mid]
    if (min < s.start) hi = mid - 1
    else if (min >= s.end) lo = mid + 1
    else return s
  }
  return segments[segments.length - 1]
}

export function Timeline({ segments, nowMinutes, cur }: TimelineProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [showJump, setShowJump] = useState(false)
  const [hv, setHv] = useState<{ x: number; min: number; type: string; color: string; label: string } | null>(null)

  const dragRef = useRef<{ x: number; sl: number } | null>(null)
  const hoverFrameRef = useRef(0)
  const hoverEvtRef = useRef<number | null>(null)
  const scrollRafRef = useRef(0)
  const wheelRafRef = useRef(0)
  const wheelDeltaRef = useRef(0)
  const draggingRef = useRef(false)

  const bars = useMemo(() => buildBars(segments), [segments])

  const totals = useMemo(() => {
    const t = { focus: 0, break: 0, food: 0 }
    for (const s of segments) {
      if (s.type === 'focus') t.focus += s.end - s.start
      else if (BREAK_GROUP.has(s.type)) t.break += s.end - s.start
      else if (FOOD_GROUP.has(s.type)) t.food += s.end - s.start
    }
    return t
  }, [segments])

  /* Синхронизируем ref с state dragging, чтобы scroll-listener не ловил stale closure */
  useEffect(() => {
    draggingRef.current = dragging
  }, [dragging])

  /* Центрирование на текущем времени один раз при монтировании.
     Дальше — нативный скролл с естественными границами [0 … ширина суток]. */
  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return
    vp.scrollLeft = Math.max(0, pxOf(nowMinutes) - vp.clientWidth / 2)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* Колесо мыши → горизонтальная прокрутка (нативный scrollLeft).
     Батчим дельту в rAF, чтобы не дёргать layout на каждое wheel-событие. */
  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return
    const handler = (e: WheelEvent) => {
      if (vp.scrollWidth <= vp.clientWidth) return
      e.preventDefault()
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      wheelDeltaRef.current += delta * 1.2
      if (wheelRafRef.current) return
      wheelRafRef.current = requestAnimationFrame(() => {
        wheelRafRef.current = 0
        const d = wheelDeltaRef.current
        wheelDeltaRef.current = 0
        vp.scrollLeft += d
      })
    }
    vp.addEventListener('wheel', handler, { passive: false })
    return () => {
      vp.removeEventListener('wheel', handler)
      if (wheelRafRef.current) cancelAnimationFrame(wheelRafRef.current)
    }
  }, [])

  /* Scroll → показать кнопку "К текущему моменту".
     Троттлим rAF + дедупликация setState, чтобы не триггерить React на каждый пиксель. */
  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return
    const onScroll = () => {
      if (scrollRafRef.current) return
      scrollRafRef.current = requestAnimationFrame(() => {
        scrollRafRef.current = 0
        const shouldShow = vp.scrollLeft > 4 && !draggingRef.current
        setShowJump((prev) => (prev !== shouldShow ? shouldShow : prev))
      })
    }
    vp.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      vp.removeEventListener('scroll', onScroll)
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current)
    }
  }, [])

  /* Drag скролл мышью — pointer events на самом viewport */
  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return
    const onPointerMove = (e: PointerEvent) => {
      if (!dragRef.current || !draggingRef.current) return
      vp.scrollLeft = dragRef.current.sl - (e.clientX - dragRef.current.x)
    }
    vp.addEventListener('pointermove', onPointerMove)
    return () => vp.removeEventListener('pointermove', onPointerMove)
  }, [])

  const jumpTo = useCallback(
    (min: number) => {
      const vp = viewportRef.current
      if (!vp) return
      vp.scrollTo({ left: Math.max(0, pxOf(min) - vp.clientWidth / 2), behavior: 'smooth' })
    },
    [],
  )

  useEffect(() => {
    const handler = (e: Event) => {
      const min = (e as CustomEvent<{ min: number }>).detail?.min
      if (typeof min === 'number') jumpTo(min)
    }
    window.addEventListener('rhythm:go-to', handler)
    return () => window.removeEventListener('rhythm:go-to', handler)
  }, [jumpTo])

  const handleJumpNow = () => jumpTo(nowMinutes)

  /* Hover-подсказка: rAF-троттлинг + бинарный поиск + дедупликация по минуте и типу. */
  const lastHvMinRef = useRef(Number.NaN)
  const lastHvTypeRef = useRef<string>('')
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingRef.current) return
    hoverEvtRef.current = e.clientX
    if (hoverFrameRef.current) return
    hoverFrameRef.current = requestAnimationFrame(() => {
      hoverFrameRef.current = 0
      const clientX = hoverEvtRef.current
      const vp = viewportRef.current
      if (clientX == null || !vp || draggingRef.current) return
      const rect = vp.getBoundingClientRect()
      const relX = clientX - rect.left
      const min = DAY_START + (vp.scrollLeft + relX) / PITCH * STEP_MIN
      const s = findSegment(min, segments)
      if (!s || Number.isNaN(min)) {
        if (hv !== null) setHv(null)
        return
      }
      const floored = Math.floor(min)
      if (floored === lastHvMinRef.current && s.type === lastHvTypeRef.current) return
      lastHvMinRef.current = floored
      lastHvTypeRef.current = s.type
      setHv({ x: relX, min, type: s.type, color: s.color, label: s.label })
    })
  }

  useEffect(() => {
    return () => {
      if (hoverFrameRef.current) cancelAnimationFrame(hoverFrameRef.current)
    }
  }, [])

  const nowPx = pxOf(nowMinutes)

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
        className="timeline-viewport relative flex-1 min-h-[220px] mt-3 overflow-x-auto overflow-y-hidden cursor-grab select-none"
        style={{
          contain: 'layout paint',
          scrollbarWidth: 'none',
          willChange: 'scroll-position',
          overscrollBehaviorX: 'contain',
        }}
        onDragStart={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          const vp = viewportRef.current
          if (!vp) return
          e.preventDefault()
          vp.setPointerCapture(e.pointerId)
          dragRef.current = { x: e.clientX, sl: vp.scrollLeft }
          draggingRef.current = true
          setDragging(true)
          vp.style.cursor = 'grabbing'
        }}
        onPointerUp={() => {
          dragRef.current = null
          draggingRef.current = false
          setDragging(false)
          if (viewportRef.current) viewportRef.current.style.cursor = 'grab'
        }}
        onPointerCancel={() => {
          dragRef.current = null
          draggingRef.current = false
          setDragging(false)
          if (viewportRef.current) viewportRef.current.style.cursor = 'grab'
        }}
        onMouseMove={onMouseMove}
        onMouseLeave={() => {
          hoverEvtRef.current = null
          lastHvMinRef.current = Number.NaN
          lastHvTypeRef.current = ''
          setHv(null)
        }}
      >
        {/* Лента суток — промоутим в GPU-слой: скролл идёт композитором без paint */}
        <div
          className="relative h-full"
          style={{
            width: ROW_WIDTH,
            transform: 'translateZ(0)',
            willChange: 'transform',
            contain: 'paint',
          }}
        >
          {/* Зоны суток — фоновый контекст */}
          <ZonesLayer />

          {/* Полосы: виртуализированы — в DOM только видимые + overscan, остальные — пустые спейсеры.
              Это главный выигрыш по плавности: 720 → ~150 нод, paint дешевле в разы. */}
          <div
            className="absolute left-0 bottom-[62px] h-[96px] flex items-end"
            style={{ width: ROW_WIDTH, contain: 'paint', transform: 'translateZ(0)' }}
          >
            <BarsLayer bars={bars} pitch={PITCH} viewportRef={viewportRef} />
          </div>

          {/* Пульс-волна и разрывные линии убраны по запросу: SVG-путь из 360 точек,
              градиент и пульсирующие узлы полностью удалены — теперь нет рваных контуров
              поверх баров и нет лишнего paint при скролле. */}

          {/* Будущее — в тумане: скрим от плейхеда до конца суток */}
          <FutureFog nowPx={nowPx} />

          <div className="absolute left-0 top-[4px] h-[20px] z-[3] pointer-events-none" style={{ width: ROW_WIDTH }}>
            <MarkersLayer segments={segments} />
          </div>

          <div className="absolute left-0 bottom-[6px] h-[52px] pointer-events-none" style={{ width: ROW_WIDTH }}>
            <RulerLayer />
          </div>

          {(() => {
            const t = cur
            if (t.type === 'off') return null
            const a = ACCENTS[t.color as keyof typeof ACCENTS] ?? ACCENTS.blue
            return (
              <div
                className="absolute left-1/2 -translate-x-1/2 top-[30px] bottom-[62px] w-[320px] pointer-events-none rounded-full"
                style={{
                  background: `radial-gradient(ellipse at center, rgba(${a.glow},0.14), transparent 60%)`,
                  animation: 'tl-breathe 3.2s ease-in-out infinite',
                  willChange: 'opacity',
                }}
              />
            )
          })()}

          {/* Плейхед — CSS-анимация, без framer-motion на каждый кадр */}
          <Playhead nowPx={nowPx} nowMinutes={nowMinutes} />

          {hv && (() => {
            const a = ACCENTS[hv.color as keyof typeof ACCENTS] ?? ACCENTS.blue
            return (
              <div className="absolute z-[8] pointer-events-none" style={{ left: hv.x, top: 26, transform: 'translateX(-50%) translateZ(0)' }}>
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
                  onClick={() => jumpTo(s.start + 1)}
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

function fmtDur(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return m === 0 ? `${h} ч` : `${h} ч ${m} мин`
}

/* ── Изолированные memo-слои ── */

const FutureFog = memo(function FutureFog({ nowPx }: { nowPx: number }) {
  const left = Math.min(ROW_WIDTH, Math.max(0, nowPx))
  return (
    <div
      className="absolute top-0 bottom-[58px] pointer-events-none"
      style={{
        left,
        width: Math.max(0, ROW_WIDTH - left),
        background: 'rgba(21, 23, 28, 0.82)',
        willChange: 'left, width',
        transform: 'translateZ(0)',
      }}
    />
  )
})

const Playhead = memo(function Playhead({ nowPx, nowMinutes }: { nowPx: number; nowMinutes: number }) {
  return (
    <div
      className="absolute top-[22px] bottom-[56px] z-[5] pointer-events-none"
      style={{ left: nowPx, transform: 'translateZ(0)', willChange: 'left' }}
    >
      <div className="relative h-full" style={{ animation: 'tl-fade-in 0.6s ease-out 0.3s both' }}>
        <span
          className="absolute rounded-full"
          style={{
            width: 6,
            height: 6,
            top: 2,
            left: '50%',
            marginLeft: -3,
            background: '#ff3b30',
            animation: 'tl-playhead-pulse 2s ease-in-out infinite, tl-playhead-in 0.4s cubic-bezier(0.34,1.4,0.64,1) both',
            willChange: 'transform, box-shadow',
          }}
        />
        <div
          className="absolute top-[11px] bottom-0 left-1/2 rounded-full"
          style={{
            width: 1.5,
            background: 'linear-gradient(180deg, #ff3b30 0%, #ff3b30 15%, rgba(255,59,48,0.15) 50%, transparent 100%)',
          }}
        />
      </div>
      <div
        className="absolute bottom-0 left-0 -translate-x-1/2 translate-y-[10px] z-[6] font-mono text-[12px] text-white bg-[var(--surface-3)] border border-[var(--stroke)] px-2 py-0.5 rounded-md whitespace-nowrap tabular-nums"
        style={{ transform: 'translateX(-50%) translateY(10px) translateZ(0)' }}
      >
        {fmtHMS(nowMinutes)}
      </div>
    </div>
  )
})

const MarkersLayer = memo(function MarkersLayer({ segments }: { segments: Segment[] }) {
  return (
    <>
      {segments.filter(s => s.type !== 'focus' && s.type !== 'off').map((s) => {
        const x = pxOf(s.start)
        const a = ACCENTS[s.color as keyof typeof ACCENTS] ?? ACCENTS.blue
        return (
          <div
            key={s.start}
            className="absolute text-[10px] font-semibold whitespace-nowrap px-2 py-0.5 rounded-full"
            style={{
              left: x,
              transform: 'translateX(-50%) translateZ(0)',
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
  const totalTicks = Math.ceil((DAY_END - DAY_START) / 60)
  return (
    <>
      {Array.from({ length: totalTicks + 1 }, (_, i) => {
        const m = DAY_START + i * 60
        const isFirst = i === 0
        const isLast = i === totalTicks
        return (
          <div
            key={m}
            className="absolute bottom-0 font-mono text-[10.5px] text-[var(--text-faint)]"
            style={{
              left: pxOf(m),
              transform: isFirst ? 'translateX(3px) translateZ(0)' : isLast ? 'translateX(calc(-100% - 3px)) translateZ(0)' : 'translateX(-50%) translateZ(0)',
              textAlign: isFirst ? 'left' : isLast ? 'right' : 'center',
            }}
          >
            <div
              className="absolute bottom-[16px] w-px h-[6px] bg-[var(--stroke)]"
              style={{ left: isFirst ? 0 : isLast ? undefined : '50%', right: isLast ? 0 : undefined }}
            />
            {(isFirst || isLast) && (
              <div
                className="absolute bottom-[27px] left-0 right-0 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[var(--text-dim)] whitespace-nowrap"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {isFirst ? 'Начало нового дня' : 'Конец дня'}
              </div>
            )}
            {isFirst ? '00:00' : isLast ? '24' : fmtHM(m)}
          </div>
        )
      })}
    </>
  )
})

const BarsLayer = memo(function BarsLayer({
  bars,
  pitch,
  viewportRef,
}: {
  bars: Bar[]
  pitch: number
  viewportRef: React.RefObject<HTMLDivElement | null>
}) {
  const OVERSCAN = 28
  const [range, setRange] = useState(() => {
    const vp = viewportRef.current
    if (!vp) return { start: 0, end: Math.min(bars.length, 180) }
    const start = Math.max(0, Math.floor(vp.scrollLeft / pitch) - OVERSCAN)
    const end = Math.min(bars.length, Math.ceil((vp.scrollLeft + vp.clientWidth) / pitch) + OVERSCAN)
    return { start, end }
  })
  const rafRef = useRef(0)

  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return
    const update = () => {
      const start = Math.max(0, Math.floor(vp.scrollLeft / pitch) - OVERSCAN)
      const end = Math.min(bars.length, Math.ceil((vp.scrollLeft + vp.clientWidth) / pitch) + OVERSCAN)
      setRange((prev) => (prev.start === start && prev.end === end ? prev : { start, end }))
    }
    update()
    const onScroll = () => {
      if (rafRef.current) return
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0
        update()
      })
    }
    vp.addEventListener('scroll', onScroll, { passive: true })
    const onResize = () => update()
    window.addEventListener('resize', onResize)
    return () => {
      vp.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [bars.length, pitch, viewportRef])

  // при смене сегментов (длина баров меняется) — пересчитать окно
  useEffect(() => {
    setRange((prev) => {
      if (prev.end > bars.length) return { start: Math.max(0, bars.length - 180), end: bars.length }
      return prev
    })
  }, [bars.length])

  const slice = useMemo(() => bars.slice(range.start, range.end), [bars, range])
  const leftPad = range.start * pitch
  const rightPad = (bars.length - range.end) * pitch

  return (
    <>
      {leftPad > 0 && <div aria-hidden style={{ width: leftPad, flexShrink: 0 }} />}
      {slice.map((bar, i) => {
        const idx = range.start + i
        const isOff = bar.type === 'off'
        const acc = isOff ? null : (ACCENTS[bar.color as keyof typeof ACCENTS] ?? ACCENTS.blue)
        return (
          <div
            key={idx}
            aria-hidden
            style={{
              width: pitch - 1,
              marginRight: 1,
              height: bar.height,
              borderRadius: '3px 3px 2px 2px',
              background: isOff
                ? 'linear-gradient(180deg, rgba(88, 93, 104, 0.85), rgba(88, 93, 104, 0.45))'
                : `linear-gradient(180deg, ${acc!.color}, ${acc!.dot})`,
              boxShadow: isOff ? 'none' : 'inset 0 1px 0 rgba(255, 255, 255, 0.18)',
              opacity: isOff ? 0.5 : 1,
              transform: 'translateZ(0)',
              contain: 'paint',
              willChange: 'transform',
              transformOrigin: '50% 100%',
              animation: 'tl-grow 0.45s cubic-bezier(0.34, 1.4, 0.64, 1) both',
              animationDelay: `${Math.min(idx, 80) * 0.6}ms`,
            }}
          />
        )
      })}
      {rightPad > 0 && <div aria-hidden style={{ width: rightPad, flexShrink: 0 }} />}
    </>
  )
})

const ZonesLayer = memo(function ZonesLayer() {
  return (
    <>
      {DAY_ZONES.map((z) => (
        <div
          key={z.label}
          className="absolute top-0 bottom-[58px] pointer-events-none"
          style={{
            left: pxOf(z.from),
            width: pxOf(z.to) - pxOf(z.from),
            background: `linear-gradient(180deg, ${z.tint}, transparent 46%)`,
            contain: 'paint',
          }}
        >
          <div className="absolute top-[7px] left-[12px] flex items-center gap-1" style={{ color: z.color, opacity: 0.45 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d={z.icon} />
            </svg>
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ fontFamily: 'var(--font-display)' }}>
              {z.label}
            </span>
          </div>
        </div>
      ))}
    </>
  )
})
