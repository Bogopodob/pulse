import { useCallback, useMemo, useState } from 'react'
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

function mockDaily(days: number): { date: Date; minutes: number }[] {
  const now = new Date()
  const out: { date: Date; minutes: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const weekend = d.getDay() === 0 || d.getDay() === 6
    const j = days - 1 - i
    const trend = 330 + j * 0.9
    const wave = Math.sin(j * 0.9) * 50 + Math.cos(j * 0.45) * 30
    out.push({ date: d, minutes: Math.max(90, Math.round((weekend ? 230 : trend) + wave)) })
  }
  return out
}

const HOUR_CURVE = [0, 35, 55, 70, 45, 30, 65, 80, 55, 40, 25, 10, 0]

function mockHours() {
  return HOUR_CURVE.map((minutes, i) => ({
    label: `${String(9 + i).padStart(2, '0')}:00`,
    minutes,
  }))
}

function dayDistribution() {
  const sums = { focus: 0, break: 0, food: 0 }
  for (const r of DEFAULT_RULES) {
    if (r.type === 'focus') sums.focus += r.minutes
    else if (['break', 'smoke', 'rest'].includes(r.type)) sums.break += r.minutes
    else if (['lunch', 'breakfast', 'dinner'].includes(r.type)) sums.food += r.minutes
  }
  const off = 1440 - sums.focus - sums.break - sums.food
  return { ...sums, off }
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

function rulesWithTimes(chainStart: number) {
  let t = chainStart
  return DEFAULT_RULES.map((r) => {
    const start = t
    t += r.minutes
    return { ...r, start, end: t }
  })
}

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
  const today = useMemo(() => new Date(), [])
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29)
    return isoDate(d)
  })
  const [customTo, setCustomTo] = useState(() => isoDate(today))

  const { dailyGoalMin: goal, chainStartMin } = useSettings()
  const pool = useMemo(() => mockDaily(400), [])
  const hours = useMemo(() => mockHours(), [])
  const day = useMemo(() => dayDistribution(), [])
  const rules = useMemo(() => rulesWithTimes(chainStartMin), [chainStartMin])

  const activeDaily = useMemo(() => {
    switch (period) {
      case 'day':
        return pool.slice(-1)
      case 'week':
        return pool.slice(-7)
      case 'month':
        return pool.slice(-30)
      case 'year':
        return pool.slice(-365)
      case 'custom': {
        const from = new Date(`${customFrom}T00:00:00`)
        const to = new Date(`${customTo}T00:00:00`)
        if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) return []
        const days = Math.min(400, Math.round((to.getTime() - from.getTime()) / 86400000) + 1)
        return pool.slice(-days)
      }
    }
  }, [period, pool, customFrom, customTo])

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
      const peak = hours.reduce((m, h) => (h.minutes > m.minutes ? h : m), hours[0])
      const avg30 = Math.round(pool.slice(-30).reduce((s, d) => s + d.minutes, 0) / 30)
      return { total, avg: avg30, best: peak.minutes, bestLabel: peak.label }
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
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            <span className="text-[12px] text-[var(--text-faint)]">—</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {pills.map((p) => (
          <div key={p.label} className="card card-lift relative overflow-hidden p-5">
            <div
              className="absolute -top-10 -right-10 w-36 h-36 rounded-full pointer-events-none"
              style={{ background: `radial-gradient(circle, rgba(${p.glow},0.14), transparent 70%)` }}
            />
            <div className="text-[10.5px] uppercase tracking-[0.1em] font-semibold text-[var(--text-faint)]">{p.label}</div>
            <div
              className="font-[var(--font-display)] text-[24px] font-semibold mt-2 tabular-nums"
              style={{ color: p.color, textShadow: `0 0 24px rgba(${p.glow},0.35)` }}
            >
              {p.value}
            </div>
          </div>
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
            <div className="flex flex-col gap-2.5">
              {rules.map((r) => {
                const acc = ACCENTS[r.color]
                const pct = Math.round((r.minutes / goal) * 100)
                return (
                  <div key={r.id} className="flex items-center gap-3">
                    <span
                      className="size-2 rounded-full shrink-0"
                      style={{ background: `rgb(${acc.glow})`, boxShadow: `0 0 6px rgb(${acc.glow})` }}
                    />
                    <span className="text-[12px] text-[var(--text)] w-[110px] truncate shrink-0">{r.name}</span>
                    <div className="flex-1 h-[6px] rounded-full bg-[var(--surface-3)] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, pct)}%`,
                          background: `rgb(${acc.glow})`,
                          boxShadow: `0 0 8px rgb(${acc.glow})aa`,
                        }}
                      />
                    </div>
                    <span className="font-mono text-[11px] text-[var(--text-dim)] tabular-nums w-[86px] text-right shrink-0">
                      {fmtHM(r.start)}–{fmtHM(r.end)}
                    </span>
                    <span className="font-mono text-[11px] font-semibold tabular-nums w-[44px] text-right shrink-0" style={{ color: `rgb(${acc.glow})` }}>
                      {r.minutes}м
                    </span>
                  </div>
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
            <RingChart data={ringData} size={260}>
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
            <div className="flex flex-col gap-3">
              {ringData.map((r) => (
                <div key={r.label} className="flex items-center gap-2.5">
                  <div className="w-[74px] text-[11px] text-[var(--text-dim)]">{r.label}</div>
                  <div className="w-[120px] h-[5px] rounded-full overflow-hidden bg-[var(--surface-3)]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (r.value / r.maxValue) * 100)}%`,
                        background: r.color,
                        boxShadow: `0 0 8px ${r.color}aa`,
                      }}
                    />
                  </div>
                  <div className="font-mono text-[11px] font-semibold tabular-nums" style={{ color: r.color }}>
                    {fmtDur(r.value)}
                    <span className="text-[var(--text-faint)] font-normal"> / {fmtDur(r.maxValue)}</span>
                  </div>
                </div>
              ))}
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