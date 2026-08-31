import { useEffect, useMemo, useState } from 'react'
import { fmtHM } from '../entities/rhythm/useRhythm'
import { useTasks } from '../entities/tasks/useTasks'

/** Минута суток для тикера актуальности. */
function nowOfDay(): number {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

export function TodayTasks() {
  const { tasks, loadDay } = useTasks()
  const [loading, setLoading] = useState(false)
  const [nowMinutes, setNowMinutes] = useState(nowOfDay)

  /* Срез задач на сегодня из БД: SQL-фильтр по границам дня (в Tauri), иначе localStorage. */
  useEffect(() => {
    setLoading(true)
    loadDay(new Date())
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [loadDay])

  /* Тикер: каждые 30с, пауза во hidden экономит CPU */
  useEffect(() => {
    let id: number | null = null
    const tick = () => {
      if (document.hidden) return
      setNowMinutes(nowOfDay())
    }
    id = window.setInterval(tick, 30_000)
    const onVis = () => { if (!document.hidden) tick() }
    document.addEventListener('visibilitychange', onVis)
    return () => { if (id) clearInterval(id); document.removeEventListener('visibilitychange', onVis) }
  }, [])

  /* Границы сегодняшнего дня + задачи, пересекающиеся с ним. */
  const today = useMemo(() => {
    const base = new Date()
    const start = new Date(base.getFullYear(), base.getMonth(), base.getDate()).getTime()
    const end = start + 86_400_000 - 1
    return tasks
      .filter((t) => t.startDate.getTime() <= end && t.endDate.getTime() >= start)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .map((t) => {
        const sMin = t.startDate.getTime() <= start ? 0 : t.startMinute
        const eMin = t.endDate.getTime() >= end ? 1440 : t.endMinute
        return { id: t.id, title: t.title, sMin, eMin }
      })
  }, [tasks])

  const done = useMemo(() => today.filter((t) => t.eMin <= nowMinutes).length, [today, nowMinutes])

  const goTo = (min: number) => {
    window.dispatchEvent(new CustomEvent('rhythm:go-to', { detail: { min } }))
  }

  return (
    <div className="card card-lift relative z-[1] overflow-hidden">
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--focus)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M8 3v4M16 3v4M3 10h18M9 15l2 2 4-4" />
          </svg>
          <h3 className="font-[var(--font-display)] text-[15.5px] font-semibold">Задачи на сегодня</h3>
        </div>
        {today.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[var(--text-faint)] tabular-nums">{done} из {today.length}</span>
            <div className="w-[64px] h-[3px] rounded-full bg-[var(--surface-2)] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.round((done / today.length) * 100)}%`,
                  background: 'linear-gradient(90deg, var(--focus), var(--focus-2))',
                  boxShadow: '0 0 6px rgba(76,141,255,0.6)',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {today.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2.5 px-6 py-10 border-t border-[var(--stroke)]">
          <div
            className="flex items-center justify-center size-[40px] rounded-full"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--stroke)' }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </div>
          <div className="text-[13px] font-semibold text-[var(--text-dim)]">
            {loading ? 'Загрузка задач…' : 'Ближайших задач нет'}
          </div>
          {!loading && (
            <div className="text-[11px] text-[var(--text-faint)]">
              Создайте задачу на странице «Расписание» — она появится здесь
            </div>
          )}
        </div>
      ) : (
        <div>
          {today.map((t, i) => {
            const status = t.eMin <= nowMinutes ? 'done' : t.sMin <= nowMinutes ? 'active' : 'upcoming'
            const pct = Math.max(2, Math.round(((nowMinutes - t.sMin) / Math.max(1, t.eMin - t.sMin)) * 100))
            return (
              <button
                key={t.id}
                onClick={() => goTo(t.sMin)}
                className={`w-full flex items-center gap-3.5 px-6 py-2.5 text-left cursor-pointer transition-colors border-t border-[var(--stroke)] first:border-t-0 ${status === 'active' ? 'bg-[rgba(76,141,255,0.05)]' : 'hover:bg-[var(--surface-2)]'} ${status === 'done' ? 'opacity-55' : ''}`}
              >
                <div
                  className="shrink-0 flex items-center justify-center size-[26px] rounded-full border"
                  style={
                    status === 'done'
                      ? { background: 'rgba(120,200,120,0.12)', borderColor: 'rgba(120,200,120,0.3)', color: '#7ee787' }
                      : status === 'active'
                        ? { background: 'rgba(76,141,255,0.12)', borderColor: 'rgba(76,141,255,0.3)', color: 'var(--focus)' }
                        : { background: 'var(--surface-2)', borderColor: 'var(--stroke)', color: 'var(--text-faint)' }
                  }
                >
                  {status === 'done' ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 12.5l5 5L20 6.5" />
                    </svg>
                  ) : status === 'active' ? (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  ) : (
                    <span className="text-[10.5px] font-semibold font-mono">{i + 1}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div
                    className="text-[13px] font-semibold truncate"
                    style={{ color: status === 'upcoming' ? 'var(--text-dim)' : 'var(--text)', textDecoration: status === 'done' ? 'line-through' : 'none' }}
                  >
                    {t.title}
                  </div>
                  <div className={`text-[11px] font-mono mt-0.5 ${status === 'active' ? 'text-[var(--focus)]' : 'text-[var(--text-faint)]'}`}>
                    {fmtHM(t.sMin)}–{fmtHM(t.eMin)}
                  </div>
                </div>

                {status === 'active' && (
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(76,141,255,0.1)', border: '1px solid rgba(76,141,255,0.25)', color: 'var(--focus)' }}
                    >
                      сейчас
                    </span>
                    <div className="w-[56px] h-[3px] rounded-full bg-[var(--surface-2)] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--focus), var(--focus-2))' }}
                      />
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
