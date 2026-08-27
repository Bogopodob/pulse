import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react'
import { fmtHM, fmtHMS, DAY_START, DAY_END, STEP_MIN, PITCH, type Segment } from '../entities/rhythm/useRhythm'
import { ACCENTS, ICON_PATHS } from '../entities/rhythm/activities'

const BREAK_GROUP = new Set(['break', 'smoke', 'rest'])
const FOOD_GROUP = new Set(['lunch', 'breakfast', 'dinner'])

/* ── Визуальное растягивание коротких блоков ───────────────────────────
   Проблема: при 1 мин между соседними сегментами их лейблы сверху
   наслаиваются (шаг 2.5px/мин). Решение: минимальная визуальная ширина
   сегмента, у которого есть лейбл (не focus/off). По часам (ruler) —
   визуальная шкала растягивается вместе с барами, поэтому всё остаётся
   синхронно, но короткие блоки становятся читаемыми.
   Если лейбл >12 символов — обрезаем до 10 + … 
*/
const MIN_SEG_PX = 150 // минимум для лейбл-сегмента = 60 мин визуально (~150px), чтобы 1 мин выглядел как час и лейблы не наслаивались
function truncateLabel(label: string): string {
  if (label.length > 12) return label.slice(0, 10) + '...'
  return label
}

interface VisualSegment extends Segment {
  visualX: number
  visualWidth: number
  visualCount: number
}

interface Bar {
  type: string
  height: number
  color: string
}

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
  nowMinutes: number
  cur: Segment
}

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

/** Хук: строит нелинейную визуальную карту — короткие лейбл-сегменты растягиваются */
function useVisualLayout(segments: Segment[]) {
  const visualMap = useMemo<VisualSegment[]>(() => {
    let x = 0
    const map: VisualSegment[] = []
    for (const s of segments) {
      const dur = s.end - s.start
      const actualPx = (dur / STEP_MIN) * PITCH // 2.5 * dur
      let visualPx = actualPx
      const hasLabel = s.type !== 'focus' && s.type !== 'off'
      if (hasLabel) {
        const t = truncateLabel(s.label)
        // оценка ширины pill: ~6.2px/char + паддинги + время " · 09:00" (~56px)
        const est = t.length * 6.2 + 64
        const minPx = Math.max(MIN_SEG_PX, Math.ceil(est / PITCH) * PITCH)
        visualPx = Math.max(actualPx, minPx)
      } else if (dur < 4) {
        // крошечные off-сегменты не должны схлопываться в 0
        visualPx = Math.max(actualPx, PITCH * 2)
      }
      const count = Math.max(1, Math.round(visualPx / PITCH))
      visualPx = count * PITCH
      map.push({ ...s, visualX: x, visualWidth: visualPx, visualCount: count })
      x += visualPx
    }
    return map
  }, [segments])

  const totalWidth = useMemo(() => visualMap.reduce((a, v) => a + v.visualWidth, 0), [visualMap])

  const visualXOf = useCallback(
    (min: number): number => {
      if (visualMap.length === 0) return 0
      // быстрый путь: за пределами
      if (min <= visualMap[0].start) return visualMap[0].visualX
      const last = visualMap[visualMap.length - 1]
      if (min >= last.end) return last.visualX + last.visualWidth
      let lo = 0
      let hi = visualMap.length - 1
      while (lo <= hi) {
        const mid = (lo + hi) >> 1
        const seg = visualMap[mid]
        if (min < seg.start) hi = mid - 1
        else if (min >= seg.end) lo = mid + 1
        else {
          const dur = seg.end - seg.start
          const local = dur === 0 ? 0 : (min - seg.start) / dur
          return seg.visualX + local * seg.visualWidth
        }
      }
      return 0
    },
    [visualMap],
  )

  const minuteAtVisualX = useCallback(
    (vx: number): number => {
      if (visualMap.length === 0) return DAY_START
      if (vx <= visualMap[0].visualX) return visualMap[0].start
      const last = visualMap[visualMap.length - 1]
      if (vx >= last.visualX + last.visualWidth) return last.end
      let lo = 0
      let hi = visualMap.length - 1
      while (lo <= hi) {
        const mid = (lo + hi) >> 1
        const seg = visualMap[mid]
        if (vx < seg.visualX) hi = mid - 1
        else if (vx >= seg.visualX + seg.visualWidth) lo = mid + 1
        else {
          const local = (vx - seg.visualX) / seg.visualWidth
          return seg.start + local * (seg.end - seg.start)
        }
      }
      return DAY_START
    },
    [visualMap],
  )

  const visualBars = useMemo<Bar[]>(() => {
    const bars: Bar[] = []
    let gIdx = 0
    for (const seg of visualMap) {
      for (let i = 0; i < seg.visualCount; i++) {
        const local = seg.visualCount > 1 ? i / (seg.visualCount - 1) : 0
        const noise = Math.sin(gIdx * 12.9898) * 43758.5453
        const frac = noise - Math.floor(noise)
        let intensity: number
        if (seg.type === 'focus') intensity = 0.32 + 0.55 * local + 0.1 * Math.sin(gIdx * 0.85) * local
        else if (seg.type === 'off') intensity = 0.1 + 0.06 * frac
        else if (seg.type === 'break' || seg.type === 'smoke') intensity = 0.42 + 0.22 * Math.sin(gIdx * 0.6)
        else if (seg.type === 'lunch' || seg.type === 'breakfast' || seg.type === 'dinner') intensity = 0.28 + 0.08 * Math.sin(gIdx * 0.4)
        else intensity = 0.38 + 0.12 * Math.sin(gIdx * 0.5)
        intensity = Math.max(0.08, Math.min(1, intensity))
        const h = Math.round(8 + intensity * 70)
        bars.push({ type: seg.type, height: h, color: seg.color })
        gIdx++
      }
    }
    return bars
  }, [visualMap])

  return { visualMap, totalWidth, visualXOf, minuteAtVisualX, visualBars }
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

  const { visualMap, totalWidth, visualXOf, minuteAtVisualX, visualBars } = useVisualLayout(segments)

  const totals = useMemo(() => {
    const t = { focus: 0, break: 0, food: 0 }
    for (const s of segments) {
      if (s.type === 'focus') t.focus += s.end - s.start
      else if (BREAK_GROUP.has(s.type)) t.break += s.end - s.start
      else if (FOOD_GROUP.has(s.type)) t.food += s.end - s.start
    }
    return t
  }, [segments])

  useEffect(() => {
    draggingRef.current = dragging
  }, [dragging])

  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return
    vp.scrollLeft = Math.max(0, visualXOf(nowMinutes) - vp.clientWidth / 2)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visualXOf])

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
      vp.scrollTo({ left: Math.max(0, visualXOf(min) - vp.clientWidth / 2), behavior: 'smooth' })
    },
    [visualXOf],
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
      const vx = vp.scrollLeft + relX
      const min = minuteAtVisualX(vx)
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

  const nowPx = visualXOf(nowMinutes)

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
        <div
          className="relative h-full"
          style={{
            width: totalWidth,
            transform: 'translateZ(0)',
            willChange: 'transform',
            contain: 'paint',
          }}
        >
          <ZonesLayer visualMap={visualMap} totalWidth={totalWidth} visualXOf={visualXOf} />

          <div
            className="absolute left-0 bottom-[62px] h-[96px] flex items-end"
            style={{ width: totalWidth, contain: 'strict', transform: 'translateZ(0)' }}
          >
            <BarsLayer bars={visualBars} pitch={PITCH} />
          </div>

          <FutureFog nowPx={nowPx} totalWidth={totalWidth} />

          <div className="absolute left-0 top-[2px] h-[36px] z-[3] pointer-events-none" style={{ width: totalWidth }}>
            <MarkersLayer visualMap={visualMap} totalWidth={totalWidth} />
          </div>

          <div className="absolute left-0 bottom-[6px] h-[52px] pointer-events-none" style={{ width: totalWidth }}>
            <RulerLayer visualXOf={visualXOf} />
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

          <Playhead nowPx={nowPx} nowMinutes={nowMinutes} />

          {hv && (() => {
            const a = ACCENTS[hv.color as keyof typeof ACCENTS] ?? ACCENTS.blue
            const trunc = truncateLabel(hv.label)
            return (
              <div className="absolute z-[8] pointer-events-none" style={{ left: hv.x, top: 26, transform: 'translateX(-50%) translateZ(0)' }}>
                <div
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md whitespace-nowrap"
                  style={{ background: 'var(--surface-3)', border: '1px solid var(--stroke)', boxShadow: '0 6px 18px rgba(0,0,0,0.4)' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={a.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={ICON_PATHS[hv.type] ?? ICON_PATHS.clock} />
                  </svg>
                  <span className="text-[10.5px] font-semibold" style={{ color: a.color }}>{trunc}</span>
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

const FutureFog = memo(function FutureFog({ nowPx, totalWidth }: { nowPx: number; totalWidth: number }) {
  const left = Math.min(totalWidth, Math.max(0, nowPx))
  const w = Math.max(0, totalWidth - left)
  return (
    <div
      className="absolute top-0 bottom-[58px] pointer-events-none"
      style={{
        left: 0,
        width: totalWidth,
        transform: `translate3d(${left}px,0,0)`,
        willChange: 'transform',
      }}
    >
      <div className="absolute inset-0" style={{ width: w, background: 'rgba(21, 23, 28, 0.82)' }} />
    </div>
  )
})

const Playhead = memo(function Playhead({ nowPx, nowMinutes }: { nowPx: number; nowMinutes: number }) {
  // Выровнен по центру: точка и линия на одной оси X, линия стартует от нижнего края точки
  return (
    <div
      className="absolute top-0 bottom-[58px] z-[5] pointer-events-none"
      style={{ transform: `translate3d(${nowPx}px,0,0)`, willChange: 'transform' }}
    >
      {/* вертикальный ореол — без blur-фильтра, только radial-gradient, дешевле */}
      <div
        className="absolute left-1/2 -translate-x-1/2 top-[34px] bottom-0 w-[28px] pointer-events-none opacity-70"
        style={{
          background: 'linear-gradient(180deg, rgba(255,59,48,0.14), transparent 68%)',
        }}
      />
      {/* бейдж */}
      <div
        className="absolute top-[2px] left-1/2 z-[3]"
        style={{ transform: 'translateX(-50%) translateZ(0)', animation: 'tl-fade-in 0.5s ease-out 0.2s both' }}
      >
        <div className="relative flex items-center gap-2 pl-[7px] pr-[10px] py-[5px] rounded-full bg-[rgba(28,31,38,0.94)] border border-white/[0.09] shadow-[0_8px_24px_rgba(0,0,0,0.5),0_1px_0_rgba(255,255,255,0.07)_inset] backdrop-blur-[14px]">
          <span className="relative flex size-[7px] shrink-0 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-[#ff3b30]" style={{ animation: 'tl-ping 1.5s cubic-bezier(0,0,0.2,1) infinite', opacity: 0.45 }} />
            <span className="relative block size-[7px] rounded-full bg-[#ff3b30] border border-white/25 shadow-[0_0_8px_rgba(255,59,48,0.75)]" />
          </span>
          <span className="font-mono text-[11px] font-semibold tracking-[-0.02em] text-white tabular-nums leading-none">
            {fmtHMS(nowMinutes)}
          </span>
          <span className="text-[9px] font-semibold tracking-[0.09em] text-white/45 uppercase leading-none">сейчас</span>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-[4px] size-[8px] rotate-45 bg-[rgba(28,31,38,0.94)] border-r border-b border-white/[0.09] backdrop-blur-[14px]" />
      </div>
      {/* точка — центр строго на оси */}
      <div className="absolute left-1/2 top-[32px] size-[12px] z-[2]" style={{ transform: 'translateX(-50%) translateZ(0)' }}>
        <span className="absolute inset-[3px] rounded-full bg-[#ff3b30] border-[1.5px] border-white/90 shadow-[0_0_10px_rgba(255,59,48,0.85)]" />
        <span className="absolute inset-[-7px] rounded-full border border-[#ff3b30]/30" style={{ animation: 'tl-ping 2s ease-out infinite' }} />
        <span className="absolute left-[3px] top-[3px] size-[2px] rounded-full bg-white/80" />
      </div>
      {/* линия — стартует ровно от нижнего края точки (32+12=44), идёт до 4px над низом, ровно под центром точки */}
      <div
        className="absolute left-1/2 top-[44px] bottom-[8px] w-[1.5px] -translate-x-1/2 rounded-full overflow-hidden"
        style={{ transform: 'translateX(-50%) translateZ(0)' }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(180deg, #ff3b30 0%, #ff5a52 18%, rgba(255,59,48,0.5) 38%, rgba(255,59,48,0.12) 70%, transparent 100%)',
            boxShadow: '0 0 8px rgba(255,59,48,0.55)',
          }}
        />
      </div>
      {/* нижний ромб — центр на той же оси */}
      <div className="absolute left-1/2 bottom-[2px] size-[6px] bg-[#ff3b30] border border-white/20 shadow-[0_0_8px_rgba(255,59,48,0.7)]" style={{ transform: 'translateX(-50%) rotate(45deg) translateZ(0)' }} />
    </div>
  )
})

const MarkersLayer = memo(function MarkersLayer({ visualMap, totalWidth }: { visualMap: VisualSegment[]; totalWidth: number }) {
  // Коллизия плашек: двухрядная раскладка, чтобы Перерыв 11:55 и День не наслаивались
  const items = useMemo(() => {
    const raw = visualMap
      .filter((s) => s.type !== 'focus' && s.type !== 'off')
      .map((s) => {
        const trunc = truncateLabel(s.label)
        // оценка ширины pill: ~6px/char + " · hh:mm" (~42px) + паддинги 16
        const wEst = trunc.length * 6 + 58
        return { s, trunc, x: s.visualX, wEst }
      })
      .sort((a, b) => a.x - b.x)

    const GAP = 10
    let last0 = -Infinity
    let last1 = -Infinity
    const placed: Array<(typeof raw)[number] & { row: number }> = []
    for (const it of raw) {
      const left = it.x - it.wEst / 2
      const right = it.x + it.wEst / 2
      // защита от выхода за границы ленты
      if (it.x < 8 || it.x > totalWidth - 8) {
        // у краёв всё равно центрируем, но не даём выйти за 0/totalWidth
      }
      if (left > last0 + GAP) {
        placed.push({ ...it, row: 0 })
        last0 = right
      } else if (left > last1 + GAP) {
        placed.push({ ...it, row: 1 })
        last1 = right
      } else {
        // обе строки заняты — прячем наименее важную (короткую паузу), но 11:55 и День — обе важны,
        // поэтому сдвигаем текущую вправо до ближайшего свободного слота на верхней строке
        // вместо скрытия — сдвигаем визуально, сохраняя привязку линией к x
        const shiftedX = Math.max(last0 + GAP + it.wEst / 2, it.x)
        // если сдвиг < 40px, считаем приемлемым, иначе прячем
        if (shiftedX - it.x < 40) {
          placed.push({ ...it, x: shiftedX, row: 0 })
          last0 = shiftedX + it.wEst / 2
        }
        // иначе пропускаем — плейсхолдер останется невидимым, но данные не потеряются (видно в Карте дня)
      }
    }
    return placed
  }, [visualMap, totalWidth])

  return (
    <>
      {items.map(({ s, trunc, x, row }) => {
        const a = ACCENTS[s.color as keyof typeof ACCENTS] ?? ACCENTS.blue
        return (
          <div
            key={s.start}
            className="absolute text-[10px] font-semibold whitespace-nowrap px-2 py-0.5 rounded-full"
            style={{
              left: x,
              top: row === 0 ? 0 : 18,
              transform: 'translateX(-50%) translateZ(0)',
              color: a.color,
              background: 'var(--surface-2)',
              border: '1px solid var(--stroke)',
              opacity: row === 0 ? 0.62 : 0.9,
              maxWidth: 132,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              boxShadow: row === 1 ? '0 2px 10px rgba(0,0,0,0.3)' : undefined,
            }}
            title={`${s.label} · ${fmtHM(s.start)}`}
          >
            {`${trunc} · ${fmtHM(s.start)}`}
          </div>
        )
      })}
    </>
  )
})

const RulerLayer = memo(function RulerLayer({ visualXOf }: { visualXOf: (min: number) => number }) {
  const totalTicks = Math.ceil((DAY_END - DAY_START) / 60)
  return (
    <>
      {Array.from({ length: totalTicks + 1 }, (_, i) => {
        const m = DAY_START + i * 60
        const isFirst = i === 0
        const isLast = i === totalTicks
        const x = visualXOf(m)
        return (
          <div
            key={m}
            className="absolute bottom-0 font-mono text-[10.5px] text-[var(--text-faint)]"
            style={{
              left: x,
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

const BarsLayer = memo(function BarsLayer({ bars, pitch }: { bars: Bar[]; pitch: number }) {
  // Без виртуализации на JS — используем content-visibility, чтобы не дёргать React на каждый пиксель скролла
  return (
    <>
      {bars.map((bar, i) => {
        const isOff = bar.type === 'off'
        const acc = isOff ? null : (ACCENTS[bar.color as keyof typeof ACCENTS] ?? ACCENTS.blue)
        return (
          <div
            key={i}
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
              // content-visibility позволяет браузеру не красить оффскрин бары без JS
              contentVisibility: 'auto' as const,
              containIntrinsicSize: '5px 96px',
              transformOrigin: '50% 100%',
              animation: 'tl-grow 0.45s cubic-bezier(0.34, 1.4, 0.64, 1) both',
              animationDelay: `${Math.min(i, 80) * 0.6}ms`,
            }}
          />
        )
      })}
    </>
  )
})

const ZonesLayer = memo(function ZonesLayer({
  visualMap,
  totalWidth,
  visualXOf,
}: {
  visualMap: VisualSegment[]
  totalWidth: number
  visualXOf: (min: number) => number
}) {
  // координаты маркеров для анти-коллизии с подписями зон — хук до early return
  const markerXs = useMemo(
    () => visualMap.filter((s) => s.type !== 'focus' && s.type !== 'off').map((s) => s.visualX),
    [visualMap],
  )
  if (visualMap.length === 0) return null
  return (
    <>
      {DAY_ZONES.map((z) => {
        const x0 = visualXOf(z.from)
        const x1 = visualXOf(z.to)
        const w = Math.max(0, x1 - x0)
        if (w <= 1) return null
        // подпись зоны "День" прячем если рядом ( < 72px ) есть плашка Перерыв 11:55 — иначе наслаиваются
        const labelCenter = x0 + 38 // left 12 + ~26/2 ширины "День"
        const nearMarker = markerXs.some((mx) => Math.abs(mx - labelCenter) < 72)
        return (
          <div
            key={z.label}
            className="absolute top-0 bottom-[58px] pointer-events-none"
            style={{
              left: x0,
              width: w,
              background: `linear-gradient(180deg, ${z.tint}, transparent 46%)`,
              contain: 'paint',
            }}
          >
            {!nearMarker && (
              <div className="absolute top-[7px] left-[12px] flex items-center gap-1" style={{ color: z.color, opacity: 0.45 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={z.icon} />
                </svg>
                <span className="text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ fontFamily: 'var(--font-display)' }}>
                  {z.label}
                </span>
              </div>
            )}
          </div>
        )
      })}
      {totalWidth === 0 && null}
    </>
  )
})
