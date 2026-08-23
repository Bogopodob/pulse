import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react'
import { motion } from 'framer-motion'
import { fmtHM, fmtHMS, buildBars, DAY_START, DAY_END, STEP_MIN, PITCH, type Segment } from '../entities/rhythm/useRhythm'
import { ACCENTS, ICON_PATHS } from '../entities/rhythm/activities'

const BREAK_GROUP = new Set(['break', 'smoke', 'rest'])
const FOOD_GROUP = new Set(['lunch', 'breakfast', 'dinner'])
/** Полная ширина ленты суток в пикселях (график конечен — ровно 24 часа). */
const ROW_WIDTH = Math.ceil((DAY_END - DAY_START) / STEP_MIN) * PITCH

/** Контентная координата минуты на ленте. */
const pxOf = (min: number) => ((min - DAY_START) / STEP_MIN) * PITCH

export interface TimelineProps {
  segments: Segment[]
  /** Дробные минуты реального времени (с секундами) — двигает плейхед. */
  nowMinutes: number
  cur: Segment
}

export function Timeline({ segments, nowMinutes, cur }: TimelineProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [showJump, setShowJump] = useState(false)
  const [hv, setHv] = useState<{ x: number; min: number; type: string; color: string; label: string } | null>(null)

  const dragRef = useRef<{ x: number; sl: number } | null>(null)
  const hoverFrameRef = useRef(0)
  const hoverEvtRef = useRef<number | null>(null)

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

  /* Центрирование на текущем времени один раз при монтировании.
     Дальше — нативный скролл с естественными границами [0 … ширина суток]. */
  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return
    vp.scrollLeft = Math.max(0, pxOf(nowMinutes) - vp.clientWidth / 2)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* Колесо мыши → горизонтальная прокрутка (нативный scrollLeft). */
  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      vp.scrollLeft += delta * 1.2
    }
    vp.addEventListener('wheel', handler, { passive: false })
    return () => vp.removeEventListener('wheel', handler)
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

  const onScroll = () => {
    const vp = viewportRef.current
    if (!vp) return
    setShowJump(vp.scrollLeft > 4 && !dragging)
  }

  /* Hover-подсказка: rAF-троттлинг + дедупликация по ключу сегмента. */
  const lastHvMinRef = useRef(Number.NaN)
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragging) return
    hoverEvtRef.current = e.clientX
    if (hoverFrameRef.current) return
    hoverFrameRef.current = requestAnimationFrame(() => {
      hoverFrameRef.current = 0
      const clientX = hoverEvtRef.current
      const vp = viewportRef.current
      if (clientX == null || !vp || dragging) return
      const rect = vp.getBoundingClientRect()
      const relX = clientX - rect.left
      const min = DAY_START + (vp.scrollLeft + relX) / PITCH * STEP_MIN
      const s = segments.find((sg) => min >= sg.start && min < sg.end) ?? segments[segments.length - 1]
      if (!s || Number.isNaN(min)) {
        setHv(null)
        return
      }
      if (Math.floor(min) === lastHvMinRef.current && hv?.type === s.type) return
      lastHvMinRef.current = Math.floor(min)
      setHv({ x: relX, min, type: s.type, color: s.color, label: s.label })
    })
  }

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
        style={{ contain: 'layout paint', scrollbarWidth: 'none' }}
        onDragStart={(e) => e.preventDefault()}
        onScroll={onScroll}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          const vp = viewportRef.current
          if (!vp) return
          e.preventDefault()
          vp.setPointerCapture(e.pointerId)
          dragRef.current = { x: e.clientX, sl: vp.scrollLeft }
          setDragging(true)
          vp.style.cursor = 'grabbing'
        }}
        onPointerUp={() => {
          dragRef.current = null
          setDragging(false)
          if (viewportRef.current) viewportRef.current.style.cursor = 'grab'
        }}
        onPointerCancel={() => {
          dragRef.current = null
          setDragging(false)
          if (viewportRef.current) viewportRef.current.style.cursor = 'grab'
        }}
        onMouseMove={onMouseMove}
        onMouseLeave={() => {
          hoverEvtRef.current = null
          lastHvMinRef.current = Number.NaN
          setHv(null)
        }}
      >
        {/* Лента суток — обычный широкий поток внутри нативного скролла.
            Границы 00:00–24:00 поддерживает сам браузер. */}
        <div className="relative h-full" style={{ width: ROW_WIDTH }}>
          {/* Полосы: фиксированная высота, серые заглушки — прошедшее и будущее вне плана */}
          <div className="absolute left-0 bottom-[62px] h-[96px] flex items-end" style={{ width: ROW_WIDTH }}>
            <BarsLayer bars={bars} pitch={PITCH} />
          </div>

          <div className="absolute left-0 top-[4px] h-[20px] z-[3]" style={{ width: ROW_WIDTH }}>
            <MarkersLayer segments={segments} />
          </div>

          <div className="absolute left-0 bottom-[6px] h-[52px]" style={{ width: ROW_WIDTH }}>
            <RulerLayer />
          </div>

          {/* Затемнение краёв убрано: оно перекрывало реальные часы у границ
              суток непрозрачным фоном при прокрутке до упора */}

          {(() => {
            const t = cur
            if (t.type === 'off') return null
            const a = ACCENTS[t.color as keyof typeof ACCENTS] ?? ACCENTS.blue
            return (
              <div
                className="absolute left-1/2 -translate-x-1/2 top-[30px] bottom-[62px] w-[320px] pointer-events-none rounded-full"
                style={{ background: `radial-gradient(ellipse at center, rgba(${a.glow},0.14), transparent 60%)` }}
              />
            )
          })()}

          {/* Плейхед текущего времени — секундная стрелка */}
          <div className="absolute top-[22px] bottom-[56px] z-[5] pointer-events-none" style={{ left: nowPx }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="relative h-full"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{
                  scale: 1,
                  boxShadow: [
                    '0 0 6px rgba(255,59,48,0.4)',
                    '0 0 14px rgba(255,59,48,0.7)',
                    '0 0 6px rgba(255,59,48,0.4)',
                  ],
                }}
                transition={{
                  scale: { type: 'spring' as const, stiffness: 300, damping: 10 },
                  boxShadow: { repeat: Infinity, duration: 2, ease: 'easeInOut' },
                }}
                className="absolute rounded-full"
                style={{
                  width: 6, height: 6, top: 2, left: '50%', marginLeft: -3,
                  background: '#ff3b30',
                }}
              />
              <div className="absolute top-[11px] bottom-0 left-1/2 rounded-full" style={{
                width: 1.5,
                background: 'linear-gradient(180deg, #ff3b30 0%, #ff3b30 15%, rgba(255,59,48,0.15) 50%, transparent 100%)',
              }} />
            </motion.div>
            <div
              className="absolute bottom-0 left-0 -translate-x-1/2 translate-y-[10px] z-[6] font-mono text-[12px] text-white bg-[var(--surface-3)] border border-[var(--stroke)] px-2 py-0.5 rounded-md whitespace-nowrap tabular-nums"
            >
              {fmtHMS(nowMinutes)}
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

/* Слои вынесены в memo: их props стабильны между секундными тиками,
   поэтому vdom не пересобирается на каждом рендере Timeline. */
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
              transform: isFirst ? 'translateX(3px)' : isLast ? 'translateX(calc(-100% - 3px))' : 'translateX(-50%)',
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

const BarsLayer = memo(function BarsLayer({ bars, pitch }: { bars: { type: string; height: number; color: string }[]; pitch: number }) {
  return (
    <>
      {/* ШАГ ПОЛОСЫ РОВЕН PITCH: width (pitch−1) + marginRight 1 = pitch.
          Иначе полосы сжимаются и обрываются задолго до 24:00. */}
      {bars.map((bar, i) => {
        const isOff = bar.type === 'off'
        const acc = isOff ? null : (ACCENTS[bar.color as keyof typeof ACCENTS] ?? ACCENTS.blue)
        return (
          <div
            key={i}
            className="shrink-0"
            style={{
              width: pitch - 1,
              marginRight: 1,
              height: bar.height,
              borderRadius: '3px 3px 2px 2px',
              background: isOff
                ? 'linear-gradient(180deg, rgba(88, 93, 104, 0.85), rgba(88, 93, 104, 0.45))'
                : `linear-gradient(180deg, ${acc!.color}, ${acc!.dot})`,
              boxShadow: isOff
                ? 'none'
                : 'inset 0 1px 0 rgba(255, 255, 255, 0.28), 0 0 6px rgba(' + acc!.glow + ', 0.22)',
              opacity: isOff ? 0.5 : 1,
            }}
          />
        )
      })}
    </>
  )
})
