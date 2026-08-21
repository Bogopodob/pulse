import { useRef, useEffect, useLayoutEffect, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dropdown } from '@heroui/react/dropdown'
import { useTasks, PROJECTS, type Task } from '../entities/tasks/useTasks'
import { isTauri } from '../entities/tasks/api'
import { useTeam } from '../entities/team/useTeam'

const BASE_HOUR_W = 160
const BASE_PX_MIN = BASE_HOUR_W / 60
const TARGET_SMALL_W = 260
const SMALL_MIN = 40
const MAX_SCALE = 260
const BUFFER_HOURS = 3
const VIS_GAP_MIN = 3
const MIN_TAG_W = 280
const MAX_TAG_TITLE = 20
const MAX_SMOOTH_PX = 240
const SMOOTH_FACTOR = 0.3
const SPEED_OPTIONS = [0.5, 1, 1.2, 1.5, 2]
const SPEED_KEY = 'pulse-gantt-scroll-speed'
const SUPPORTS_SCROLL_TIMELINE =
  typeof CSS !== 'undefined' && typeof ScrollTimeline === 'function' && typeof Element.prototype.animate === 'function'
const TODAY = new Date(2026, 7, 21)

const TASK_H = 58
const TASK_GAP = 16
const HEADER_H = 44
const MINI_H = 28

const DAYS_RU = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
const MONTHS_RU = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']


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

function isSameDay(a: Date, b: Date) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
}

function fmtDate(d: Date) {
  return `${DAYS_RU[d.getDay()]}, ${d.getDate()} ${MONTHS_RU[d.getMonth()]}`
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

function NavBtn({ dir, onClick }: { dir: 'prev' | 'next'; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      className="flex items-center justify-center size-[24px] rounded-md cursor-pointer shrink-0 transition-colors"
      style={{ color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      whileHover={{ color: '#fff', background: 'rgba(255,255,255,0.08)' }}
      onClick={onClick}
      title={dir === 'prev' ? 'Предыдущий день (←)' : 'Следующий день (→)'}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {dir === 'prev' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
      </svg>
    </motion.button>
  )
}

export function GanttTimeline({ onNewTask, onOpenTask }: { onNewTask: () => void; onOpenTask: (id: string) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)
  const scrollLeftRef = useRef(0)
  const miniWRef = useRef(1)
  const centeredRef = useRef(false)
  const rafRef = useRef(0)
  const scrollAnimRef = useRef<Animation | null>(null)
  const layoutRef = useRef({ offset: 0, mainW: 0, totalW: 0, viewportW: 0, prevDay: new Date(TODAY), nextDay: new Date(TODAY), currentDay: new Date(TODAY) })
  const [viewDay, setViewDay] = useState<Date>(new Date(TODAY))
  const [currentDay, setCurrentDay] = useState(new Date(TODAY))
  const [nowMinute, setNowMinute] = useState(() => new Date().getHours() * 60 + new Date().getMinutes())
  const [viewportW, setViewportW] = useState(0)
  const [hoverMin, setHoverMin] = useState<number | null>(null)
  const [hoverX, setHoverX] = useState(0)
  const { tasks, loadDay, updateTask, deleteTask, duplicateTask, extraProjects } = useTasks()
  const { team } = useTeam()
  const userById = useMemo(() => new Map(team.map((u) => [u.id, u])), [team])
  const [hiddenProjects, setHiddenProjects] = useState<Set<string>>(new Set())
  const pendingScrollMin = useRef<number | null>(null)
  const [ctxMenu, setCtxMenu] = useState<{ key: number; x: number; y: number; task: Task } | null>(null)
  const ctxAnchorRef = useRef<HTMLDivElement>(null)
  const [scrollSpeed, setScrollSpeed] = useState<number>(() => {
    try {
      const v = Number(localStorage.getItem(SPEED_KEY))
      if (SPEED_OPTIONS.includes(v)) return v
    } catch {
      /* ignore */
    }
    return isTauri() ? 1.5 : 1
  })
  const scrollSpeedRef = useRef(scrollSpeed)

  useEffect(() => {
    scrollSpeedRef.current = scrollSpeed
    try {
      localStorage.setItem(SPEED_KEY, String(scrollSpeed))
    } catch {
      /* ignore */
    }
  }, [scrollSpeed])

  const prevDay = useMemo(() => {
    const d = new Date(currentDay)
    d.setDate(d.getDate() - 1)
    return d
  }, [currentDay])
  const nextDay = useMemo(() => {
    const d = new Date(currentDay)
    d.setDate(d.getDate() + 1)
    return d
  }, [currentDay])

  useEffect(() => {
    void loadDay(currentDay).catch((e) => console.error('load day tasks failed:', e))
  }, [currentDay, loadDay])

  const tasksForDay = useCallback(
    (day: Date) =>
      tasks.filter((t) => {
        const sd = new Date(t.startDate)
        const ed = new Date(t.endDate)
        sd.setHours(0, 0, 0, 0)
        ed.setHours(0, 0, 0, 0)
        return day >= sd && day <= ed && t.tags.some((tag) => !hiddenProjects.has(tag))
      }),
    [tasks, hiddenProjects]
  )

  const hasPrevTasks = tasksForDay(prevDay).length > 0
  const hasNextTasks = tasksForDay(nextDay).length > 0

  const buildScale = useCallback(
    (day: Date, winStart: number, winLen: number) => {
    const winEnd = winStart + winLen

    const smalls: { l: number; r: number; dur: number }[] = []
    for (const t of tasksForDay(day)) {
      const l = isSameDay(day, t.startDate) ? t.startMinute : 0
      const r = isSameDay(day, t.endDate) ? t.endMinute : 24 * 60
      const cl = Math.max(l, winStart)
      const cr = Math.min(r, winEnd)
      if (cr <= cl) continue
      const dur = cr - cl
      if (dur < SMALL_MIN) smalls.push({ l: cl, r: cr, dur })
    }

    const xOf = (min: number) => Math.max(0, min - winStart) * BASE_PX_MIN
    if (smalls.length === 0) {
      return { xOf, width: winLen * BASE_PX_MIN, invert: (x: number) => winStart + x / BASE_PX_MIN, segs: [{ start: winStart, end: winEnd, pxPerMin: BASE_PX_MIN }] }
    }

    smalls.sort((a, b) => a.l - b.l)
    const groups: { l: number; r: number; members: { l: number; r: number; dur: number }[] }[] = []
    for (const s of smalls) {
      const last = groups[groups.length - 1]
      if (last && s.l <= last.r) {
        last.r = Math.max(last.r, s.r)
        last.members.push(s)
      } else {
        groups.push({ l: s.l, r: s.r, members: [s] })
      }
    }

    const segs: { start: number; end: number; pxPerMin: number }[] = []
    let cursor = winStart
    for (const g of groups) {
      if (g.l > cursor) segs.push({ start: cursor, end: g.l, pxPerMin: BASE_PX_MIN })
      const bounds = Array.from(new Set(g.members.flatMap((m) => [m.l, m.r]))).sort((a, b) => a - b)
      for (let bi = 0; bi < bounds.length - 1; bi++) {
        const a = bounds[bi]
        const b = bounds[bi + 1]
        let ppm = BASE_PX_MIN
        for (const m of g.members) {
          if (m.l <= a && m.r >= b) ppm = Math.max(ppm, Math.min(MAX_SCALE, TARGET_SMALL_W / m.dur))
        }
        segs.push({ start: a, end: b, pxPerMin: ppm })
      }
      cursor = g.r
    }
    if (cursor < winEnd) segs.push({ start: cursor, end: winEnd, pxPerMin: BASE_PX_MIN })

    const offsets: number[] = [0]
    for (let i = 0; i < segs.length; i++) offsets.push(offsets[i] + (segs[i].end - segs[i].start) * segs[i].pxPerMin)
    const width = offsets[offsets.length - 1]

    const xOfB = (min: number) => {
      const m = Math.max(winStart, Math.min(winEnd, min))
      let lo = 0
      let hi = segs.length - 1
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (segs[mid].end < m) lo = mid + 1
        else hi = mid
      }
      return offsets[lo] + (m - segs[lo].start) * segs[lo].pxPerMin
    }

    const invert = (x: number) => {
      let lo = 0
      let hi = segs.length - 1
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1
        if (offsets[mid] <= x) lo = mid
        else hi = mid - 1
      }
      return winStart + segs[lo].start + (x - offsets[lo]) / segs[lo].pxPerMin
    }

    return { xOf: xOfB, width, invert, segs }
  }, [tasksForDay])

  const mainScale = useMemo(() => buildScale(currentDay, 0, 24 * 60), [buildScale, currentDay])
  const prevScale = useMemo(() => buildScale(prevDay, hasPrevTasks ? 0 : (24 - BUFFER_HOURS) * 60, hasPrevTasks ? 24 * 60 : BUFFER_HOURS * 60), [buildScale, prevDay, hasPrevTasks])
  const nextScale = useMemo(() => buildScale(nextDay, 0, hasNextTasks ? 24 * 60 : BUFFER_HOURS * 60), [buildScale, nextDay, hasNextTasks])

  const mainW = mainScale.width
  const prevW = prevScale.width
  const nextW = nextScale.width
  const offset = prevW
  const totalW = prevW + mainW + nextW

  layoutRef.current = { offset, mainW, totalW, viewportW, prevDay, nextDay, currentDay }

  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date()
      setNowMinute(d.getHours() * 60 + d.getMinutes())
    }, 60000)
    return () => clearInterval(id)
  }, [])

  const centerXRef = useRef(0)
  centerXRef.current = offset + mainScale.xOf(8 * 60)

  const syncIndicator = useCallback(() => {
    const ind = indicatorRef.current
    if (!ind) return
    ind.style.transform = `translateX(${(scrollLeftRef.current / layoutRef.current.totalW) * miniWRef.current}px)`
  }, [])

  const updateViewDay = useCallback(() => {
    const L = layoutRef.current
    const start = scrollLeftRef.current
    const end = start + (L.viewportW || 0)
    const overlap = (rs: number, re: number) => Math.max(0, Math.min(re, end) - Math.max(rs, start))
    const ovPrev = overlap(0, L.offset)
    const ovMain = overlap(L.offset, L.offset + L.mainW)
    const ovNext = overlap(L.offset + L.mainW, L.totalW)
    const next = ovNext > ovMain && ovNext > ovPrev ? L.nextDay : ovPrev > ovMain && ovPrev > ovNext ? L.prevDay : L.currentDay
    setViewDay((prev) => (prev.getTime() === next.getTime() ? prev : next))
  }, [])

  const applyCenter = useCallback(() => {
    const el = scrollRef.current
    if (!el || el.clientWidth <= 0) return false
    el.scrollLeft = centerXRef.current - el.clientWidth / 2
    scrollLeftRef.current = el.scrollLeft
    if (!SUPPORTS_SCROLL_TIMELINE) syncIndicator()
    return true
  }, [syncIndicator])

  useEffect(() => {
    centeredRef.current = false
    applyCenter()
    updateViewDay()
  }, [currentDay, applyCenter, updateViewDay])

  useLayoutEffect(() => {
    const ind = indicatorRef.current
    if (!ind) return
    const p = ind.parentElement
    if (!p) return
    miniWRef.current = p.clientWidth
    const indW = (layoutRef.current.viewportW / layoutRef.current.totalW) * miniWRef.current
    const end = Math.max(0, miniWRef.current - indW)
    if (SUPPORTS_SCROLL_TIMELINE) {
      const el = scrollRef.current
      if (!el) return
      scrollAnimRef.current?.cancel()
      scrollAnimRef.current = ind.animate(
        [{ transform: 'translateX(0px)' }, { transform: `translateX(${end}px)` }],
        { timeline: new ScrollTimeline({ source: el, axis: 'inline' }), duration: 1, fill: 'both' }
      )
    } else {
      syncIndicator()
    }
  })

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const cw = el.clientWidth
      setViewportW(cw)
      if (cw > 0 && !centeredRef.current) applyCenter()
      updateViewDay()
    })
    ro.observe(el)
    setViewportW(el.clientWidth)
    return () => ro.disconnect()
  }, [applyCenter, updateViewDay])

  useLayoutEffect(() => {
    if (pendingScrollMin.current == null) return
    const min = pendingScrollMin.current
    pendingScrollMin.current = null
    const el = scrollRef.current
    if (!el || el.clientWidth <= 0) return
    el.scrollLeft = Math.max(0, offset + mainScale.xOf(min) - el.clientWidth * 0.25)
    scrollLeftRef.current = el.scrollLeft
    if (!SUPPORTS_SCROLL_TIMELINE) syncIndicator()
  }, [tasks, mainScale, offset, syncIndicator])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    scrollLeftRef.current = el.scrollLeft
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0
        updateViewDay()
      })
    }
  }, [updateViewDay])

  useEffect(() => {
    if (SUPPORTS_SCROLL_TIMELINE) return
    let raf = 0
    const tick = () => {
      const el = scrollRef.current
      if (el && el.scrollLeft !== scrollLeftRef.current) {
        scrollLeftRef.current = el.scrollLeft
        syncIndicator()
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [syncIndicator])

  const smoothTargetRef = useRef(0)
  const smoothRAFRef = useRef(0)

  const smoothTick = useCallback(() => {
    smoothRAFRef.current = 0
    const el = scrollRef.current
    if (!el) return
    const diff = smoothTargetRef.current - el.scrollLeft
    if (Math.abs(diff) < 0.5) return
    const step = Math.max(-MAX_SMOOTH_PX, Math.min(MAX_SMOOTH_PX, diff * SMOOTH_FACTOR))
    el.scrollLeft = el.scrollLeft + step
    scrollLeftRef.current = el.scrollLeft
    smoothRAFRef.current = requestAnimationFrame(smoothTick)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      const dx = e.deltaX
      const dy = e.deltaY
      const dxDominant = Math.abs(dx) > Math.abs(dy)
      if (!dxDominant && el.scrollHeight > el.clientHeight + 1) return
      e.preventDefault()
      const d = dxDominant ? dx : dy
      const mult = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientWidth : scrollSpeedRef.current
      const max = el.scrollWidth - el.clientWidth
      const base = smoothRAFRef.current ? smoothTargetRef.current : el.scrollLeft
      smoothTargetRef.current = Math.max(0, Math.min(max, base + d * mult))
      if (!smoothRAFRef.current) smoothRAFRef.current = requestAnimationFrame(smoothTick)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [smoothTick])

  const scrollToHour = useCallback((hour: number) => {
    const el = scrollRef.current
    if (!el) return
    const target = offset + mainScale.xOf(hour * 60) - el.clientWidth / 2
    el.scrollTo({ left: target, behavior: 'smooth' })
  }, [offset, mainScale])

  const handleMiniClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollRef.current
    if (!el) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    el.scrollTo({ left: ratio * totalW - el.clientWidth / 2, behavior: 'smooth' })
  }, [totalW])

  const handleTickHover = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const absX = e.clientX - rect.left
    const minute = mainScale.invert(absX - offset)
    if (minute >= -30 && minute <= 24 * 60 + 30) {
      setHoverMin(Math.round(Math.max(0, Math.min(24 * 60, minute))))
      setHoverX(absX)
    } else {
      setHoverMin(null)
    }
  }, [offset, mainScale])

  const handleTickLeave = useCallback(() => {
    setHoverMin(null)
  }, [])

  const openContextMenu = useCallback((e: React.MouseEvent, task: Task) => {
    e.preventDefault()
    setCtxMenu((prev) => ({ key: (prev?.key ?? 0) + 1, x: e.clientX, y: e.clientY, task }))
  }, [])

  const closeContextMenu = useCallback(() => {
    setCtxMenu(null)
  }, [])

  const handleCtxAction = useCallback(
    (actionKey: React.Key) => {
      const cur = ctxMenu
      setCtxMenu(null)
      if (!cur) return
      const { task } = cur
      if (actionKey === 'open' || actionKey === 'edit') {
        onOpenTask(task.id)
      } else if (actionKey === 'duplicate') {
        duplicateTask(task.id)
      } else if (actionKey === 'delete') {
        deleteTask(task.id)
      } else if (actionKey === 'done') {
        updateTask(task.id, { progress: task.progress >= 1 ? 0 : 1 })
      }
    },
    [ctxMenu, onOpenTask, duplicateTask, deleteTask, updateTask],
  )

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

  const viewToday = isSameDay(viewDay, TODAY)

  const dayRelName = (d: Date) => {
    if (isSameDay(d, TODAY)) return 'Сегодня'
    const tm = new Date(TODAY)
    tm.setDate(tm.getDate() + 1)
    if (isSameDay(d, tm)) return 'Завтра'
    const yd = new Date(TODAY)
    yd.setDate(yd.getDate() - 1)
    if (isSameDay(d, yd)) return 'Вчера'
    return `${d.getDate()} ${MONTHS_RU[d.getMonth()]}`
  }

  const toggleProject = (key: string) => {
    setHiddenProjects((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const hourSlots: { x: number; hour: number; isBuffer: boolean }[] = []
  const addHours = (scale: ReturnType<typeof buildScale>, xOffset: number, isBuffer: boolean) => {
    for (let h = 0; h < 24; h++) hourSlots.push({ x: xOffset + scale.xOf(h * 60), hour: h, isBuffer })
  }
  if (hasPrevTasks) {
    addHours(prevScale, 0, true)
  } else {
    for (let h = 24 - BUFFER_HOURS; h < 24; h++) hourSlots.push({ x: prevScale.xOf(h * 60), hour: h, isBuffer: true })
  }
  addHours(mainScale, offset, false)
  if (hasNextTasks) {
    addHours(nextScale, offset + mainW, true)
  } else {
    for (let h = 0; h < BUFFER_HOURS; h++) hourSlots.push({ x: offset + mainW + nextScale.xOf(h * 60), hour: h, isBuffer: true })
  }

  const minTicks: { x: number; isBuffer: boolean }[] = []
  const collectTicks = (scale: ReturnType<typeof buildScale>, xOffset: number, isBuffer: boolean) => {
    for (const seg of scale.segs) {
      if (seg.pxPerMin <= BASE_PX_MIN * 1.5) continue
      const step = Math.max(1, Math.round(40 / seg.pxPerMin))
      for (let m = Math.ceil(seg.start / step) * step; m < seg.end; m += step) {
        minTicks.push({ x: xOffset + scale.xOf(m), isBuffer })
      }
    }
  }
  collectTicks(prevScale, 0, true)
  collectTicks(mainScale, offset, false)
  collectTicks(nextScale, offset + mainW, true)

  const minLabels: { x: number; text: string; isBuffer: boolean }[] = []
  const collectLabels = (scale: ReturnType<typeof buildScale>, xOffset: number, isBuffer: boolean) => {
    for (const seg of scale.segs) {
      if (seg.pxPerMin <= BASE_PX_MIN * 1.5) continue
      const step = Math.max(5, Math.round(50 / seg.pxPerMin / 5) * 5)
      for (let m = Math.ceil(seg.start / step) * step; m < seg.end; m += step) {
        if (m % 60 === 0) continue
        minLabels.push({
          x: xOffset + scale.xOf(m),
          text: `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`,
          isBuffer,
        })
      }
    }
  }
  collectLabels(prevScale, 0, true)
  collectLabels(mainScale, offset, false)
  collectLabels(nextScale, offset + mainW, true)

  type RenderedTask = { task: Task; x: number; y: number; width: number; leftMin: number; rightMin: number; l0: number; r0: number; w0: number; w1: number; day: Date }

  const layoutDay = (day: Date, xOrigin: number, windowStartMin: number, windowLenMin: number, scale: ReturnType<typeof buildScale>): RenderedTask[] => {
    const windowEndMin = windowStartMin + windowLenMin
    const withBounds = tasksForDay(day)
      .map((t) => {
        const l = isSameDay(day, t.startDate) ? t.startMinute : 0
        const r = isSameDay(day, t.endDate) ? t.endMinute : 24 * 60
        const leftMin = Math.max(l, windowStartMin)
        const rightMin = Math.min(r, windowEndMin)
        return { task: t, l, r, leftMin, rightMin }
      })
      .filter((i) => i.rightMin > i.leftMin)
    withBounds.sort((a, b) => a.leftMin - b.leftMin)

    const rows: { end: number; items: typeof withBounds }[] = []
    for (const item of withBounds) {
      let placed = false
      for (let ri = 0; ri < rows.length; ri++) {
        if (rows[ri].end + VIS_GAP_MIN <= item.leftMin) {
          rows[ri].items.push(item)
          rows[ri].end = Math.max(rows[ri].end, item.rightMin)
          placed = true
          break
        }
      }
      if (!placed) rows.push({ end: item.rightMin, items: [item] })
    }

    const result: RenderedTask[] = []
    const regionRight = xOrigin + scale.width
    rows.forEach((row, ri) => {
      row.items.forEach((item) => {
        const x = xOrigin + scale.xOf(item.leftMin)
        const rawWidth = scale.xOf(item.rightMin) - scale.xOf(item.leftMin)
        result.push({
          task: item.task,
          x,
          y: HEADER_H + ri * (TASK_H + TASK_GAP),
          width: Math.min(rawWidth, regionRight - x),
          leftMin: item.leftMin,
          rightMin: item.rightMin,
          l0: item.l,
          r0: item.r,
          w0: windowStartMin,
          w1: windowEndMin,
          day,
        })
      })
    })
    return result
  }

  const mainDayTasks = layoutDay(currentDay, offset, 0, 24 * 60, mainScale)
  const prevDayTasks = layoutDay(prevDay, 0, hasPrevTasks ? 0 : (24 - BUFFER_HOURS) * 60, hasPrevTasks ? 24 * 60 : BUFFER_HOURS * 60, prevScale)
  const nextDayTasks = layoutDay(nextDay, offset + mainW, 0, hasNextTasks ? 24 * 60 : BUFFER_HOURS * 60, nextScale)

  const renderTasks = [...prevDayTasks, ...mainDayTasks, ...nextDayTasks]

  const allProjects = useMemo(
    () => ({ ...PROJECTS, ...extraProjects }) as Record<string, { label: string; color: string }>,
    [extraProjects]
  )

  const maxY = renderTasks.reduce((m, p) => Math.max(m, p.y + TASK_H), 0)
  const contentH = maxY > 0 ? maxY + TASK_GAP : '100%'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col min-h-0 min-w-0 relative"
    >
      <div className="absolute top-0 left-0 w-[40px] h-full z-[5] pointer-events-none" style={{ background: 'linear-gradient(90deg, var(--bg) 0%, transparent 100%)' }} />
      <div className="absolute top-0 right-0 w-[40px] h-full z-[5] pointer-events-none" style={{ background: 'linear-gradient(270deg, var(--bg) 0%, transparent 100%)' }} />

      <div className="flex items-center justify-between shrink-0 px-2 h-[34px] gap-2">
        <div className="flex items-center gap-1.5 shrink-0">
          <NavBtn dir="prev" onClick={goPrev} />
          <motion.button
            whileTap={{ scale: 0.94 }}
            className="flex items-center gap-1.5 h-[24px] px-2.5 rounded-md cursor-pointer text-[11px] font-semibold shrink-0 transition-colors"
            style={
              viewToday
                ? {
                    background: 'linear-gradient(135deg, var(--focus), var(--focus-2))',
                    color: '#0a0b0e',
                    boxShadow: '0 0 12px rgba(76,141,255,0.3)',
                  }
                : {
                    background: 'rgba(255,255,255,0.03)',
                    color: 'rgba(255,255,255,0.5)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }
            }
            whileHover={viewToday ? undefined : { background: 'rgba(255,255,255,0.08)', color: '#fff' }}
            onClick={goToday}
            title={viewToday ? 'К сегодняшнему дню (Home)' : 'Вернуться к сегодняшнему дню'}
          >
            <span
              className="size-[6px] rounded-full"
              style={viewToday ? { background: 'rgba(10,11,14,0.7)' } : { background: 'var(--focus)', boxShadow: '0 0 6px var(--focus)' }}
            />
            {dayRelName(viewDay)}
          </motion.button>
          <NavBtn dir="next" onClick={goNext} />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.94 }}
            onClick={onNewTask}
            title="Добавить задачу"
            className="flex items-center gap-1 h-[22px] px-2.5 rounded-full cursor-pointer transition-all text-[10px] font-semibold select-none hover:brightness-110"
            style={{ background: 'linear-gradient(135deg, var(--focus), var(--focus-2))', color: '#0a0b0e', border: 'none' }}
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Новая
          </motion.button>
          <div
            className="flex items-center gap-[2px] p-[2px] rounded-lg h-[24px] shrink-0"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            title="Скорость прокрутки"
          >
            {SPEED_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setScrollSpeed(s)}
                className="h-full px-2 rounded-md cursor-pointer text-[10px] font-semibold tabular-nums transition-colors"
                style={
                  scrollSpeed === s
                    ? { background: 'rgba(76,141,255,0.22)', color: 'var(--focus)' }
                    : { color: 'rgba(255,255,255,0.4)' }
                }
              >
                {s}×
              </button>
            ))}
          </div>
        </div>

        <div className="text-[12px] font-semibold tracking-[-0.01em] shrink-0 select-none" style={{ color: viewToday ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)' }}>
          {fmtDate(viewDay)}
        </div>

        <div className="flex items-center gap-1.5 justify-end shrink-0 min-w-0 flex-wrap">
          {Object.entries(allProjects).map(([key, p]) => {
            const hidden = hiddenProjects.has(key)
            return (
              <button
                key={key}
                onClick={() => toggleProject(key)}
                title={`${p.label} — ${hidden ? 'показать' : 'скрыть'}`}
                className={`flex items-center gap-1.5 h-[22px] px-2 rounded-full cursor-pointer transition-all text-[10px] font-semibold select-none ${hidden ? 'opacity-25' : ''}`}
                style={{ background: `${p.color}12`, color: hidden ? 'rgba(255,255,255,0.5)' : p.color, border: `1px solid ${p.color}30` }}
              >
                <span
                  className="size-[5px] rounded-full"
                  style={hidden ? { background: 'rgba(255,255,255,0.35)' } : { background: p.color, boxShadow: `0 0 6px ${p.color}` }}
                />
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

      {viewportW > 0 && (
        <div
          className="relative shrink-0 cursor-pointer mx-2 rounded-sm select-none"
          style={{ height: MINI_H, background: 'rgba(255,255,255,0.03)' }}
          onClick={handleMiniClick}
        >
          {hourSlots.map((s) => (
            <div
              key={`mt-${s.x}`}
              className="absolute top-0 rounded-full"
              style={{
                left: `${(s.x / totalW) * 100}%`,
                width: s.hour % 6 === 0 ? 1.5 : 0.5,
                height: s.hour % 6 === 0 ? MINI_H : 8,
                top: s.hour % 6 === 0 ? 0 : (MINI_H - 8) / 2,
                background: s.hour % 6 === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
                transform: 'translateX(-50%)',
              }}
            />
          ))}
          <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: `${(offset / totalW) * 100}%`, width: 1, background: 'rgba(255,255,255,0.1)' }} />
          <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: `${((offset + mainW) / totalW) * 100}%`, width: 1, background: 'rgba(255,255,255,0.1)' }} />
          <div
            ref={indicatorRef}
            className="absolute top-0 h-full rounded-sm pointer-events-none"
            style={{
              left: 0,
              width: `${(viewportW / totalW) * 100}%`,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.04)',
              willChange: 'transform',
            }}
          />
          {isToday && (
            <div
              className="absolute top-1/2 -translate-y-1/2 rounded-full pointer-events-none z-10"
              style={{ left: `${((offset + mainScale.xOf(nowMinute)) / totalW) * 100}%`, width: 5, height: 5, background: '#ff3b30', boxShadow: '0 0 8px rgba(255,59,48,0.8)' }}
            />
          )}
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-x-auto overflow-y-auto"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--surface-3) transparent',
          overscrollBehavior: 'none',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentDay.toISOString()}
            className="relative"
            style={{ width: totalW, minHeight: '100%', height: contentH }}
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="absolute top-0 left-0 right-0 z-[3] select-none" style={{ height: 14, contentVisibility: 'auto' }}>
              {hourSlots.map((s) => (
                <div
                  key={`hl-${s.x}`}
                  className="absolute cursor-pointer"
                  style={{ left: s.x, top: '50%', transform: 'translate(-50%, -50%)' }}
                  onClick={() => scrollToHour(s.hour)}
                >
                  <span className="text-[9.5px] font-semibold tabular-nums" style={{ color: s.isBuffer ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.3)' }}>
                    {String(s.hour).padStart(2, '0')}
                  </span>
                </div>
              ))}
            </div>

            <div
              className="absolute z-[1]"
              style={{ top: 16, left: 0, right: 0, height: 26, contentVisibility: 'auto' }}
              onMouseMove={handleTickHover}
              onMouseLeave={handleTickLeave}
            >
              {hourSlots.map((s) => {
                const isMajor = s.hour % 6 === 0
                return (
                  <div
                    key={`t-${s.x}`}
                    className="absolute bottom-0"
                    style={{
                      left: s.x,
                      width: isMajor ? 1.5 : 1,
                      height: isMajor ? 26 : 10,
                      background: s.isBuffer ? 'rgba(255,255,255,0.015)' : (isMajor ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)'),
                    }}
                  />
                )
              })}
              {minTicks.map((t) => (
                <div
                  key={`mt-${t.x}`}
                  className="absolute bottom-0"
                  style={{
                    left: t.x,
                    width: 0.5,
                    height: 6,
                    background: t.isBuffer ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.03)',
                  }}
                />
              ))}
              {minLabels.map((l) => (
                <div
                  key={`ml-${l.x}`}
                  className="absolute top-0 pointer-events-none select-none"
                  style={{ left: l.x, transform: 'translateX(-50%)' }}
                >
                  <span
                    className="text-[9.5px] font-medium tabular-nums leading-none"
                    style={{ color: l.isBuffer ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.45)' }}
                  >
                    {l.text}
                  </span>
                </div>
              ))}
              <div className="absolute bottom-0" style={{ left: totalW, width: 1, height: 10, background: 'rgba(255,255,255,0.03)' }} />
              <div className="absolute bottom-0 rounded-full" style={{ left: offset, width: 2, height: 26, transform: 'translateX(-1px)', background: 'rgba(255,255,255,0.18)' }} />
              <div className="absolute bottom-0 rounded-full" style={{ left: offset + mainW, width: 2, height: 26, transform: 'translateX(-1px)', background: 'rgba(255,255,255,0.18)' }} />
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

            <div className="absolute inset-y-0 z-[1] pointer-events-none" style={{ left: 0, width: prevW, background: 'linear-gradient(90deg, rgba(0,0,0,0.05), rgba(0,0,0,0.02) 60%, rgba(0,0,0,0.02))' }} />
            <div className="absolute inset-y-0 z-[1] pointer-events-none" style={{ left: offset + mainW, width: nextW, background: 'linear-gradient(270deg, rgba(0,0,0,0.05), rgba(0,0,0,0.02) 60%, rgba(0,0,0,0.02))' }} />

            <div className="absolute z-[3] pointer-events-none select-none flex items-center justify-center" style={{ left: 0, width: prevW, top: 0, height: 14, contentVisibility: 'auto' }}>
              <span className="text-[11px] font-semibold tracking-[0.02em]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {hasPrevTasks ? `← вчера · ${fmtDate(prevDay)}` : '← вчера'}
              </span>
            </div>
            <div className="absolute z-[3] pointer-events-none select-none flex items-center justify-center" style={{ left: offset + mainW, width: nextW, top: 0, height: 14, contentVisibility: 'auto' }}>
              <span className="text-[11px] font-semibold tracking-[0.02em]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {hasNextTasks ? `завтра · ${fmtDate(nextDay)} →` : 'завтра →'}
              </span>
            </div>

            {isToday && (
              <div className="absolute top-0 bottom-0 pointer-events-none z-10" style={{ left: offset + mainScale.xOf(nowMinute) }}>
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

            <div className="absolute z-[1] pointer-events-none" style={{ top: 0, left: 0, width: totalW, contentVisibility: 'auto' }}>
              {Array.from(new Set(renderTasks.map((p) => p.y))).map((y) => (
                <div key={`reel-${y}`} className="absolute left-0 w-full" style={{
                  top: y + TASK_H / 2,
                  height: 1,
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.025) 10%, rgba(255,255,255,0.025) 90%, transparent 100%)',
                }} />
              ))}
            </div>

            {renderTasks.map((p, idx) => {
              const { task } = p
              const leftMin = p.leftMin
              const rightMin = p.rightMin
              const left = p.x
              const width = p.width
              const top = p.y
              const cc = C[idx % C.length]
              const showTags = width >= MIN_TAG_W && task.title.length <= MAX_TAG_TITLE
              const maxFit = width >= 520 ? 3 : width >= 380 ? 2 : 1
              const tagsShown = showTags ? task.tags.slice(0, maxFit) : []

              const startsBefore = p.leftMin === p.l0 && p.day > task.startDate
              const endsAfter = p.rightMin === p.r0 && p.day < task.endDate

              const connectLeft = startsBefore
              const connectRight = endsAfter
              const atLeftEdge = p.leftMin === p.w0
              const atRightEdge = p.rightMin === p.w1
              const insetL = atLeftEdge && !connectLeft ? 7 : 0
              const insetR = atRightEdge && !connectRight ? 7 : 0
              const radiusL = connectLeft ? 0 : 12
              const radiusR = connectRight ? 0 : 12

              return (
                <motion.div
                  key={`${p.day.toISOString()}-${task.id}`}
                  custom={idx}
                  variants={cardVariants}
                  className="absolute group cursor-pointer select-none flex flex-col"
                  style={{ left: left + insetL, top, width: width - insetL - insetR, height: TASK_H, padding: '10px 14px 10px 14px', contentVisibility: 'auto' }}
                  onContextMenu={(e) => openContextMenu(e, task)}
                >
                  <motion.div
                    className="absolute inset-0"
                    style={{
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderLeftWidth: connectLeft ? 0 : 1,
                      borderRightWidth: connectRight ? 0 : 1,
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: `${radiusL}px ${radiusR}px ${radiusR}px ${radiusL}px`,
                    }}
                    whileHover={{
                      y: -2,
                      borderColor: 'rgba(255,255,255,0.15)',
                      borderLeftColor: connectLeft ? 'transparent' : 'rgba(255,255,255,0.15)',
                      borderRightColor: connectRight ? 'transparent' : 'rgba(255,255,255,0.15)',
                      background: 'rgba(255,255,255,0.07)',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
                      transition: { type: 'spring' as const, stiffness: 350, damping: 14 },
                    }}
                  />

                  <div className="flex items-center gap-2 relative z-[1] min-h-0 shrink-0 min-w-0">
                    <div className="rounded-full shrink-0" style={{ width: 6, height: 6, background: cc.base, opacity: 0.7 }} />
                    <span className="text-[13px] font-medium text-[var(--text)] leading-tight truncate tracking-[-0.01em]">
                      {task.title}
                    </span>
                    {tagsShown.map((tagKey, ti) => {
                      const p = allProjects[tagKey] ?? { label: tagKey, color: '#8b93a5' }
                      return (
                        <span
                          key={ti}
                          className="shrink-0 rounded-full px-1.5 py-px text-[8.5px] font-semibold leading-none tracking-[-0.01em] select-none"
                          style={{ color: p.color, background: `${p.color}1a`, border: `1px solid ${p.color}30` }}
                        >
                          {p.label}
                        </span>
                      )
                    })}
                    {task.responsible && userById.get(task.responsible) && (
                      <span
                        title={`Ответственный: ${userById.get(task.responsible)!.name}`}
                        className="shrink-0 rounded-full px-1.5 py-px text-[8.5px] font-semibold leading-none tracking-[-0.01em] select-none"
                        style={{ color: '#ffd166', background: 'rgba(255,209,102,0.12)', border: '1px solid rgba(255,209,102,0.35)' }}
                      >
                        ★ {userById.get(task.responsible)!.initials}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 relative z-[1] mt-auto min-w-0" style={{ paddingTop: 4 }}>
                    {startsBefore ? (
                      <span className="text-[10px] font-medium truncate min-w-0" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {fmtRange(task.startDate, task.endDate)}
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {fmtExact(leftMin)}–{fmtExact(rightMin)}
                      </span>
                    )}
                    {endsAfter && (
                      <span className="text-[10px] font-medium shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        → {fmtRange(task.startDate, task.endDate)}
                      </span>
                    )}
                    <span className="text-[10.5px] font-semibold tabular-nums shrink-0" style={{ color: cc.base, opacity: 0.6 }}>
                      {Math.round(task.progress * 100)}%
                    </span>
                    {task.assignees.length > 0 && (
                      <span className="flex items-center shrink-0 ml-auto">
                        {task.assignees.slice(0, 3).map((aid) => {
                          const u = userById.get(aid)
                          if (!u) return null
                          return (
                            <span
                              key={aid}
                              title={u.name}
                              className="w-[14px] h-[14px] rounded-full flex items-center justify-center text-[7px] font-bold leading-none"
                              style={{ background: u.color, color: '#0a0b0e', marginLeft: -3, border: '1px solid rgba(255,255,255,0.2)' }}
                            >
                              {u.initials}
                            </span>
                          )
                        })}
                        {task.assignees.length > 3 && (
                          <span
                            className="w-[14px] h-[14px] rounded-full flex items-center justify-center text-[7px] font-semibold leading-none ml-[-3px]"
                            style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.2)' }}
                          >
                            +{task.assignees.length - 3}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      <div
        ref={ctxAnchorRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: 1,
          height: 1,
          pointerEvents: 'none',
          transform: ctxMenu ? `translate(${ctxMenu.x}px, ${ctxMenu.y}px)` : 'translate(-400px, -400px)',
        }}
      />

      <Dropdown.Root isOpen={ctxMenu !== null} onOpenChange={closeContextMenu}>
        <Dropdown.Popover key={ctxMenu?.key} triggerRef={ctxAnchorRef} placement="right top" offset={4}>
          <Dropdown.Menu className="min-w-[200px] max-w-[280px]" onAction={handleCtxAction}>
            <Dropdown.Item
              id="header"
              isDisabled
              style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.6, fontSize: 11, fontWeight: 600 }}
            >
              {ctxMenu?.task.title}
            </Dropdown.Item>
            <Dropdown.Item id="open">Открыть</Dropdown.Item>
            <Dropdown.Item id="edit">Редактировать</Dropdown.Item>
            <Dropdown.Item id="duplicate">Дублировать</Dropdown.Item>
            <Dropdown.Item id="done">{ctxMenu && ctxMenu.task.progress >= 1 ? 'Снять выполнение' : 'Отметить выполненной'}</Dropdown.Item>
            <Dropdown.Item id="delete" style={{ color: '#ff6b8a' }}>
              Удалить
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown.Root>
    </motion.div>
  )
}
