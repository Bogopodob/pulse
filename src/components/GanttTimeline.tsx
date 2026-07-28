import { useRef, useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { GanttTask } from '../types'

const HOUR_W = 160
const BUFFER_HOURS = 3
const GAP_MIN = 15
const OFFSET = BUFFER_HOURS * HOUR_W
const DAY_W = (24 + 2 * BUFFER_HOURS) * HOUR_W
const TODAY = new Date(2026, 7, 21)

const TASK_H = 58
const TASK_GAP = 16
const HEADER_H = 44
const MINI_H = 28

const DAYS_RU = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
const MONTHS_RU = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

const MOCK_TASKS: GanttTask[] = [
  { id: '1', title: 'Send a summary to email.', startDate: new Date(2026, 7, 1), endDate: new Date(2026, 8, 21), progress: 0.35, assignees: ['JD', 'RK', 'ML'], startMinute: 9 * 60, endMinute: 18 * 60 },
  { id: '2', title: 'Is status "MQL"?', startDate: new Date(2026, 7, 5), endDate: new Date(2026, 8, 3), progress: 0.70, assignees: ['AN'], startMinute: 10 * 60, endMinute: 16 * 60 },
  { id: '3', title: 'Design system audit', startDate: new Date(2026, 7, 14), endDate: new Date(2026, 7, 28), progress: 0.90, assignees: ['SP', 'LJ'], startMinute: 8 * 60, endMinute: 17 * 60 },
  { id: '4', title: 'API integration — phase 1', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 8, 7), progress: 0.15, assignees: ['MK', 'VR'], startMinute: 7 * 60, endMinute: 15 * 60 },
  { id: '5', title: 'User testing results review', startDate: new Date(2026, 7, 24), endDate: new Date(2026, 8, 14), progress: 0.45, assignees: ['JD', 'SP', 'AN', 'RK'], startMinute: 11 * 60, endMinute: 13 * 60 },
  { id: '6', title: 'Daily stand-up', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 1, assignees: ['JD', 'AN', 'MK', 'SP', 'VR'], startMinute: 9 * 60 + 30, endMinute: 9 * 60 + 45 },
  { id: '7', title: 'Design review', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0.6, assignees: ['SP', 'LJ'], startMinute: 11 * 60, endMinute: 12 * 60 + 30 },
  { id: '8', title: 'Lunch', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 1, assignees: [], startMinute: 13 * 60, endMinute: 14 * 60 },
  { id: '9', title: 'Sprint planning', startDate: new Date(2026, 7, 21), endDate: new Date(2026, 7, 21), progress: 0, assignees: ['JD', 'AN', 'MK', 'SP', 'VR', 'RK', 'LJ'], startMinute: 15 * 60, endMinute: 16 * 60 + 30 },
]

const C = [
  { base: '#4c8dff' },
  { base: '#ff9d5c' },
  { base: '#4fd4c4' },
  { base: '#ff6b8a' },
  { base: '#a78bfa' },
  { base: '#ffd43b' },
  { base: '#69db7c' },
  { base: '#f783ac' },
  { base: '#748ffc' },
]

const AC = ['#4c8dff', '#ff9d5c', '#4fd4c4', '#ff6b8a', '#a78bfa', '#ffd43b', '#69db7c', '#f783ac', '#748ffc']

function isSameDay(a: Date, b: Date) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
}

function fmtDate(d: Date) {
  return `${DAYS_RU[d.getDay()]}, ${d.getDate()} ${MONTHS_RU[d.getMonth()]}`
}

function fmtHour(m: number) {
  const h = Math.floor(m / 60)
  return `${String(h).padStart(2, '0')}h`
}

function fmtExact(m: number) {
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

function fmtRange(a: Date, b: Date) {
  const f = (d: Date) => `${d.getDate()} ${MONTHS_RU[d.getMonth()]}`
  return `от ${f(a)} до ${f(b)}`
}

const contentVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 200, damping: 24 },
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: { duration: 0.15 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 200,
      damping: 24,
      delay: i * 0.05,
    },
  }),
}

export function GanttTimeline() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [currentDay, setCurrentDay] = useState(new Date(TODAY))
  const [nowMinute, setNowMinute] = useState(() => new Date().getHours() * 60 + new Date().getMinutes())
  const [scrollLeft, setScrollLeft] = useState(0)
  const [viewportW, setViewportW] = useState(0)
  const [hoverMin, setHoverMin] = useState<number | null>(null)
  const [hoverX, setHoverX] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date()
      setNowMinute(d.getHours() * 60 + d.getMinutes())
    }, 60000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollLeft = OFFSET + 8 * HOUR_W - el.clientWidth / 2
  }, [currentDay])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setViewportW(el.clientWidth))
    ro.observe(el)
    setViewportW(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const handleGanttScroll = useCallback(() => {
    const el = scrollRef.current
    if (el) setScrollLeft(el.scrollLeft)
  }, [])

  const scrollToHour = useCallback((hour: number) => {
    const el = scrollRef.current
    if (!el) return
    const target = OFFSET + hour * HOUR_W - el.clientWidth / 2
    el.scrollTo({ left: target, behavior: 'smooth' })
  }, [])

  const handleMiniClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollRef.current
    if (!el) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    el.scrollTo({ left: ratio * DAY_W - el.clientWidth / 2, behavior: 'smooth' })
  }, [])

  const handleTickHover = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const absX = e.clientX - rect.left
    const minute = (absX - OFFSET) / HOUR_W * 60
    if (minute >= -30 && minute <= 24 * 60 + 30) {
      setHoverMin(Math.round(Math.max(0, Math.min(24 * 60, minute))))
      setHoverX(absX)
    } else {
      setHoverMin(null)
    }
  }, [])

  const handleTickLeave = useCallback(() => {
    setHoverMin(null)
  }, [])

  const goPrev = () => {
    const d = new Date(currentDay)
    d.setDate(d.getDate() - 1)
    setCurrentDay(d)
  }

  const goNext = () => {
    const d = new Date(currentDay)
    d.setDate(d.getDate() + 1)
    setCurrentDay(d)
  }

  const goToday = () => {
    setCurrentDay(new Date(TODAY))
  }

  const isToday = isSameDay(currentDay, TODAY)
  const visibleTasks = MOCK_TASKS.filter((t) => currentDay >= t.startDate && currentDay <= t.endDate)

  const packedTasks = (() => {
    const withBounds = visibleTasks.map((t) => ({
      task: t,
      leftMin: isSameDay(currentDay, t.startDate) ? t.startMinute : 0,
      rightMin: isSameDay(currentDay, t.endDate) ? t.endMinute : 24 * 60,
    }))
    withBounds.sort((a, b) => a.leftMin - b.leftMin)

    const rows: { end: number; items: typeof withBounds }[] = []
    for (const item of withBounds) {
      let placed = false
      for (let r = 0; r < rows.length; r++) {
        if (rows[r].end + GAP_MIN <= item.leftMin) {
          rows[r].items.push(item)
          rows[r].end = item.rightMin
          placed = true
          break
        }
      }
      if (!placed) rows.push({ end: item.rightMin, items: [item] })
    }

    const result: { task: GanttTask; row: number; leftMin: number; rightMin: number }[] = []
    rows.forEach((row, ri) => {
      row.items.forEach((item) => result.push({ task: item.task, row: ri, leftMin: item.leftMin, rightMin: item.rightMin }))
    })
    return result
  })()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col min-h-0 relative"
    >
      <div className="absolute top-0 left-0 w-[60px] h-full z-[5] pointer-events-none" style={{ background: 'linear-gradient(90deg, var(--bg) 0%, transparent 100%)' }} />
      <div className="absolute top-0 right-0 w-[60px] h-full z-[5] pointer-events-none" style={{ background: 'linear-gradient(270deg, var(--bg) 0%, transparent 100%)' }} />

      <div className="flex items-center justify-between shrink-0 px-2 h-[32px]">
        <motion.button
          whileTap={{ scale: 0.9 }}
          className="flex items-center gap-1 px-2 h-[24px] rounded-md cursor-pointer text-[11px] font-medium"
          style={{ color: 'rgba(255,255,255,0.3)' }}
          whileHover={{ color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.04)' }}
          onClick={goPrev}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          <span>Назад</span>
        </motion.button>

        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold tracking-[-0.01em]" style={{ color: isToday ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.5)' }}>
            {fmtDate(currentDay)}
          </span>
          {!isToday && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="px-2 h-[20px] rounded-md cursor-pointer text-[10px] font-semibold"
              style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)' }}
              whileHover={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}
              onClick={goToday}
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            >
              Сегодня
            </motion.button>
          )}
        </div>

        <motion.button
          whileTap={{ scale: 0.9 }}
          className="flex items-center gap-1 px-2 h-[24px] rounded-md cursor-pointer text-[11px] font-medium"
          style={{ color: 'rgba(255,255,255,0.3)' }}
          whileHover={{ color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.04)' }}
          onClick={goNext}
        >
          <span>Вперёд</span>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
        </motion.button>
      </div>

      {viewportW > 0 && (
        <div
          className="relative shrink-0 cursor-pointer mx-2 rounded-sm select-none"
          style={{ height: MINI_H, background: 'rgba(255,255,255,0.03)' }}
          onClick={handleMiniClick}
        >
          {Array.from({ length: 25 }, (_, i) => (
            <div
              key={`mt-${i}`}
              className="absolute top-0 rounded-full"
              style={{
                left: `${(i / 24) * 100}%`,
                width: i % 6 === 0 ? 1.5 : 0.5,
                height: i % 6 === 0 ? MINI_H : 8,
                top: i % 6 === 0 ? 0 : (MINI_H - 8) / 2,
                background: i % 6 === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
                transform: 'translateX(-50%)',
              }}
            />
          ))}
          <div
            className="absolute top-0 h-full rounded-sm pointer-events-none"
            style={{
              left: `${(scrollLeft / DAY_W) * 100}%`,
              width: `${(viewportW / DAY_W) * 100}%`,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.04)',
            }}
          />
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={handleGanttScroll}
        className="flex-1 overflow-x-auto overflow-y-hidden"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--surface-3) transparent',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentDay.toISOString()}
            className="relative"
            style={{ width: DAY_W, minHeight: '100%' }}
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="absolute top-0 left-0 right-0 z-[3] select-none" style={{ height: 14 }}>
              {Array.from({ length: DAY_W / HOUR_W }, (_, i) => {
                const hourOfDay = ((24 - BUFFER_HOURS + i) % 24)
                const isBuffer = i < BUFFER_HOURS || i >= BUFFER_HOURS + 24
                return (
                  <div
                    key={`hl-${i}`}
                    className="absolute cursor-pointer"
                    style={{ left: i * HOUR_W, top: '50%', transform: 'translate(-50%, -50%)' }}
                    onClick={() => scrollToHour(hourOfDay)}
                  >
                    <span className="text-[9.5px] font-semibold tabular-nums" style={{ color: isBuffer ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.3)' }}>
                      {String(hourOfDay).padStart(2, '0')}
                    </span>
                  </div>
                )
              })}
            </div>

            <div
              className="absolute z-[1]"
              style={{ top: 16, left: 0, right: 0, height: 26 }}
              onMouseMove={handleTickHover}
              onMouseLeave={handleTickLeave}
            >
              {Array.from({ length: DAY_W / HOUR_W + 1 }, (_, h) => {
                const x = h * HOUR_W
                const isMajor = h % 6 === 0
                const isBuffer = h < BUFFER_HOURS || h > BUFFER_HOURS + 24
                return (
                  <div
                    key={`t-${h}`}
                    className="absolute bottom-0"
                    style={{
                      left: x,
                      width: isMajor ? 1.5 : 1,
                      height: isMajor ? 26 : 10,
                      background: isBuffer ? 'rgba(255,255,255,0.015)' : (isMajor ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)'),
                    }}
                  />
                )
              })}
              {hoverMin !== null && (
                <div
                  className="absolute z-20 pointer-events-none"
                  style={{
                    top: -20,
                    left: hoverX,
                    transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.8)',
                    borderRadius: 4,
                    padding: '1px 6px',
                    fontSize: 9,
                    fontWeight: 600,
                    color: '#fff',
                    whiteSpace: 'nowrap',
                    letterSpacing: '0.02em',
                  }}
                >
                  {fmtExact(hoverMin)}
                </div>
              )}
            </div>

            <div className="absolute top-[44px] left-0 right-0 z-[1] pointer-events-none" style={{ height: 1, background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 10%, rgba(255,255,255,0.06) 90%, transparent 100%)' }} />

            <div className="absolute inset-y-0 z-[1] pointer-events-none" style={{ left: 0, width: OFFSET, background: 'rgba(0,0,0,0.15)' }} />
            <div className="absolute inset-y-0 z-[1] pointer-events-none" style={{ left: OFFSET + 24 * HOUR_W, width: OFFSET, background: 'rgba(0,0,0,0.15)' }} />

            <div className="absolute z-[3] pointer-events-none select-none flex items-center justify-center" style={{ left: 0, width: OFFSET, top: 0, height: 14 }}>
              <span className="text-[8.5px] font-semibold tracking-[0.04em]" style={{ color: 'rgba(255,255,255,0.08)' }}>← вчера</span>
            </div>
            <div className="absolute z-[3] pointer-events-none select-none flex items-center justify-center" style={{ left: OFFSET + 24 * HOUR_W, width: OFFSET, top: 0, height: 14 }}>
              <span className="text-[8.5px] font-semibold tracking-[0.04em]" style={{ color: 'rgba(255,255,255,0.08)' }}>завтра →</span>
            </div>

            <div className="absolute top-0 bottom-0 z-[2] pointer-events-none" style={{ left: OFFSET, width: 1, background: 'rgba(255,255,255,0.04)' }} />
            <div className="absolute top-0 bottom-0 z-[2] pointer-events-none" style={{ left: OFFSET + 24 * HOUR_W, width: 1, background: 'rgba(255,255,255,0.04)' }} />

            {isToday && (
              <div className="absolute top-0 bottom-0 pointer-events-none z-10" style={{ left: OFFSET + nowMinute / 60 * HOUR_W }}>
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
                      width: 6, height: 6, top: 4, left: '50%', marginLeft: -3,
                      background: '#ff3b30',
                    }}
                  />
                  <div className="absolute top-[13px] bottom-0 left-1/2 rounded-full" style={{
                    width: 1.5,
                    background: 'linear-gradient(180deg, #ff3b30 0%, #ff3b30 15%, rgba(255,59,48,0.15) 50%, transparent 100%)',
                  }} />
                </motion.div>
              </div>
            )}

            <div className="absolute z-[1] pointer-events-none" style={{ top: 0, left: 0, width: DAY_W }}>
              {Array.from(new Set(packedTasks.map((p) => p.row))).map((row) => (
                <div key={`reel-${row}`} className="absolute left-0 w-full" style={{
                  top: HEADER_H + row * (TASK_H + TASK_GAP) + TASK_H / 2,
                  height: 1,
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.025) 10%, rgba(255,255,255,0.025) 90%, transparent 100%)',
                }} />
              ))}
            </div>

            {packedTasks.map((p, idx) => {
              const { task } = p
              const leftMin = p.leftMin
              const rightMin = p.rightMin
              const left = OFFSET + leftMin / 60 * HOUR_W
              const width = Math.max((rightMin - leftMin) / 60 * HOUR_W, 220)
              const top = HEADER_H + p.row * (TASK_H + TASK_GAP)
              const cc = C[idx % C.length]

              const startsBefore = leftMin === 0 && currentDay > task.startDate
              const endsAfter = rightMin === 24 * 60 && currentDay < task.endDate

              return (
                <motion.div
                  key={task.id}
                  custom={idx}
                  variants={cardVariants}
                  className="absolute group cursor-pointer select-none flex flex-col"
                  style={{ left, top, width, height: TASK_H, padding: '10px 36px 10px 14px' }}
                >
                  <motion.div
                    className="absolute inset-0 rounded-xl"
                    style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.05)' }}
                    whileHover={{
                      y: -2,
                      borderColor: 'rgba(255,255,255,0.15)',
                      background: 'rgba(255,255,255,0.07)',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
                      transition: { type: 'spring' as const, stiffness: 350, damping: 14 },
                    }}
                  />

                  <div className="flex items-center gap-2 relative z-[1] min-h-0 shrink-0">
                    <div className="rounded-full shrink-0" style={{ width: 6, height: 6, background: cc.base, opacity: 0.7 }} />
                    <span className="text-[13px] font-medium text-[var(--text)] leading-tight truncate tracking-[-0.01em]">
                      {task.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 relative z-[1] mt-auto flex-wrap" style={{ paddingTop: 4 }}>
                    {startsBefore ? (
                      <span className="text-[10px] font-medium truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {fmtRange(task.startDate, task.endDate)}
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {fmtHour(leftMin)}–{fmtHour(rightMin)}
                      </span>
                    )}
                    {endsAfter && (
                      <span className="text-[10px] font-medium shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        → {fmtRange(task.startDate, task.endDate)}
                      </span>
                    )}
                    <div className="flex-1 min-w-[4px]" />
                    <span className="text-[10.5px] font-semibold tabular-nums shrink-0" style={{ color: cc.base, opacity: 0.5 }}>
                      {Math.round(task.progress * 100)}%
                    </span>
                    <div className="flex shrink-0 items-center">
                      {task.assignees.slice(0, 2).map((initials, i) => (
                        <div
                          key={i}
                          className="rounded-full flex items-center justify-center text-[10px] font-semibold select-none"
                          style={{
                            width: 24, height: 24,
                            background: `linear-gradient(135deg, ${AC[(idx + i) % AC.length]}, ${AC[(idx + i + 1) % AC.length]})`,
                            color: '#fff', marginLeft: i > 0 ? -6 : 0,
                            zIndex: task.assignees.length - i,
                            border: '2px solid var(--bg)', opacity: 0.7,
                          }}
                          title={initials}
                        >
                          {initials}
                        </div>
                      ))}
                      {task.assignees.length > 2 && (
                        <div
                          className="rounded-full flex items-center justify-center text-[9px] font-semibold select-none"
                          style={{
                            width: 22, height: 22, marginLeft: -6,
                            background: 'rgba(255,255,255,0.06)',
                            color: 'rgba(255,255,255,0.35)',
                            border: '1.5px solid var(--bg)',
                          }}
                        >
                          +{task.assignees.length - 2}
                        </div>
                      )}
                    </div>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    className="absolute right-[5px] top-[5px] rounded-full flex items-center justify-center z-[2]"
                    style={{ width: 24, height: 24, color: 'rgba(255,255,255,0.12)' }}
                    whileHover={{ color: 'rgba(255,255,255,0.4)' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
                    </svg>
                  </motion.button>
                </motion.div>
              )
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
