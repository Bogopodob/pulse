import { useCallback, useMemo } from 'react'
import { AreaChart } from '../shared/ui/charts/area-chart'
import { Area } from '../shared/ui/charts/area'
import { Grid } from '../shared/ui/charts/grid'
import { XAxis } from '../shared/ui/charts/x-axis'
import { ChartTooltip } from '../shared/ui/charts/tooltip/chart-tooltip'
import type { TooltipRow } from '../shared/ui/charts/tooltip/tooltip-content'

function fmtDur(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
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

export function Stats() {
  const data = useMemo(() => mockFocusData(30), [])

  const stats = useMemo(() => {
    const today = data[data.length - 1].minutes
    const avg = Math.round(data.reduce((s, d) => s + d.minutes, 0) / data.length)
    const best = data.reduce((m, d) => Math.max(m, d.minutes), 0)
    return { today, avg, best }
  }, [data])

  const rows = useCallback(
    (point: Record<string, unknown>): TooltipRow[] => [
      { color: 'var(--chart-line-primary)', label: 'Фокус', value: fmtDur(Number(point.minutes)) },
    ],
    [],
  )

  const pills = [
    { key: 'today', label: 'Фокус сегодня', value: fmtDur(stats.today), color: 'var(--focus)', glow: '76,141,255' },
    { key: 'avg', label: 'В среднем за день', value: fmtDur(stats.avg), color: 'var(--lunch)', glow: '79,212,196' },
    { key: 'best', label: 'Лучший день', value: fmtDur(stats.best), color: 'var(--rest)', glow: '255,157,92' },
  ]

  return (
    <div className="w-full flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {pills.map((p) => (
          <div key={p.key} className="card card-lift relative overflow-hidden p-5">
            <div
              className="absolute -top-10 -right-10 w-36 h-36 rounded-full pointer-events-none"
              style={{ background: `radial-gradient(circle, rgba(${p.glow},0.14), transparent 70%)` }}
            />
            <div className="text-[11px] uppercase tracking-[0.1em] font-semibold text-[var(--text-faint)]">{p.label}</div>
            <div className="font-[var(--font-display)] text-[26px] font-semibold mt-2 tabular-nums" style={{ color: p.color, textShadow: `0 0 24px rgba(${p.glow},0.35)` }}>
              {p.value}
            </div>
          </div>
        ))}
      </div>

      <div className="card card-lift p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-[var(--font-display)] text-[15.5px] font-semibold">Фокус за 30 дней</h3>
          <span className="text-[11px] text-[var(--text-faint)] font-mono">минуты глубокой работы</span>
        </div>
        <AreaChart data={data} xDataKey="date" style={{ height: 320 }}>
          <Grid horizontal />
          <Area dataKey="minutes" fill="var(--chart-line-primary)" fillOpacity={0.3} strokeWidth={2} />
          <XAxis numTicks={6} />
          <ChartTooltip rows={rows} />
        </AreaChart>
      </div>
    </div>
  )
}