import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useMotionTemplate } from 'framer-motion'
import { CalendarDateTime, getLocalTimeZone } from '@internationalized/date'
import { useTeam } from '../../../entities/team/useTeam'
import type { Task, Project } from '../../../entities/tasks/useTasks'

const TODAY = new Date(2026, 7, 21)

const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const WEEKDAYS_FULL = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
const MONTHS_NOM = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']

const TAG_PALETTE = ['#ff4d4d', '#ff9d5c', '#4fd4c4', '#4c8dff', '#a78bfa', '#ffd43b', '#69db7c', '#f783ac']

const WHEEL_ITEM_H = 40
const WHEEL_VISIBLE = 5
const HOURS = Array.from({ length: 24 }, (_, h) => h)
const MINUTES = Array.from({ length: 60 }, (_, m) => m)

function isSameDay(a: Date, b: Date) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
}

function fmtExact(m: number) {
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

function pluralDays(n: number) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return `${n} день`
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} дня`
  return `${n} дней`
}

function pluralTasks(n: number) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return `${n} задача`
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} задачи`
  return `${n} задач`
}

const ADD_MODAL_VARIANTS = {
  hidden: { opacity: 0, scale: 0.92 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 260, damping: 26, delayChildren: 0.18, staggerChildren: 0.07 },
  },
}

const ADD_MODAL_ITEM = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: 'easeOut' as const } },
}

const EASE: [number, number, number, number] = [0.22, 0.8, 0.28, 1]

const MAC_GRID_VARIANTS = {
  hidden: (dir: number) => ({ opacity: 0, x: dir * 34 }),
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.34, ease: EASE, staggerChildren: 0.011, delayChildren: 0.04 },
  },
}

const MAC_CELL_VARIANTS = {
  hidden: { opacity: 0, y: 16, scale: 0.6 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.26, ease: EASE },
  },
}

const TimeWheel = memo(function TimeWheel({ options, value, onChange }: { options: number[]; value: number; onChange: (v: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const lastEmitted = useRef(value)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const idx = options.indexOf(value)
    if (idx < 0) return
    if (Math.abs(el.scrollTop - idx * WHEEL_ITEM_H) > WHEEL_ITEM_H / 2) {
      el.scrollTop = idx * WHEEL_ITEM_H
    }
    lastEmitted.current = value
  }, [value, options])

  const onScroll = () => {
    const el = ref.current
    if (!el) return
    const idx = Math.round(el.scrollTop / WHEEL_ITEM_H)
    if (idx >= 0 && idx < options.length) {
      const v = options[idx]
      if (v !== lastEmitted.current) {
        lastEmitted.current = v
        onChange(v)
      }
    }
  }

  return (
    <div className="mac-wheel">
      <div
        ref={ref}
        onScroll={onScroll}
        className="mac-wheel-list"
        style={{
          height: WHEEL_ITEM_H * WHEEL_VISIBLE,
          paddingTop: (WHEEL_ITEM_H * (WHEEL_VISIBLE - 1)) / 2,
          paddingBottom: (WHEEL_ITEM_H * (WHEEL_VISIBLE - 1)) / 2,
        }}
      >
        {options.map((o) => (
          <div key={o} className="mac-wheel-item" style={{ height: WHEEL_ITEM_H }}>
            <span className={`mac-wheel-val${o === value ? ' on' : ''}`}>{String(o).padStart(2, '0')}</span>
          </div>
        ))}
      </div>
      <div className="mac-wheel-mask top" />
      <div className="mac-wheel-mask bottom" />
      <div className="mac-wheel-bar" />
    </div>
  )
})

type PresetKey = 'today' | 'tomorrow' | 'week' | 'nextweek' | 'month'

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: 'today', label: 'Сегодня' },
  { key: 'tomorrow', label: 'Завтра' },
  { key: 'week', label: 'Эта неделя' },
  { key: 'nextweek', label: 'След. неделя' },
  { key: 'month', label: 'Месяц' },
]

const MacCalendar = memo(function MacCalendar({
  mode,
  start,
  end,
  periodStage,
  month,
  tasks,
  projects,
  onMonthChange,
  onPick,
  onClear,
}: {
  mode: 'single' | 'range'
  start: CalendarDateTime
  end: CalendarDateTime
  periodStage: 0 | 1 | 2
  month: Date
  tasks: Task[]
  projects: Record<string, Project>
  onMonthChange: (m: Date) => void
  onPick: (d: Date) => void
  onClear: () => void
}) {
  const y = month.getFullYear()
  const m = month.getMonth()
  const offset = (new Date(y, m, 1).getDay() + 6) % 7
  const dim = new Date(y, m + 1, 0).getDate()
  const prevDim = new Date(y, m, 0).getDate()
  const cells: { d: Date; out: boolean }[] = []
  for (let i = 0; i < 6 * 7; i++) {
    const n = i - offset + 1
    if (n >= 1 && n <= dim) cells.push({ d: new Date(y, m, n), out: false })
    else if (n < 1) cells.push({ d: new Date(y, m - 1, prevDim + n), out: true })
    else cells.push({ d: new Date(y, m + 1, n - dim), out: true })
  }

  const [hover, setHover] = useState<Date | null>(null)

  const sT = start.toDate(getLocalTimeZone()).getTime()
  const hasRange = mode === 'range' && periodStage >= 1
  const previewEnd = mode === 'range' && periodStage === 1 && hover && hover.getTime() !== sT ? hover : null
  const finalEnd = mode === 'range' && periodStage === 2 ? end.toDate(getLocalTimeZone()) : null
  const rangeEnd = previewEnd ?? finalEnd
  const lo = rangeEnd ? Math.min(sT, rangeEnd.getTime()) : 0
  const hi = rangeEnd ? Math.max(sT, rangeEnd.getTime()) : 0

  const taskColor = (t: Task) => (t.tags[0] ? projects[t.tags[0]]?.color : undefined) ?? 'rgba(255,255,255,0.45)'

  const tasksByDay = useMemo(() => {
    const map = new Map<number, Task[]>()
    for (const t of tasks) {
      const d0 = new Date(t.startDate.getFullYear(), t.startDate.getMonth(), t.startDate.getDate())
      const d1 = new Date(t.endDate.getFullYear(), t.endDate.getMonth(), t.endDate.getDate())
      for (const d = new Date(d0); d <= d1; d.setDate(d.getDate() + 1)) {
        const k = d.getTime()
        const arr = map.get(k)
        if (arr) arr.push(t)
        else map.set(k, [t])
      }
    }
    return map
  }, [tasks])

  const dayTasksFor = (d: Date) => tasksByDay.get(d.getTime()) ?? []

  const selDate = start.toDate(getLocalTimeZone())
  const footFrom = selDate
  const footTo = mode === 'range' && periodStage === 2 ? end.toDate(getLocalTimeZone()) : selDate
  const footCount = tasks.filter((t) => t.startDate <= footTo && t.endDate >= footFrom).length

  const isTodayMonth = y === TODAY.getFullYear() && m === TODAY.getMonth()
  const canClear =
    (mode === 'single' && !isSameDay(selDate, TODAY)) || (mode === 'range' && periodStage > 0)

  const monthDir = useRef(0)
  const prevMonthKey = useRef(month.getTime())
  if (month.getTime() !== prevMonthKey.current) {
    monthDir.current = month.getTime() > prevMonthKey.current ? 1 : -1
    prevMonthKey.current = month.getTime()
  }

  const wrapRef = useRef<HTMLDivElement>(null)
  const [focused, setFocused] = useState(false)
  const [kb, setKb] = useState(() => new Date(y, m, 1))

  useEffect(() => {
    if (kb.getMonth() !== m || kb.getFullYear() !== y) setKb(new Date(y, m, 1))
  }, [y, m, kb])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      onMonthChange(new Date(y, m + (e.deltaY > 0 ? 1 : -1), 1))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [y, m, onMonthChange])

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    const step = steps[e.key]
    if (step) {
      e.preventDefault()
      const nd = new Date(kb.getFullYear(), kb.getMonth(), kb.getDate() + step)
      setKb(nd)
      if (nd.getMonth() !== m || nd.getFullYear() !== y)
        onMonthChange(new Date(nd.getFullYear(), nd.getMonth(), 1))
      return
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onPick(kb)
    } else if (e.key === 'Escape') {
      e.currentTarget.blur()
    }
  }

  const spotX = useMotionValue(50)
  const spotY = useMotionValue(50)
  const spotBg = useMotionTemplate`radial-gradient(150px circle at ${spotX}% ${spotY}%, rgba(10,132,255,0.14), transparent 70%)`

  const spotRaf = useRef(0)
  const spotLatest = useRef({ x: 50, y: 50 })

  useEffect(() => () => cancelAnimationFrame(spotRaf.current), [])

  const onSpotMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    spotLatest.current = {
      x: ((e.clientX - r.left) / r.width) * 100,
      y: ((e.clientY - r.top) / r.height) * 100,
    }
    if (spotRaf.current) return
    spotRaf.current = requestAnimationFrame(() => {
      spotRaf.current = 0
      spotX.set(spotLatest.current.x)
      spotY.set(spotLatest.current.y)
    })
  }

  const prevMonth = useRef(month.getTime())

  useLayoutEffect(() => {
    if (prevMonth.current !== month.getTime()) {
      prevMonth.current = month.getTime()
      setHover(null)
      setFocused(false)
    }
  }, [month])

  return (
    <div className="mac-cal-wrap" ref={wrapRef} tabIndex={0} role="grid" aria-label="Календарь" onKeyDown={onKeyDown} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
      <div className="mac-cal-head">
        <div className="mac-cal-head-left">
          <button
            type="button"
            className={`mac-cal-today${isTodayMonth ? ' on' : ''}`}
            onClick={() => onMonthChange(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1))}
          >
            Сегодня
          </button>
          {canClear && (
            <button type="button" className="mac-cal-clear" onClick={onClear} aria-label="Сбросить выбор" title="Сбросить выбор">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <motion.div
          key={`${y}-${m}`}
          className="mac-cal-title"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        >
          {MONTHS_NOM[m]} {y}
        </motion.div>
        <div className="mac-cal-nav">
          <button
            type="button"
            className="mac-cal-nav-btn"
            onClick={() => onMonthChange(new Date(y, m - 1, 1))}
            aria-label="Предыдущий месяц"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            className="mac-cal-nav-btn"
            onClick={() => onMonthChange(new Date(y, m + 1, 1))}
            aria-label="Следующий месяц"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
      <motion.div
        key={`grid-${y}-${m}`}
        custom={monthDir.current}
        variants={MAC_GRID_VARIANTS}
        initial="hidden"
        animate="show"
      >
        <div className="mac-cal-week">
          {WEEKDAYS_SHORT.map((w, i) => (
            <div key={w} className={i >= 5 ? 'we' : ''}>
              {w}
            </div>
          ))}
        </div>
        <div className="mac-cal-grid" onMouseLeave={() => setHover(null)} onMouseMove={onSpotMove}>
          <div className="mac-cal-spot" style={{ background: spotBg } as unknown as React.CSSProperties} />
          {cells.map(({ d, out }, i) => {
            const t = d.getTime()
            const today = isSameDay(d, TODAY)
            const weekend = d.getDay() === 0 || d.getDay() === 6
            const isStart = hasRange && t === sT
            const isEnd = finalEnd ? t === finalEnd.getTime() : false
            const isPreview = previewEnd ? t === previewEnd.getTime() : false
            const selSingle = mode === 'single' && isSameDay(d, selDate)
            const previewSingle = mode === 'single' && hover && t === hover.getTime() && !isSameDay(hover, selDate)
            const selected = isStart || isEnd || selSingle
            const inPill = hasRange && rangeEnd && t >= lo && t <= hi
            const hasPill = inPill && !(lo === hi && t === lo)
            const dayTasks = dayTasksFor(d)
            const isHovered = hover !== null && isSameDay(hover, d)
            const kbHere = focused && isSameDay(kb, d)
            return (
              <motion.button
                key={i}
                variants={MAC_CELL_VARIANTS}
                type="button"
                tabIndex={-1}
                className="mac-cal-day"
                onClick={() => {
                  if (out) onMonthChange(new Date(d.getFullYear(), d.getMonth(), 1))
                  onPick(d)
                  wrapRef.current?.focus({ preventScroll: true })
                }}
                onMouseEnter={() => setHover(d)}
              >
                {hasPill && (
                  <span
                    key={previewEnd ? `p${previewEnd.getTime()}` : `f${periodStage}`}
                    className={`mac-cal-bar${previewEnd ? ' prev' : ''}`}
                    style={{ animationDelay: `${Math.min(280, ((t - lo) / 86400000) * 20)}ms` }}
                  />
                )}
                <span
                  className={`mac-cal-num${selected ? ' sel' : ''}${isPreview || previewSingle ? ' preview' : ''}${today ? ' today' : ''}${out ? ' out' : ''}${weekend ? ' we' : ''}${kbHere ? ' kb' : ''}`}
                >
                  {d.getDate()}
                </span>
                {selected && <span className="mac-cal-ripple" />}
                {dayTasks.length > 0 && (
                  <span className={`mac-cal-dots${selected ? ' on-sel' : ''}${today && !selected ? ' on-today' : ''}`}>
                    {dayTasks.slice(0, 3).map((tk, di) => (
                      <span
                        key={tk.id}
                        className="mac-cal-dot"
                        style={selected || today ? undefined : { background: taskColor(tk), animationDelay: `${di * 70}ms` }}
                      />
                    ))}
                    {dayTasks.length > 3 && (
                      <span className={`mac-cal-dots-more${selected ? ' on-sel' : ''}${today && !selected ? ' on-today' : ''}`}>
                        +{dayTasks.length - 3}
                      </span>
                    )}
                  </span>
                )}
                {isHovered && dayTasks.length > 0 && (
                  <span className={`mac-cal-tip${i < 14 ? ' down' : ''}`}>
                    {dayTasks.slice(0, 4).map((tk) => (
                      <span key={tk.id} className="mac-cal-tip-row">
                        <span className="mac-cal-tip-dot" style={{ background: taskColor(tk) }} />
                        <span className="mac-cal-tip-title">{tk.title}</span>
                      </span>
                    ))}
                    {dayTasks.length > 4 && <span className="mac-cal-tip-more">и ещё {dayTasks.length - 4}</span>}
                  </span>
                )}
              </motion.button>
            )
          })}
        </div>
      </motion.div>
      <div className="mac-cal-foot">
        {mode === 'range' && periodStage === 0 && (
          <span className="mac-cal-hint">
            <span className="mac-dot" />
            Выберите дату начала
          </span>
        )}
        {mode === 'range' && periodStage === 1 && (
          <span className="mac-cal-hint">
            <span className="mac-dot" />
            Выберите дату окончания
          </span>
        )}
        {!(mode === 'range' && periodStage < 2) && footCount > 0 && (
          <span className="mac-cal-foot-info">
            <span className="mac-foot-dot" />
            {pluralTasks(footCount)}
            {mode === 'range' ? ' в периоде' : ' на этот день'}
          </span>
        )}
      </div>
    </div>
  )
})

export interface AddTaskFormData {
  title: string
  startDate: Date
  endDate: Date
  startMinute: number
  endMinute: number
  tags: string[]
  assignees: string[]
  responsible?: string
}

export function AddTaskForm({
  initialDay,
  tasks,
  projects,
  onAdd,
  onAddProject,
  onBack,
}: {
  initialDay: Date
  tasks: Task[]
  projects: Record<string, Project>
  onAdd: (data: AddTaskFormData) => void
  onAddProject: (key: string, project: Project) => void
  onBack: () => void
}) {
  const { team, addUser } = useTeam()
  const [newTitle, setNewTitle] = useState('')
  const [date, setDate] = useState<CalendarDateTime | null>(null)
  const [endDate, setEndDate] = useState<CalendarDateTime | null>(null)
  const [usePeriod, setUsePeriod] = useState(false)
  const [periodStage, setPeriodStage] = useState<0 | 1 | 2>(0)
  const [allDay, setAllDay] = useState(false)
  const [picker, setPicker] = useState<'start' | 'end' | null>(null)
  const [newTags, setNewTags] = useState<string[]>(['ritual'])
  const [newProjOpen, setNewProjOpen] = useState(false)
  const [newProjName, setNewProjName] = useState('')
  const [calMonth, setCalMonth] = useState<Date>(() => new Date(TODAY.getFullYear(), TODAY.getMonth(), 1))
  const [assignees, setAssignees] = useState<string[]>([])
  const [responsible, setResponsible] = useState<string | undefined>(undefined)
  const [newMember, setNewMember] = useState('')
  const pickerWrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const now = new Date()
    const m = isSameDay(initialDay, now) ? now.getHours() * 60 + now.getMinutes() : 9 * 60
    const em = Math.min(24 * 60 - 1, m + 30)
    const mk = (min: number) =>
      new CalendarDateTime(initialDay.getFullYear(), initialDay.getMonth() + 1, initialDay.getDate(), Math.floor(min / 60), min % 60)
    setDate(mk(m))
    setEndDate(mk(em))
    setCalMonth(new Date(initialDay.getFullYear(), initialDay.getMonth(), 1))
    if (team.length > 0) {
      setAssignees([team[0].id])
      setResponsible(team[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDay])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPicker(null)
        setNewProjOpen(false)
        onBack()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onBack])

  useEffect(() => {
    if (!picker) return
    const onDown = (e: MouseEvent) => {
      if (pickerWrapRef.current && !pickerWrapRef.current.contains(e.target as Node)) setPicker(null)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [picker])

  const setTime = useCallback(
    (side: 'start' | 'end', part: { hour?: number; minute?: number }) => {
      if (!date || !endDate) return
      const sameDay = date.year === endDate.year && date.month === endDate.month && date.day === endDate.day
      if (side === 'start') {
        const ns = date.set(part)
        setDate(ns)
        const sm = ns.hour * 60 + ns.minute
        const em = endDate.hour * 60 + endDate.minute
        setEndDate(sameDay && em < sm ? endDate.set({ hour: ns.hour, minute: ns.minute }) : endDate)
      } else {
        const ne = endDate.set(part)
        const sm = date.hour * 60 + date.minute
        const em = ne.hour * 60 + ne.minute
        setEndDate(sameDay && em < sm ? endDate.set({ hour: date.hour, minute: date.minute }) : ne)
      }
    },
    [date, endDate],
  )

  const onPickerHour = useCallback((h: number) => {
    if (picker) setTime(picker, { hour: h })
  }, [picker, setTime])
  const onPickerMinute = useCallback((mi: number) => {
    if (picker) setTime(picker, { minute: mi })
  }, [picker, setTime])

  const pickDay = useCallback((d: Date) => {
    if (!date || !endDate) return
    const day = { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() }
    if (!usePeriod) {
      setDate(date.set(day))
      setEndDate(endDate.set(day))
      return
    }
    if (periodStage === 0 || periodStage === 2) {
      setDate(date.set(day))
      setEndDate(endDate.set(day))
      setPeriodStage(1)
      return
    }
    if (d.getTime() < date.toDate(getLocalTimeZone()).getTime()) setDate(date.set(day))
    else setEndDate(endDate.set(day))
    setPeriodStage(2)
  }, [date, endDate, usePeriod, periodStage])

  const clearSelection = useCallback(() => {
    const day = { year: TODAY.getFullYear(), month: TODAY.getMonth() + 1, day: TODAY.getDate() }
    setDate((d) => (d ? d.set(day) : d))
    setEndDate((d) => (d ? d.set(day) : d))
    setPeriodStage(0)
    setCalMonth(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1))
  }, [])

  const setPeriod = (v: boolean) => {
    setUsePeriod(v)
    setPeriodStage(0)
    setPicker(null)
  }

  const toggleAllDay = () => {
    setAllDay((a) => !a)
    setPicker(null)
  }

  const applyPreset = (key: PresetKey) => {
    if (!date || !endDate) return
    const set = (d: Date) => ({ year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() })
    const d0 = new Date(TODAY)
    let s: Date
    let e: Date
    const wd = (d0.getDay() + 6) % 7
    switch (key) {
      case 'tomorrow': {
        s = new Date(d0)
        s.setDate(s.getDate() + 1)
        e = s
        break
      }
      case 'week': {
        s = new Date(d0)
        s.setDate(s.getDate() - wd)
        e = new Date(s)
        e.setDate(e.getDate() + 6)
        break
      }
      case 'nextweek': {
        s = new Date(d0)
        s.setDate(s.getDate() - wd + 7)
        e = new Date(s)
        e.setDate(e.getDate() + 6)
        break
      }
      case 'month': {
        s = new Date(d0.getFullYear(), d0.getMonth(), 1)
        e = new Date(d0.getFullYear(), d0.getMonth() + 1, 0)
        break
      }
      default: {
        s = new Date(d0)
        e = s
      }
    }
    setDate(date.set(set(s)))
    setEndDate(endDate.set(set(e)))
    setCalMonth(new Date(s.getFullYear(), s.getMonth(), 1))
    setPicker(null)
    if (s.getTime() !== e.getTime()) {
      setUsePeriod(true)
      setPeriodStage(2)
    } else {
      setPeriodStage(0)
    }
  }

  const dayCount =
    usePeriod && periodStage === 2 && date && endDate
      ? Math.round((endDate.toDate(getLocalTimeZone()).getTime() - date.toDate(getLocalTimeZone()).getTime()) / 86400000) + 1
      : null

  const toggleNewTag = (key: string) => {
    setNewTags((prev) => (prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]))
  }

  const addProject = (color: string) => {
    const name = newProjName.trim()
    if (!name) return
    const key = `custom-${Date.now()}`
    onAddProject(key, { label: name, color })
    setNewTags((prev) => [...prev, key])
    setNewProjName('')
    setNewProjOpen(false)
  }

  const toggleAssignee = (id: string) => {
    setAssignees((prev) => {
      const next = prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
      if (!next.includes(responsible ?? '')) setResponsible(undefined)
      return next
    })
  }

  const addMember = () => {
    const name = newMember.trim()
    if (!name) return
    const user = addUser(name)
    setAssignees((prev) => [...prev, user.id])
    if (!responsible) setResponsible(user.id)
    setNewMember('')
  }

  const submit = () => {
    const trimmed = newTitle.trim()
    if (!trimmed || !date || !endDate) return
    const sd = date.toDate(getLocalTimeZone())
    const ed = endDate.toDate(getLocalTimeZone())
    let startMin = allDay ? 0 : date.hour * 60 + date.minute
    let endMin = allDay ? 24 * 60 : endDate.hour * 60 + endDate.minute
    if (isSameDay(sd, ed) && endMin <= startMin) endMin = Math.min(24 * 60, startMin + 30)
    onAdd({
      title: trimmed,
      startDate: sd,
      endDate: ed,
      startMinute: startMin,
      endMinute: endMin,
      tags: newTags.length > 0 ? newTags : ['ritual'],
      assignees,
      responsible,
    })
  }

  const memberOf = (id: string) => team.find((u) => u.id === id)

  return (
    <motion.form
      key="add-task-form"
      variants={ADD_MODAL_VARIANTS}
      initial="hidden"
      animate="show"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="w-full flex flex-col h-full min-h-0"
    >
      <div className="shrink-0 flex items-center justify-between gap-3 px-6 sm:px-8 md:px-10 py-3.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(10,12,18,0.6)', backdropFilter: 'blur(14px)' }}>
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition-colors shrink-0"
            style={{ color: 'rgba(245,245,247,0.55)', background: 'rgba(255,255,255,0.04)' }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Расписание
          </button>
          <h2 className="text-[19px] font-semibold tracking-[-0.02em] text-[#fff] leading-none truncate">Новая задача</h2>
        </div>
        <button
          type="button"
          onClick={onBack}
          title="Закрыть (Esc)"
          className="flex items-center justify-center size-9 rounded-xl btn-icon border transition-colors shrink-0"
          style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6l-12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 sm:px-8 md:px-10">
        <div className="max-w-[1000px] mx-auto py-6 flex flex-col gap-5">
      <motion.div variants={ADD_MODAL_ITEM}>
        <div
          className="flex items-center rounded-xl border transition-colors px-4"
          style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}
        >
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Что добавить в расписание?"
            className="input-base flex-1 py-3.5 text-[15px] focus:outline-none"
          />
          <span className="text-[10px] text-[var(--text-faint)] shrink-0">задача</span>
        </div>
      </motion.div>

      <motion.div
        variants={ADD_MODAL_ITEM}
        className="rounded-[22px] p-5"
        style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="mac-section-title">Дата и время</div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-medium text-[rgba(245,245,247,0.5)] select-none">Весь день</span>
              <button type="button" className={`mac-switch${allDay ? ' on' : ''}`} onClick={toggleAllDay} aria-label="Весь день">
                <span className="mac-switch-knob" />
              </button>
            </div>
            <div className="mac-seg">
              <button type="button" className={!usePeriod ? 'on' : ''} onClick={() => setPeriod(false)}>
                {!usePeriod && (
                  <motion.span
                    layoutId="mac-seg-thumb"
                    className="mac-seg-thumb"
                    transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                  />
                )}
                <span className="mac-seg-label">День</span>
              </button>
              <button type="button" className={usePeriod ? 'on' : ''} onClick={() => setPeriod(true)}>
                {usePeriod && (
                  <motion.span
                    layoutId="mac-seg-thumb"
                    className="mac-seg-thumb"
                    transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                  />
                )}
                <span className="mac-seg-label">Период</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-5">
          <div className="flex-1 min-w-0 flex flex-col gap-4">
            <div className="mac-datehead select-none">
              {!usePeriod && date && (
                <motion.div
                  key={`single-${date.year}-${date.month}-${date.day}`}
                  initial={{ opacity: 0, y: 14, rotateX: 55, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                  style={{ transformPerspective: 640 }}
                >
                  <div className={`mac-dow${isSameDay(date.toDate(getLocalTimeZone()), TODAY) ? ' today' : ''}`}>
                    {WEEKDAYS_FULL[date.toDate(getLocalTimeZone()).getDay()]}
                  </div>
                  <div className="mac-date-big">
                    {date.day} {MONTHS_GEN[date.month - 1]}
                  </div>
                  <div className="mac-date-sub">{fmtExact(date.hour * 60 + date.minute)}</div>
                </motion.div>
              )}
              {usePeriod && periodStage === 0 && (
                <div className="mac-hint">
                  <span className="mac-dot" />
                  Выберите дату начала
                </div>
              )}
              {usePeriod && periodStage === 1 && date && (
                <motion.div
                  key={`pick-${date.year}-${date.month}-${date.day}`}
                  initial={{ opacity: 0, y: 14, rotateX: 55, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                  style={{ transformPerspective: 640 }}
                >
                  <div className="mac-dow">
                    Начало · {WEEKDAYS_FULL[date.toDate(getLocalTimeZone()).getDay()]}
                  </div>
                  <div className="mac-date-big">
                    {date.day} {MONTHS_GEN[date.month - 1]}
                  </div>
                  <div className="mac-hint" style={{ marginTop: 12 }}>
                    <span className="mac-dot" />
                    Выберите дату окончания
                  </div>
                </motion.div>
              )}
              {usePeriod && periodStage === 2 && date && endDate && (
                <motion.div
                  key={`range-${date.year}-${date.month}-${date.day}-${endDate.day}`}
                  initial={{ opacity: 0, y: 14, rotateX: 55, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                  style={{ transformPerspective: 640 }}
                >
                  <div className="mac-dow">
                    {WEEKDAYS_FULL[date.toDate(getLocalTimeZone()).getDay()]} —{' '}
                    {WEEKDAYS_FULL[endDate.toDate(getLocalTimeZone()).getDay()]}
                  </div>
                  <div className="mac-date-big mac-sheen">
                    {date.month === endDate.month
                      ? `${date.day} — ${endDate.day} ${MONTHS_GEN[endDate.month - 1]}`
                      : `${date.day} ${MONTHS_GEN[date.month - 1]} — ${endDate.day} ${MONTHS_GEN[endDate.month - 1]}`}
                  </div>
                  {dayCount && (
                    <div className="mac-date-sub" style={{ marginTop: 8 }}>
                      <span className="mac-days">{pluralDays(dayCount)}</span>
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            <div className="mac-presets">
              {PRESETS.map((p) => (
                <button key={p.key} type="button" className="mac-preset" onClick={() => applyPreset(p.key)}>
                  {p.label}
                </button>
              ))}
            </div>

            {!allDay && date && (
              <div className="mt-auto">
                <div ref={pickerWrapRef} className="relative">
                  <div className="mac-time">
                    <button
                      type="button"
                      onClick={() => setPicker(picker === 'start' ? null : 'start')}
                      className={`mac-time-pill${picker === 'start' ? ' on' : ''}`}
                    >
                      <span className="mac-time-label">с</span>
                      {fmtExact(date.hour * 60 + date.minute)}
                    </button>
                    {endDate && (
                      <>
                        <span className="mac-time-arrow">—</span>
                        <button
                          type="button"
                          onClick={() => setPicker(picker === 'end' ? null : 'end')}
                          className={`mac-time-pill${picker === 'end' ? ' on' : ''}`}
                        >
                          <span className="mac-time-label">по</span>
                          {fmtExact(endDate.hour * 60 + endDate.minute)}
                        </button>
                      </>
                    )}
                  </div>
                  <AnimatePresence>
                    {picker && date && (!usePeriod || endDate) && (
                      <motion.div
                        key="time-popover"
                        initial={{ opacity: 0, y: -10, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                        className="mac-picker"
                      >
                        <TimeWheel
                          options={HOURS}
                          value={(picker === 'start' ? date : endDate!).hour}
                          onChange={onPickerHour}
                        />
                        <span className="text-[20px] font-bold text-[rgba(245,245,247,0.35)]">:</span>
                        <TimeWheel
                          options={MINUTES}
                          value={(picker === 'start' ? date : endDate!).minute}
                          onChange={onPickerMinute}
                        />
                        <button type="button" onClick={() => setPicker(null)} className="mac-picker-done">
                          Готово
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>

          {date && endDate && (
            <MacCalendar
              mode={usePeriod ? 'range' : 'single'}
              start={date}
              end={endDate}
              periodStage={periodStage}
              month={calMonth}
              tasks={tasks}
              projects={projects}
              onMonthChange={setCalMonth}
              onPick={pickDay}
              onClear={clearSelection}
            />
          )}
        </div>
      </motion.div>

      <motion.div variants={ADD_MODAL_ITEM}>
        <div className="text-[9px] uppercase tracking-widest text-[var(--text-faint)] mb-2 flex items-center gap-1.5">
          <span className="size-[5px] rounded-full" style={{ background: '#4c8dff', boxShadow: '0 0 6px rgba(76,141,255,0.8)' }} />
          Проекты
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {Object.entries(projects).map(([key, p]) => {
            const on = newTags.includes(key)
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleNewTag(key)}
                className="flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[10px] font-semibold transition-all select-none"
                style={{
                  background: on ? `${p.color}22` : 'rgba(255,255,255,0.03)',
                  color: on ? p.color : 'rgba(255,255,255,0.4)',
                  border: `1px solid ${on ? `${p.color}88` : 'rgba(255,255,255,0.08)'}`,
                  boxShadow: on ? `0 0 10px ${p.color}30` : undefined,
                }}
              >
                <span
                  className="size-[6px] rounded-full"
                  style={{ background: on ? p.color : 'rgba(255,255,255,0.3)', boxShadow: on ? `0 0 6px ${p.color}` : undefined }}
                />
                {p.label}
              </button>
            )
          })}
          {newProjOpen ? (
            <div className="flex items-center gap-1.5 rounded-full pl-2 pr-1.5 py-1 border transition-colors" style={{ borderColor: 'rgba(255,77,77,0.35)', background: 'rgba(255,255,255,0.03)' }}>
              <input
                autoFocus
                value={newProjName}
                onChange={(e) => setNewProjName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addProject(TAG_PALETTE[0])
                  if (e.key === 'Escape') setNewProjOpen(false)
                }}
                placeholder="Название проекта"
                className="input-base w-[200px] text-[10px] font-semibold"
              />
              <div className="flex items-center gap-1">
                {TAG_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    title={c}
                    onClick={() => addProject(c)}
                    className="size-[14px] rounded-full transition-transform hover:scale-125"
                    style={{ background: c, boxShadow: `0 0 6px ${c}66`, border: '1px solid rgba(0,0,0,0.3)' }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setNewProjOpen(true)}
              className="flex items-center gap-1 h-7 px-2.5 rounded-full text-[10px] font-semibold transition-all select-none"
              style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.45)', border: '1px dashed rgba(255,255,255,0.18)' }}
            >
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Новый
            </button>
          )}
        </div>
      </motion.div>

      <motion.div variants={ADD_MODAL_ITEM}>
        <div className="text-[9px] uppercase tracking-widest text-[var(--text-faint)] mb-2 flex items-center gap-1.5">
          <span className="size-[5px] rounded-full" style={{ background: '#27c93f', boxShadow: '0 0 6px rgba(39,201,63,0.8)' }} />
          Участники
        </div>
        <div
          className="rounded-[22px] p-5"
          style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex flex-wrap gap-2">
            {team.map((u) => {
              const on = assignees.includes(u.id)
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleAssignee(u.id)}
                  className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-[11.5px] font-semibold transition-all select-none"
                  style={{
                    background: on ? `${u.color}22` : 'rgba(255,255,255,0.03)',
                    color: on ? u.color : 'rgba(255,255,255,0.4)',
                    border: `1px solid ${on ? `${u.color}88` : 'rgba(255,255,255,0.08)'}`,
                    boxShadow: on ? `0 0 10px ${u.color}30` : undefined,
                  }}
                >
                  <span
                    className="grid size-6 place-items-center rounded-full text-[9.5px] font-bold"
                    style={{
                      background: on ? u.color : 'rgba(255,255,255,0.12)',
                      color: on ? '#0a0b0e' : 'rgba(255,255,255,0.5)',
                      boxShadow: on ? `0 0 8px ${u.color}80` : undefined,
                    }}
                  >
                    {u.initials}
                  </span>
                  {u.name}
                  {on && (
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <input
              value={newMember}
              onChange={(e) => setNewMember(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addMember()
              }}
              placeholder="Добавить участника по имени…"
              className="input-base flex-1 min-w-[180px] rounded-lg px-3 py-2 text-[11.5px]"
            />
            <button
              type="button"
              onClick={addMember}
              className="flex items-center gap-1 h-7 px-3 rounded-full text-[10.5px] font-semibold transition-all select-none"
              style={{ background: 'rgba(39,201,63,0.14)', color: '#27c93f', border: '1px solid rgba(39,201,63,0.35)' }}
            >
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Добавить
            </button>
          </div>
        </div>
      </motion.div>

      <motion.div variants={ADD_MODAL_ITEM}>
        <div className="text-[9px] uppercase tracking-widest text-[var(--text-faint)] mb-2 flex items-center gap-1.5">
          <span className="size-[5px] rounded-full" style={{ background: '#ffd43b', boxShadow: '0 0 6px rgba(255,212,59,0.8)' }} />
          Ответственный
        </div>
        <div className="flex flex-wrap gap-2">
          {assignees.length === 0 && (
            <span className="text-[11.5px] text-[rgba(255,255,255,0.3)]">Сначала выберите участников</span>
          )}
          {assignees.map((id) => {
            const u = memberOf(id)
            if (!u) return null
            const on = responsible === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setResponsible(on ? undefined : id)}
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-[11.5px] font-semibold transition-all select-none"
                style={{
                  background: on ? `${u.color}26` : 'rgba(255,255,255,0.03)',
                  color: on ? u.color : 'rgba(255,255,255,0.4)',
                  border: `1px solid ${on ? u.color : 'rgba(255,255,255,0.08)'}`,
                  boxShadow: on ? `0 0 12px ${u.color}40` : undefined,
                }}
              >
                <span
                  className="grid size-6 place-items-center rounded-full text-[9.5px] font-bold"
                  style={{
                    background: on ? u.color : 'rgba(255,255,255,0.12)',
                    color: on ? '#0a0b0e' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  {u.initials}
                </span>
                {u.name}
                {on && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l2.4 6.9L21 9.3l-5.4 4.2 1.7 7L12 16.8 6.7 20.5l1.7-7L3 9.3l6.6-.4z" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      </motion.div>
        </div>
      </div>

      <div className="shrink-0 flex items-center justify-end gap-2.5 px-6 sm:px-8 md:px-10 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(10,12,18,0.6)', backdropFilter: 'blur(14px)' }}>
        <button
          type="button"
          onClick={onBack}
          className="btn h-11 px-5 rounded-xl text-[12px] font-semibold transition-all hover:brightness-110"
          style={{ color: '#ff8f8f', background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.35)' }}
        >
          Отмена
        </button>
        <button
          type="submit"
          className="btn h-11 px-6 rounded-xl text-[13px] font-semibold justify-center gap-2 transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.99]"
          style={{
            background: 'linear-gradient(135deg, #22c55e, #15803d)',
            color: '#fff',
            boxShadow: '0 4px 22px rgba(34,197,94,0.45), inset 0 1px 0 rgba(255,255,255,0.2)',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Создать задачу
        </button>
      </div>
    </motion.form>
  )
}