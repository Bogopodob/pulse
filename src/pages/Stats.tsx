import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { AreaChart } from '../shared/ui/charts/area-chart'
import { Area } from '../shared/ui/charts/area'
import { Grid } from '../shared/ui/charts/grid'
import { XAxis } from '../shared/ui/charts/x-axis'
import { ChartTooltip } from '../shared/ui/charts/tooltip/chart-tooltip'
import type { TooltipRow } from '../shared/ui/charts/tooltip/tooltip-content'
import { BarChart } from '../shared/ui/charts/bar-chart'
import { Bar } from '../shared/ui/charts/bar'
import { BarXAxis } from '../shared/ui/charts/bar-x-axis'
import { BarYAxis } from '../shared/ui/charts/bar-y-axis'
import { PieChart } from '../shared/ui/charts/pie-chart'
import { PieSlice } from '../shared/ui/charts/pie-slice'
import { PieCenter } from '../shared/ui/charts/pie-center'
import { RingChart } from '../shared/ui/charts/ring-chart'
import { Ring } from '../shared/ui/charts/ring'
import { RingCenter } from '../shared/ui/charts/ring-center'
import { ACCENTS, DEFAULT_RULES } from '../entities/rhythm/activities'
import { useSettings } from '../shared/hooks/useSettings'
import { useTemplates, dateKeyOf } from '../entities/templates/useTemplates'
import { CalendarDate } from '@internationalized/date'
import { DatePicker } from '@heroui/react/date-picker'
import { Calendar } from '@heroui/react/calendar'
import { useTasks } from '../entities/tasks/useTasks'
import { apiListTasks, isTauri } from '../entities/tasks/api'
import type { Task } from '../entities/tasks/useTasks'

type Period = 'day' | 'week' | 'month' | 'year' | 'custom'

const PERIODS: { key: Period; label: string }[] = [
  { key: 'day', label: 'День' },
  { key: 'week', label: 'Неделя' },
  { key: 'month', label: 'Месяц' },
  { key: 'year', label: 'Год' },
  { key: 'custom', label: 'Свой период' },
]

const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const MONTHS_SHORT = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']

const C_FOCUS = '#4c8dff'
const C_REST = '#ff9d5c'
const C_FOOD = '#4fd4c4'
const C_OTHER = '#a78bfa'
const C_OFF = '#4a4d55'



function fmtDur(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (h === 0) return `${m} мин`
  return m === 0 ? `${h} ч` : `${h} ч ${m} мин`
}

function fmtHM(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dayKey(d: Date): string {
  return dateKeyOf(d)
}

// Реальные задачи → daily фокус (сумма длительностей с учётом прогресса, фильтр по дате)
function buildDailyFromTasks(tasks: Task[], from: Date, to: Date): { date: Date; minutes: number }[] {
  const byDay = new Map<string, number>()
  for (const t of tasks) {
    // распределяем задачу по дням периода (для многодневных — пропорционально)
    const s = new Date(t.startDate)
    const e = new Date(t.endDate)
    const sKey = dayKey(s)
    const eKey = dayKey(e)
    const dur = Math.max(1, t.endMinute - t.startMinute)
    const weighted = Math.round(dur * Math.max(0.1, t.progress || 0.5))
    if (sKey === eKey) {
      byDay.set(sKey, (byDay.get(sKey) ?? 0) + weighted)
    } else {
      // многодневная — делим поровну (упрощённо)
      const start = new Date(s.getFullYear(), s.getMonth(), s.getDate())
      const end = new Date(e.getFullYear(), e.getMonth(), e.getDate())
      const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1)
      const perDay = Math.round(weighted / days)
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const k = dayKey(d)
        byDay.set(k, (byDay.get(k) ?? 0) + perDay)
      }
    }
  }
  const out: { date: Date; minutes: number }[] = []
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const k = dayKey(d)
    out.push({ date: new Date(d), minutes: byDay.get(k) ?? 0 })
  }
  return out
}

function buildHourlyFromTasks(tasks: Task[], day: Date): { label: string; minutes: number }[] {
  const buckets = new Array(13).fill(0) // 09:00-21:00 как в HOUR_CURVE
  for (const t of tasks) {
    if (!isSameDay(t.startDate, day)) continue
    const h = t.startDate.getHours()
    const idx = h - 9
    if (idx >= 0 && idx < 13) buckets[idx] += Math.max(1, t.endMinute - t.startMinute) * Math.max(0.3, t.progress || 0.5)
  }
  return buckets.map((v, i) => ({ label: `${String(9 + i).padStart(2, '0')}:00`, minutes: Math.round(v) }))
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
}

function aggregateWeekdays(daily: { date: Date; minutes: number }[]) {
  const sums = new Array(7).fill(0)
  const counts = new Array(7).fill(0)
  for (const d of daily) {
    const wd = (d.date.getDay() + 6) % 7
    sums[wd] += d.minutes
    counts[wd] += 1
  }
  return WEEKDAYS_SHORT.map((label, i) => ({
    label,
    minutes: Math.round(sums[i] / Math.max(1, counts[i])),
  }))
}

// @ts-ignore - kept for fallback
function rulesWithTimes(_chainStart: number) {
  let t = _chainStart
  return DEFAULT_RULES.map((r) => {
    const start = t
    t += r.minutes
    return { ...r, start, end: t }
  })
}
function rulesWithTimesFor(rules: { id: string; name: string; minutes: number; color: string }[], chainStart: number) {
  let t = chainStart
  return rules.map((r) => {
    const start = t
    t += r.minutes
    return { ...r, start, end: t }
  })
}
void rulesWithTimes

function heatColor(minutes: number): string {
  if (minutes === 0) return 'var(--surface-3)'
  if (minutes < 120) return 'rgba(76,141,255,0.25)'
  if (minutes < 240) return 'rgba(76,141,255,0.45)'
  if (minutes < 360) return 'rgba(76,141,255,0.7)'
  return '#4c8dff'
}

function HeatmapCard({
  daily,
  title,
  sub,
}: {
  daily: { date: Date; minutes: number }[]
  title: string
  sub: string
}) {
  const { weeks, grid, monthCols } = useMemo(() => {
    if (daily.length === 0) {
      return { weeks: 0, grid: [] as { date: Date; minutes: number }[][], monthCols: [] as { col: number; label: string }[] }
    }
    const byDate = new Map(daily.map((d) => [isoDate(d.date), d.minutes]))
    const start = new Date(daily[0].date)
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
    const last = daily[daily.length - 1].date
    const totalDays = Math.round((last.getTime() - start.getTime()) / 86400000) + 1
    const cells: { date: Date; minutes: number }[] = []
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      cells.push({ date: d, minutes: byDate.get(isoDate(d)) ?? 0 })
    }
    const weeksCount = Math.ceil(cells.length / 7)
    const gridData: { date: Date; minutes: number }[][] = Array.from(
      { length: 7 },
      (_, row) =>
        Array.from({ length: weeksCount }, (_, col) => cells[col * 7 + row]).filter(
          (c): c is { date: Date; minutes: number } => c !== undefined,
        ),
    )
    const cols: { col: number; label: string }[] = []
    let lastMonth = -1
    for (let c = 0; c < weeksCount; c++) {
      const m = gridData[0][c]?.date.getMonth() ?? -1
      if (m !== lastMonth) {
        cols.push({ col: c, label: MONTHS_SHORT[m] })
        lastMonth = m
      }
    }
    return { weeks: weeksCount, grid: gridData, monthCols: cols }
  }, [daily])

  const active = useMemo(() => daily.reduce((s, d) => s + d.minutes, 0), [daily])

  if (weeks === 0) return null

  return (
    <div className="card card-lift p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-[var(--font-display)] text-[15.5px] font-semibold">{title}</h3>
        <span className="text-[11px] text-[var(--text-faint)] font-mono">{sub} · {fmtDur(active)}</span>
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="min-w-max">
          <div className="relative h-[15px] mb-[5px]">
            {monthCols.map((mc) => (
              <div
                key={mc.col}
                className="absolute text-[9.5px] uppercase tracking-wide text-[var(--text-faint)]"
                style={{ left: mc.col * 14 }}
              >
                {mc.label}
              </div>
            ))}
          </div>
          <div className="flex gap-[3px]">
            {Array.from({ length: weeks }, (_, c) => (
              <div key={c} className="flex flex-col gap-[3px]">
                {Array.from({ length: 7 }, (_, r) => {
                  const cell = grid[r][c]
                  if (!cell) return <div key={r} className="size-[11px] rounded-[3px] bg-[var(--surface-3)]" />
                  return (
                    <div
                      key={r}
                      title={`${cell.date.getDate()} ${MONTHS_SHORT[cell.date.getMonth()]} — ${cell.minutes === 0 ? 'нет фокуса' : fmtDur(cell.minutes)}`}
                      className="size-[11px] rounded-[3px]"
                      style={{
                        background: heatColor(cell.minutes),
                        boxShadow: cell.minutes >= 360 ? '0 0 6px rgba(76,141,255,0.6)' : undefined,
                      }}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-1.5 mt-2 text-[10px] text-[var(--text-faint)]">
        меньше
        {[0, 119, 239, 359, 500].map((v) => (
          <span key={v} className="size-[9px] rounded-[2px]" style={{ background: heatColor(v) }} />
        ))}
        больше
      </div>
    </div>
  )
}

function TopDaysCard({
  daily,
  goal,
}: {
  daily: { date: Date; minutes: number }[]
  goal: number
}) {
  const top = useMemo(() => [...daily].sort((a, b) => b.minutes - a.minutes).slice(0, 5), [daily])
  const max = top[0]?.minutes ?? 1
  const weekday = (d: Date) => WEEKDAYS_SHORT[(d.getDay() + 6) % 7]
  const date = (d: Date) => `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`

  return (
    <div className="card card-lift p-6 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-[var(--font-display)] text-[15.5px] font-semibold">Лучшие дни</h3>
        <span className="text-[11px] text-[var(--text-faint)] font-mono">топ-5</span>
      </div>
      <div className="flex flex-col gap-2.5 flex-1 justify-center">
        {top.map((d, i) => (
          <div key={isoDate(d.date)} className="flex items-center gap-3">
            <span
              className="font-mono text-[11px] font-bold w-[16px] text-right tabular-nums"
              style={{
                color: i === 0 ? '#ffd76a' : i === 1 ? '#b8c4d4' : i === 2 ? '#d08a5a' : 'var(--text-faint)',
                textShadow: i === 0 ? '0 0 8px rgba(255,215,106,0.5)' : undefined,
              }}
            >
              {i + 1}
            </span>
            <span className="text-[12px] w-[42px] text-[var(--text-dim)]">{weekday(d.date)}</span>
            <div className="flex-1 h-[6px] rounded-full bg-[var(--surface-3)] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(4, (d.minutes / max) * 100)}%`,
                  background: `linear-gradient(90deg, rgba(76,141,255,0.5), ${d.minutes >= goal ? '#4fd4c4' : '#4c8dff'})`,
                  boxShadow: `0 0 8px rgba(76,141,255,0.35)`,
                }}
              />
            </div>
            <span className="font-mono text-[11px] font-semibold tabular-nums w-[44px] text-right" style={{ color: d.minutes >= goal ? C_FOOD : C_FOCUS }}>
              {fmtDur(d.minutes)}
            </span>
            <span className="text-[10px] text-[var(--text-faint)] w-[58px] text-right">{date(d.date)}</span>
          </div>
        ))}
      </div>
      <div className="text-[11px] text-[var(--text-faint)] mt-3">
        {daily.filter((d) => d.minutes >= goal).length} дн за период достигли цели
      </div>
    </div>
  )
}

function GoalProgressCard({ avg, goal }: { avg: number; goal: number }) {
  const pct = Math.min(100, Math.round((avg / goal) * 100))
  return (
    <div className="card card-lift p-6 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-[var(--font-display)] text-[15.5px] font-semibold">Прогресс к цели</h3>
        <span className="text-[11px] text-[var(--text-faint)] font-mono">цель · {fmtDur(goal)}</span>
      </div>
      <div className="flex-1 flex flex-col justify-center gap-3">
        <div className="flex items-baseline gap-2">
          <span
            className="font-[var(--font-display)] text-[40px] font-bold tabular-nums leading-none"
            style={{ color: pct >= 100 ? C_FOOD : C_FOCUS, textShadow: pct >= 100 ? '0 0 24px rgba(79,212,196,0.45)' : '0 0 24px rgba(76,141,255,0.35)' }}
          >
            {pct}%
          </span>
          <span className="text-[12px] text-[var(--text-dim)]">средний день — {fmtDur(avg)}</span>
        </div>
        <div className="h-[8px] rounded-full bg-[var(--surface-3)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.max(2, pct)}%`,
              background: pct >= 100
                ? 'linear-gradient(90deg, #4c8dff, #4fd4c4)'
                : 'linear-gradient(90deg, rgba(76,141,255,0.4), #4c8dff)',
              boxShadow: `0 0 12px ${pct >= 100 ? 'rgba(79,212,196,0.5)' : 'rgba(76,141,255,0.4)'}`,
            }}
          />
        </div>
        <div className="text-[11px] text-[var(--text-faint)]">
          {pct >= 100
            ? `Цель превышена на ${fmtDur(avg - goal)} — отличный темп!`
            : `До цели в среднем не хватает ${fmtDur(goal - avg)}`}
        </div>
      </div>
    </div>
  )
}

export function Stats() {
  const [period, setPeriod] = useState<Period>('day')
  const [hoveredRing, setHoveredRing] = useState<number | null>(null)
  const today = useMemo(() => new Date(), [])
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29)
    return isoDate(d)
  })
  const [customTo, setCustomTo] = useState(() => isoDate(today))

  const { dailyGoalMin: settingsGoal, chainStartMin: settingsChainStart } = useSettings()
  const { activeTemplate } = useTemplates()
  const { tasks: allTasks } = useTasks()
  const goal =
    activeTemplate && !activeTemplate.inheritSettings && activeTemplate.dailyGoalMin != null
      ? activeTemplate.dailyGoalMin
      : settingsGoal
  const chainStartMin =
    activeTemplate && !activeTemplate.inheritSettings && activeTemplate.chainStartMin != null
      ? activeTemplate.chainStartMin
      : settingsChainStart

  // --- Реальные данные из БД (tasks) ---
  const [rangeTasks, setRangeTasks] = useState<Task[]>([])
  const [loadingRange, setLoadingRange] = useState(false)

  // диапазон дат для текущего периода
  const range = useMemo(() => {
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)
    let start: Date
    switch (period) {
      case 'day':
        start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        break
      case 'week': {
        const d = new Date(today)
        const day = (d.getDay() + 6) % 7
        d.setDate(d.getDate() - day)
        start = new Date(d.getFullYear(), d.getMonth(), d.getDate())
        break
      }
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth(), 1)
        break
      case 'year':
        start = new Date(today.getFullYear(), 0, 1)
        break
      case 'custom': {
        const f = new Date(`${customFrom}T00:00:00`)
        const t = new Date(`${customTo}T23:59:59`)
        if (Number.isNaN(f.getTime()) || Number.isNaN(t.getTime()) || t < f) return null
        start = f
        return { start: f, end: t }
      }
    }
    return { start, end }
  }, [period, today, customFrom, customTo])

  useEffect(() => {
    if (!range) return
    let cancelled = false
    setLoadingRange(true)
    const fetchForRange = async () => {
      try {
        let list: Task[] = []
        if (isTauri()) {
          const views = await apiListTasks({ start_after: range.start.getTime(), start_before: range.end.getTime() })
          const { toTask } = await import('../entities/tasks/api')
          list = views.map(toTask)
        } else {
          // браузер: фильтруем уже загруженные + localStorage
          const all = allTasks.length ? allTasks : (() => {
            try {
              const raw = localStorage.getItem('pulse-tasks')
              if (!raw) return []
              const arr = JSON.parse(raw) as { startDate: string; endDate: string; startMinute: number; endMinute: number; title: string; progress: number; tags: string[] }[]
              return arr.map((t) => ({ ...t, startDate: new Date(t.startDate), endDate: new Date(t.endDate) } as unknown as Task))
            } catch { return [] }
          })()
          list = all.filter((t) => t.startDate.getTime() <= range.end.getTime() && t.endDate.getTime() >= range.start.getTime())
        }
        if (!cancelled) setRangeTasks(list)
      } catch (e) {
        console.error('stats load failed', e)
        if (!cancelled) setRangeTasks([])
      } finally {
        if (!cancelled) setLoadingRange(false)
      }
    }
    void fetchForRange()
    return () => { cancelled = true }
  }, [range, allTasks])

  const pool = useMemo(() => {
    if (!range) return []
    return buildDailyFromTasks(rangeTasks, range.start, range.end)
  }, [rangeTasks, range])

  const hours = useMemo(() => {
    if (!range) return []
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    return buildHourlyFromTasks(rangeTasks, day)
  }, [rangeTasks, today])

  const day = useMemo(() => {
    if (rangeTasks.length === 0) return { focus: 0, break: 0, food: 0, off: 1440 }
    let focus = 0, brk = 0, food = 0
    for (const t of rangeTasks) {
      const dur = Math.max(1, t.endMinute - t.startMinute) * Math.max(0.2, t.progress || 0.5)
      const tag = t.tags[0] ?? 'report'
      if (['report', 'research', 'design', 'backend'].includes(tag)) focus += dur
      else if (['break', 'smoke', 'rest', 'ritual'].includes(tag)) brk += dur
      else if (['lunch', 'breakfast', 'dinner'].includes(tag)) food += dur
      else focus += dur
    }
    const total = focus + brk + food
    const off = Math.max(0, 1440 * Math.max(1, pool.length) - total)
    const denom = Math.max(1, pool.length)
    return { focus: Math.round(focus / denom), break: Math.round(brk / denom), food: Math.round(food / denom), off: Math.round(off / denom) }
  }, [rangeTasks, pool])
  const dayRules = useMemo(() => {
    const tplRules = activeTemplate?.rules ?? []
    if (tplRules.length) return rulesWithTimesFor(tplRules, chainStartMin)
    return []
  }, [activeTemplate, chainStartMin])
  const rules = dayRules

  const activeDaily = pool // pool уже отфильтрован под выбранный период (day/week/month/year/custom)

  const yearMonthly = useMemo(() => {
    if (period !== 'year') return []
    return MONTHS_SHORT.map((label, mi) => {
      const days = activeDaily.filter((d) => d.date.getMonth() === mi)
      const avg = days.length ? Math.round(days.reduce((s, d) => s + d.minutes, 0) / days.length) : 0
      return { label, minutes: avg }
    }).filter((m) => m.minutes > 0)
  }, [period, activeDaily])

  const weekdayData = useMemo(
    () => (period === 'day' ? [] : aggregateWeekdays(activeDaily)),
    [period, activeDaily],
  )

  const stats = useMemo(() => {
    if (period === 'day') {
      const total = hours.reduce((s, h) => s + h.minutes, 0)
      const peak = hours.length ? hours.reduce((m, h) => (h.minutes > m.minutes ? h : m), hours[0]) : { minutes: 0, label: '—' }
      const avg = activeDaily.length ? Math.round(activeDaily.reduce((s, d) => s + d.minutes, 0) / activeDaily.length) : total
      return { total, avg, best: peak.minutes, bestLabel: peak.label }
    }
    const total = activeDaily.reduce((s, d) => s + d.minutes, 0)
    const avg = activeDaily.length ? Math.round(total / activeDaily.length) : 0
    const best = activeDaily.reduce((m, d) => Math.max(m, d.minutes), 0)
    let cur = 0
    let streak = 0
    for (const d of activeDaily) {
      cur = d.minutes >= 360 ? cur + 1 : 0
      streak = Math.max(streak, cur)
    }
    return { total, avg, best, streak, bestLabel: '' }
  }, [period, hours, pool, activeDaily])

  const pieData = useMemo(
    () => [
      { label: 'Фокус', value: day.focus, color: C_FOCUS },
      { label: 'Паузы', value: day.break, color: C_REST },
      { label: 'Еда', value: day.food, color: C_FOOD },
      { label: 'Вне графика', value: day.off, color: C_OFF },
    ],
    [day],
  )

  const ringData = useMemo(
    () => [
      { label: 'Фокус', value: day.focus, maxValue: goal, color: C_FOCUS },
      { label: 'Паузы', value: day.break, maxValue: 150, color: C_REST },
      { label: 'Еда', value: day.food, maxValue: 120, color: C_FOOD },
    ],
    [day],
  )

  const pills = useMemo(() => {
    if (period === 'day') {
      const pct = Math.round((stats.total / goal) * 100)
      return [
        { label: 'Фокус сегодня', value: fmtDur(stats.total), color: C_FOCUS, glow: '76,141,255' },
        { label: 'Цель дня', value: `${pct}% · ${fmtDur(goal)}`, color: C_FOOD, glow: '79,212,196' },
        { label: 'Пиковый час', value: stats.bestLabel, color: C_REST, glow: '255,157,92' },
        { label: 'В среднем за месяц', value: fmtDur(stats.avg), color: C_OTHER, glow: '167,139,250' },
      ]
    }
    const periodWord =
      period === 'week' ? 'неделю' : period === 'month' ? 'месяц' : period === 'year' ? 'год' : 'период'
    return [
      { label: `Фокус за ${periodWord}`, value: fmtDur(stats.total), color: C_FOCUS, glow: '76,141,255' },
      { label: 'В среднем за день', value: fmtDur(stats.avg), color: C_FOOD, glow: '79,212,196' },
      { label: 'Лучший день', value: fmtDur(stats.best), color: C_REST, glow: '255,157,92' },
      { label: 'Серия ≥ 6 ч', value: `${stats.streak} дн`, color: C_OTHER, glow: '167,139,250' },
    ]
  }, [period, stats])

  const focusRows = useCallback(
    (point: Record<string, unknown>): TooltipRow[] => [
      { color: 'var(--chart-line-primary)', label: 'Фокус', value: fmtDur(Number(point.minutes)) },
    ],
    [],
  )

  const barRows = useCallback(
    (point: Record<string, unknown>): TooltipRow[] => [
      { color: C_FOCUS, label: 'Фокус', value: fmtDur(Number(point.minutes)) },
    ],
    [],
  )

  const mainTitle =
    period === 'day'
      ? 'Фокус по часам'
      : period === 'week'
        ? 'Фокус за неделю'
        : period === 'month'
          ? 'Фокус за месяц'
          : period === 'year'
            ? 'Фокус по месяцам'
            : 'Фокус за период'

  const mainSub =
    period === 'day'
      ? 'сегодня'
      : period === 'year'
        ? 'среднее за день'
        : period === 'custom'
          ? `${customFrom.split('-').reverse().join('.')} — ${customTo.split('-').reverse().join('.')}`
          : `${fmtDur(stats.total)} всего`

  const mainIsBar = period === 'day' || period === 'year'
  const mainData = period === 'day' ? hours : period === 'year' ? yearMonthly : activeDaily

  return (
    <div className="w-full flex flex-col gap-5">
      {loadingRange && (
        <div className="flex items-center gap-2 text-[11px] text-[var(--text-faint)]">
          <span className="size-3 rounded-full border-2 border-[var(--text-faint)] border-t-transparent animate-spin" />
          Загрузка статистики из БД…
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5 p-1 rounded-xl border border-[var(--surface-3)] bg-[var(--surface-2)]/60">
          {PERIODS.map((p) => {
            const active = period === p.key
            return (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className="px-3.5 py-1.5 rounded-lg text-[12px] font-semibold border cursor-pointer transition-all"
                style={
                  active
                    ? {
                        background: 'rgba(76,141,255,0.15)',
                        color: 'var(--focus)',
                        borderColor: 'rgba(76,141,255,0.45)',
                        boxShadow: '0 0 16px rgba(76,141,255,0.22)',
                      }
                    : {
                        background: 'transparent',
                        color: 'var(--text-dim)',
                        borderColor: 'transparent',
                      }
                }
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = 'var(--text)'
                    e.currentTarget.style.borderColor = 'rgba(76,141,255,0.3)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = 'var(--text-dim)'
                    e.currentTarget.style.borderColor = 'transparent'
                  }
                }}
              >
                {p.label}
              </button>
            )
          })}
        </div>
        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <DatePicker.Root
              value={new CalendarDate(Number(customFrom.slice(0, 4)), Number(customFrom.slice(5, 7)), Number(customFrom.slice(8, 10)))}
              onChange={(d) => {
                if (d) setCustomFrom(isoDate(new Date(d.year, d.month - 1, d.day)))
              }}
              granularity="day"
            >
              <DatePicker.Trigger>{customFrom.split('-').reverse().join('.')}</DatePicker.Trigger>
              <DatePicker.Popover>
                <Calendar.Root>
                  <Calendar.Header>
                    <Calendar.NavButton slot="previous">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </Calendar.NavButton>
                    <Calendar.Heading />
                    <Calendar.NavButton slot="next">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </Calendar.NavButton>
                  </Calendar.Header>
                  <Calendar.Grid>
                    <Calendar.GridHeader>
                      {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
                    </Calendar.GridHeader>
                    <Calendar.GridBody>
                      {(date) => <Calendar.Cell date={date}>{date.day}</Calendar.Cell>}
                    </Calendar.GridBody>
                  </Calendar.Grid>
                </Calendar.Root>
              </DatePicker.Popover>
            </DatePicker.Root>
            <span className="text-[12px] text-[var(--text-faint)]">—</span>
            <DatePicker.Root
              value={new CalendarDate(Number(customTo.slice(0, 4)), Number(customTo.slice(5, 7)), Number(customTo.slice(8, 10)))}
              onChange={(d) => {
                if (d) setCustomTo(isoDate(new Date(d.year, d.month - 1, d.day)))
              }}
              granularity="day"
            >
              <DatePicker.Trigger>{customTo.split('-').reverse().join('.')}</DatePicker.Trigger>
              <DatePicker.Popover>
                <Calendar.Root>
                  <Calendar.Header>
                    <Calendar.NavButton slot="previous">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </Calendar.NavButton>
                    <Calendar.Heading />
                    <Calendar.NavButton slot="next">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </Calendar.NavButton>
                  </Calendar.Header>
                  <Calendar.Grid>
                    <Calendar.GridHeader>
                      {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
                    </Calendar.GridHeader>
                    <Calendar.GridBody>
                      {(date) => <Calendar.Cell date={date}>{date.day}</Calendar.Cell>}
                    </Calendar.GridBody>
                  </Calendar.Grid>
                </Calendar.Root>
              </DatePicker.Popover>
            </DatePicker.Root>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {pills.map((p, pi) => (
          <motion.div
            key={p.label}
            initial={{ opacity: 0, y: 18, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.07 * pi, type: 'spring', stiffness: 300, damping: 26 }}
            className="card card-lift relative overflow-hidden p-5"
          >
            <motion.div
              className="absolute -top-10 -right-10 w-36 h-36 rounded-full pointer-events-none"
              style={{ background: `radial-gradient(circle, rgba(${p.glow},0.14), transparent 70%)` }}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25 + 0.07 * pi, duration: 0.7, ease: 'easeOut' }}
            />
            <motion.span
              className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent pointer-events-none"
              initial={{ x: '-120%' }}
              animate={{ x: '950%' }}
              transition={{ delay: 0.55 + 0.09 * pi, duration: 0.7, ease: 'easeInOut' }}
            />
            <div className="text-[10.5px] uppercase tracking-[0.1em] font-semibold text-[var(--text-faint)]">{p.label}</div>
            <motion.div
              className="font-[var(--font-display)] text-[24px] font-semibold mt-2 tabular-nums"
              style={{ color: p.color }}
              initial={{ textShadow: `0 0 0px rgba(${p.glow},0)` }}
              animate={{ textShadow: `0 0 24px rgba(${p.glow},0.45)` }}
              transition={{ delay: 0.35 + 0.07 * pi, duration: 0.8, ease: 'easeOut' }}
            >
              {p.value}
            </motion.div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5">
        <div className="card card-lift p-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-[var(--font-display)] text-[15.5px] font-semibold">{mainTitle}</h3>
            <span className="text-[11px] text-[var(--text-faint)] font-mono">{mainSub}</span>
          </div>
          {mainData.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-[12px] text-[var(--text-faint)]">
              Выберите корректный диапазон дат
            </div>
          ) : mainIsBar ? (
            <BarChart data={mainData} xDataKey="label" aspectRatio="2.2 / 1">
              <Grid horizontal />
              <Bar dataKey="minutes" fill="var(--chart-line-primary)" lineCap="round" />
              <BarXAxis showAllLabels />
              <BarYAxis />
              <ChartTooltip rows={barRows} />
            </BarChart>
          ) : (
            <AreaChart data={mainData} xDataKey="date" aspectRatio="2.2 / 1" style={{ minHeight: 250 }}>
              <Grid horizontal />
              <Area dataKey="minutes" fill="var(--chart-line-primary)" fillOpacity={0.3} strokeWidth={2} />
              <XAxis numTicks={6} />
              <ChartTooltip rows={focusRows} />
            </AreaChart>
          )}
        </div>

        <div className="card card-lift p-6">
          <h3 className="font-[var(--font-display)] text-[15.5px] font-semibold">Из чего состоит день</h3>
          <div className="text-[11px] text-[var(--text-faint)] mb-1">
            {period === 'day' ? 'сегодня' : 'средний день за период'}
          </div>
          <div className="flex items-center justify-center py-3">
            <PieChart data={pieData} size={280} innerRadius={66} padAngle={0.02} cornerRadius={6}>
              <PieSlice index={0} hoverEffect="translate" />
              <PieSlice index={1} hoverEffect="translate" />
              <PieSlice index={2} hoverEffect="translate" />
              <PieSlice index={3} hoverEffect="translate" />
              <PieCenter>
                {({ value, label, data: active }) => (
                  <div className="text-center select-none">
                    <div className="font-[var(--font-display)] text-[26px] font-semibold tabular-nums" style={{ color: active?.color ?? 'var(--text)' }}>
                      {fmtDur(value)}
                    </div>
                    <div className="text-[10.5px] uppercase tracking-[0.1em] text-[var(--text-faint)] font-semibold mt-0.5">
                      {label || 'день'}
                    </div>
                  </div>
                )}
              </PieCenter>
            </PieChart>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
            {pieData.map((p) => (
              <span key={p.label} className="flex items-center gap-1.5 text-[11px] text-[var(--text-dim)]">
                <span className="size-[7px] rounded-full" style={{ background: p.color, boxShadow: `0 0 6px ${p.color}` }} />
                {p.label}
                <span className="font-mono font-semibold" style={{ color: p.color }}>{fmtDur(p.value)}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {period === 'day' ? (
          <div className="card card-lift p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-[var(--font-display)] text-[15.5px] font-semibold">План дня</h3>
              <span className="text-[11px] text-[var(--text-faint)] font-mono">блоки расписания</span>
            </div>
            <div className="flex flex-col gap-2">
              {rules.map((r, ri) => {
                const acc = ACCENTS[r.color as keyof typeof ACCENTS] ?? ACCENTS.blue
                const pct = Math.round((r.minutes / goal) * 100)
                const glow = `rgb(${acc.glow})`
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * ri, duration: 0.38, ease: [0.32, 0.72, 0, 1] }}
                    className="group relative flex items-center gap-3 rounded-lg px-2 py-1 -mx-2 cursor-default transition-colors duration-200 hover:bg-white/[0.04]"
                  >
                    <span
                      className="size-2 rounded-full shrink-0 transition-transform duration-200 group-hover:scale-150"
                      style={{ background: glow, boxShadow: `0 0 6px ${glow}` }}
                    />
                    <span className="text-[12px] text-[var(--text)] w-[110px] truncate shrink-0">{r.name}</span>
                    <div className="flex-1 h-[6px] rounded-full bg-[var(--surface-3)] overflow-hidden">
                      <motion.div
                        className="relative h-full rounded-full overflow-hidden"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, pct)}%` }}
                        transition={{ delay: 0.3 + 0.07 * ri, duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
                        style={{ background: glow, boxShadow: `0 0 8px ${glow}aa` }}
                      >
                        <motion.span
                          className="absolute inset-y-0 w-10 bg-gradient-to-r from-transparent via-white/45 to-transparent"
                          initial={{ x: '-120%' }}
                          animate={{ x: '900%' }}
                          transition={{ delay: 1.15 + 0.09 * ri, duration: 0.65, ease: 'easeInOut' }}
                        />
                      </motion.div>
                    </div>
                    <span className="font-mono text-[11px] text-[var(--text-dim)] tabular-nums w-[86px] text-right shrink-0 transition-colors duration-200 group-hover:text-[var(--text)]">
                      {fmtHM(r.start)}–{fmtHM(r.end)}
                    </span>
                    <span
                      className="font-mono text-[11px] font-semibold tabular-nums w-[44px] text-right shrink-0 transition-all duration-200 group-hover:brightness-125"
                      style={{ color: glow }}
                    >
                      {r.minutes}м
                    </span>
                  </motion.div>
                )
              })}
            </div>
            <div className="text-[11px] text-[var(--text-faint)] mt-4">
              Длина блока в % от цели дня ({fmtDur(goal)})
            </div>
          </div>
        ) : (
          <div className="card card-lift p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-[var(--font-display)] text-[15.5px] font-semibold">Фокус по дням недели</h3>
              <span className="text-[11px] text-[var(--text-faint)] font-mono">среднее</span>
            </div>
            <BarChart data={weekdayData} xDataKey="label" aspectRatio="2 / 1">
              <Grid horizontal />
              <Bar dataKey="minutes" fill="var(--chart-line-primary)" lineCap="round" />
              <BarXAxis />
              <BarYAxis />
              <ChartTooltip rows={barRows} />
            </BarChart>
          </div>
        )}

        <div className="card card-lift p-6 flex flex-col">
          <h3 className="font-[var(--font-display)] text-[15.5px] font-semibold">Цели дня</h3>
          <div className="flex items-center justify-center flex-1 gap-8 py-4">
            <RingChart data={ringData} size={260} hoveredIndex={hoveredRing} onHoverChange={setHoveredRing}>
              <Ring index={0} showGlow />
              <Ring index={1} showGlow />
              <Ring index={2} showGlow />
              <RingCenter>
                {({ value, label, data: active }) => (
                  <div className="text-center select-none">
                    <div className="font-[var(--font-display)] text-[26px] font-semibold tabular-nums" style={{ color: active?.color ?? 'var(--text)' }}>
                      {fmtDur(value)}
                    </div>
                    <div className="text-[10.5px] uppercase tracking-[0.1em] text-[var(--text-faint)] font-semibold mt-0.5">
                      {label || 'Фокус'}
                    </div>
                  </div>
                )}
              </RingCenter>
            </RingChart>
            <div className="flex flex-col gap-1 min-w-0">
              {ringData.map((r, ri) => {
                const pct = Math.min(100, Math.round((r.value / r.maxValue) * 100))
                const hot = hoveredRing === ri
                return (
                  <motion.div
                    key={r.label}
                    onMouseEnter={() => setHoveredRing(ri)}
                    onMouseLeave={() => setHoveredRing(null)}
                    animate={{
                      backgroundColor: hot ? `${r.color}14` : 'rgba(255,255,255,0)',
                      scale: hot ? 1.03 : 1,
                    }}
                    transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                    className="relative flex items-center gap-2.5 rounded-xl px-2 py-1.5 -mx-2 cursor-default"
                  >
                    <motion.span
                      className="w-[7px] h-[7px] rounded-full shrink-0"
                      style={{ background: r.color }}
                      animate={{
                        scale: hot ? 1.5 : 1,
                        boxShadow: hot ? `0 0 14px ${r.color}, 0 0 4px ${r.color}` : `0 0 6px ${r.color}66`,
                      }}
                      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                    />
                    <div
                      className="w-[78px] shrink-0 truncate text-[11px] transition-colors duration-200"
                      style={{ color: hot ? 'var(--text)' : 'var(--text-dim)' }}
                      title={r.label}
                    >
                      {r.label}
                    </div>
                    <div className="flex-1" />
                    <motion.div
                      className="w-[40px] shrink-0 text-right font-mono text-[11px] font-semibold tabular-nums"
                      style={{ color: pct >= 100 ? r.color : 'var(--text-faint)' }}
                      animate={hot ? { textShadow: [`0 0 0px ${r.color}00`, `0 0 10px ${r.color}`, `0 0 5px ${r.color}`] } : { textShadow: '0 0 0px transparent' }}
                      transition={hot ? { duration: 0.9, repeat: Infinity } : { duration: 0.2 }}
                    >
                      {pct}%
                    </motion.div>
                    <motion.span
                      className="w-[74px] shrink-0 text-right font-mono text-[11px] font-semibold tabular-nums"
                      style={{ color: r.color }}
                      animate={{ textShadow: hot ? `0 0 12px ${r.color}cc` : '0 0 0px rgba(0,0,0,0)' }}
                      transition={{ duration: 0.25 }}
                    >
                      {fmtDur(r.value)}
                    </motion.span>
                    <span className="w-[82px] shrink-0 text-left font-mono text-[11px] font-normal tabular-nums text-[var(--text-faint)] transition-colors duration-200" style={{ color: hot ? 'var(--text-dim)' : undefined }}>
                      / {fmtDur(r.maxValue)}
                    </span>
                  </motion.div>
                )
              })}
              {period !== 'day' && weekdayData.length > 0 && (
                <div className="text-[11px] text-[var(--text-faint)] mt-1">
                  Лучший день —{' '}
                  <span className="text-[var(--text-dim)] font-semibold">
                    {weekdayData.reduce((m, d) => (d.minutes > m.minutes ? d : m), weekdayData[0]).label}
                  </span>
                  , {fmtDur(weekdayData.reduce((m, d) => (d.minutes > m.minutes ? d : m), weekdayData[0]).minutes)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {period !== 'day' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5">
          {period === 'year' || period === 'custom' ? (
            <HeatmapCard
              daily={activeDaily}
              title={period === 'year' ? 'Активность за год' : 'Активность за период'}
              sub={period === 'year' ? '365 дней' : `${activeDaily.length} дн`}
            />
          ) : (
            <GoalProgressCard avg={stats.avg} goal={goal} />
          )}
          <TopDaysCard daily={activeDaily} goal={goal} />
        </div>
      )}
    </div>
  )
}