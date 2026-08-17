import { useCallback, useMemo } from 'react'
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
import { DEFAULT_RULES } from '../entities/rhythm/activities'

const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

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

function mockFocusData(days: number) {
  const out: { date: Date; minutes: number }[] = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const weekend = d.getDay() === 0 || d.getDay() === 6
    const trend = 320 + (days - i) * 3.2
    const wave = Math.sin(i * 0.9) * 55 + Math.cos(i * 0.45) * 30
    const minutes = Math.max(90, Math.round((weekend ? 230 : trend) + wave))
    out.push({ date: d, minutes })
  }
  return out
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

export function Stats() {
  const data = useMemo(() => mockFocusData(30), [])

  const stats = useMemo(() => {
    const total30 = data.reduce((s, d) => s + d.minutes, 0)
    const today = data[data.length - 1].minutes
    const avg = Math.round(total30 / data.length)
    const best = data.reduce((m, d) => Math.max(m, d.minutes), 0)
    return { total30, today, avg, best }
  }, [data])

  const weekdayData = useMemo(() => {
    const sums = new Array(7).fill(0)
    const counts = new Array(7).fill(0)
    for (const d of data) {
      const wd = (d.date.getDay() + 6) % 7
      sums[wd] += d.minutes
      counts[wd] += 1
    }
    return WEEKDAYS_SHORT.map((label, i) => ({
      label,
      minutes: Math.round(sums[i] / Math.max(1, counts[i])),
    }))
  }, [data])

  const day = useMemo(() => dayDistribution(), [])

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
      { label: 'Фокус', value: day.focus, maxValue: 480, color: C_FOCUS },
      { label: 'Паузы', value: day.break, maxValue: 150, color: C_REST },
      { label: 'Еда', value: day.food, maxValue: 120, color: C_FOOD },
    ],
    [day],
  )

  const bestWeekday = useMemo(() => {
    const i = weekdayData.reduce((m, d, idx) => (d.minutes > weekdayData[m].minutes ? idx : m), 0)
    return weekdayData[i]
  }, [weekdayData])

  const streak = useMemo(() => {
    let cur = 0
    let best = 0
    for (const d of data) {
      cur = d.minutes >= 360 ? cur + 1 : 0
      best = Math.max(best, cur)
    }
    return best
  }, [data])

  const focusRows = useCallback(
    (point: Record<string, unknown>): TooltipRow[] => [
      { color: 'var(--chart-line-primary)', label: 'Фокус', value: fmtDur(Number(point.minutes)) },
    ],
    [],
  )

  const barRows = useCallback(
    (point: Record<string, unknown>): TooltipRow[] => [
      { color: C_FOCUS, label: 'Средний фокус', value: fmtDur(Number(point.minutes)) },
    ],
    [],
  )

  const pills = [
    { key: 'today', label: 'Фокус сегодня', value: fmtDur(stats.today), color: C_FOCUS, glow: '76,141,255' },
    { key: 'avg', label: 'В среднем за день', value: fmtDur(stats.avg), color: C_FOOD, glow: '79,212,196' },
    { key: 'best', label: 'Лучший день', value: fmtDur(stats.best), color: C_REST, glow: '255,157,92' },
    { key: 'streak', label: 'Серия ≥ 6 ч', value: `${streak} дн`, color: C_OTHER, glow: '167,139,250' },
  ]

  return (
    <div className="w-full flex flex-col gap-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {pills.map((p) => (
          <div key={p.key} className="card card-lift relative overflow-hidden p-5">
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
            <h3 className="font-[var(--font-display)] text-[15.5px] font-semibold">Фокус за 30 дней</h3>
            <span className="text-[11px] text-[var(--text-faint)] font-mono">{fmtDur(stats.total30)} всего</span>
          </div>
          <AreaChart data={data} xDataKey="date" aspectRatio="2.2 / 1" style={{ minHeight: 250 }}>
            <Grid horizontal />
            <Area dataKey="minutes" fill="var(--chart-line-primary)" fillOpacity={0.3} strokeWidth={2} />
            <XAxis numTicks={6} />
            <ChartTooltip rows={focusRows} />
          </AreaChart>
        </div>

        <div className="card card-lift p-6">
          <h3 className="font-[var(--font-display)] text-[15.5px] font-semibold">Из чего состоит день</h3>
          <div className="flex items-center justify-center py-4">
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
              <div className="text-[11px] text-[var(--text-faint)] mt-1">
                Лучший день — <span className="text-[var(--text-dim)] font-semibold">{bestWeekday.label}</span>, {fmtDur(bestWeekday.minutes)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}