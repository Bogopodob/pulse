import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TitleBar } from './components/TitleBar'
import { Sidebar } from './components/Sidebar'
import { NextUp } from './components/NextUp'
import { Timeline } from './components/Timeline'
import { TodayTasks } from './components/TodayTasks'
import { GanttTimeline } from './components/GanttTimeline'
import { RuleChips } from './components/RuleChips'
import { Toast } from './components/Toast'
import { useRhythm } from './hooks/useRhythm'
import { DEFAULT_RULES, ACCENTS } from './lib/activities'
import type { Rule } from './lib/activities'

const days = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

type Page = 'today' | 'schedule' | 'stats'

const pageMeta: Record<Page, { title: string; desc: string }> = {
  today: { title: 'Сегодня', desc: 'Ближайшее событие и ритм всего дня в одном месте' },
  schedule: { title: 'Расписание', desc: 'Проекты и задачи на временной шкале' },
  stats: { title: 'Статистика', desc: 'Продуктивность и прогресс за всё время' },
}

function App() {
  const [rules, setRules] = useState<Rule[]>(DEFAULT_RULES)
  const rhythm = useRhythm(rules)
  const [page, setPage] = useState<Page>('today')
  const [clockStr, setClockStr] = useState('')

  useEffect(() => {
    function update() {
      const d = new Date()
      const hh = String(d.getHours()).padStart(2, '0')
      const mm = String(d.getMinutes()).padStart(2, '0')
      setClockStr(`${hh}:${mm} · ${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`)
    }
    update()
    const id = setInterval(update, 30000)
    return () => clearInterval(id)
  }, [])

  const meta = pageMeta[page]

  const todayStatus = (() => {
    const a = ACCENTS[rhythm.cur.color as keyof typeof ACCENTS] ?? ACCENTS.blue
    if (rhythm.cur.type === 'off')
      return { label: 'Вне графика', color: 'var(--text-faint)', bg: 'var(--surface-2)', border: 'var(--stroke)' }
    return { label: rhythm.cur.label, color: a.color, bg: a.bg, border: a.border }
  })()

  return (
    <div className="h-dvh w-screen flex flex-col">
      <TitleBar status={rhythm.resting ? 'rest' : rhythm.cur.type === 'off' ? 'idle' : 'focus'} />

      <div className="flex-1 flex min-h-0">
        <Sidebar page={page} onPageChange={setPage} />

        <main className="flex-1 min-w-0 flex flex-col p-6 sm:p-8 md:p-10 overflow-y-auto gap-5">
          <AnimatePresence mode="wait">
            {page === 'today' && (
              <motion.div
                key="today"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="w-full"
              >
                <div className="relative flex items-end justify-between">
                  <div>
                    <h1 className="font-[var(--font-display)] text-[24px] font-semibold tracking-[-0.02em]">{meta.title}</h1>
                    <p className="text-[13px] text-[var(--text-dim)] mt-1">{meta.desc}</p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-full"
                      style={{ background: todayStatus.bg, border: `1px solid ${todayStatus.border}`, color: todayStatus.color }}
                    >
                      <span
                        className="size-[6px] rounded-full"
                        style={{ background: todayStatus.color, boxShadow: `0 0 7px ${todayStatus.color}`, animation: 'nu-glow-pulse 3.2s ease-in-out infinite' }}
                      />
                      {todayStatus.label}
                    </div>
                    <div className="text-[12px] text-[var(--text-dim)] bg-[var(--surface)] border border-[var(--stroke)] px-3 py-1.5 rounded-full tabular-nums">
                      {clockStr}
                    </div>
                  </div>
                </div>
                <div className="relative grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-5 items-stretch mt-5">
                  <div className="absolute inset-0 overflow-hidden rounded-[24px] pointer-events-none" aria-hidden="true">
                    <div className="aurora-blob a1" />
                    <div className="aurora-blob a2" />
                  </div>
                  <div className="relative z-[1] min-w-0 order-1"><NextUp rhythm={rhythm} /></div>
                  <div className="relative z-[1] min-w-0 order-2"><Timeline rhythm={rhythm} /></div>
                  <div className="relative z-[1] min-w-0 order-3"><TodayTasks rhythm={rhythm} /></div>
                  <div className="relative z-[1] min-w-0 order-4"><RuleChips rules={rules} onChange={setRules} /></div>
                </div>
              </motion.div>
            )}

            {page === 'schedule' && (
              <motion.div
                key="schedule"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="-mx-6 sm:-mx-8 md:-mx-10 flex-1 flex flex-col min-h-0"
              >
                <div className="flex items-end justify-between px-6 sm:px-8 md:px-10 pb-3">
                  <div>
                    <h1 className="font-[var(--font-display)] text-[24px] font-semibold tracking-[-0.02em]">{meta.title}</h1>
                    <p className="text-[13px] text-[var(--text-dim)] mt-1">{meta.desc}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-[11px] text-[var(--text-faint)]">
                      <span className="w-[8px] h-[8px] inline-block rounded-full" style={{ background: '#ff5a1f', boxShadow: '0 0 8px rgba(255,90,31,0.6)' }} />
                      сегодня
                    </div>
                    <div className="text-[12px] text-[var(--text-dim)] bg-[var(--surface)] border border-[var(--stroke)] px-3 py-1.5 rounded-full tabular-nums">
                      {clockStr}
                    </div>
                  </div>
                </div>
                <GanttTimeline />
              </motion.div>
            )}

            {page === 'stats' && (
              <motion.div
                key="stats"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="max-w-3xl mx-auto w-full flex items-center justify-center h-[200px]"
              >
                <div className="text-center">
                  <div className="text-[32px] font-[var(--font-display)] font-semibold text-[var(--text-faint)]">—</div>
                  <p className="text-[13px] text-[var(--text-dim)] mt-2">Статистика появится после накопления данных</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {rhythm.toast && <Toast title={rhythm.toast.title} text={rhythm.toast.text} />}
      </AnimatePresence>
    </div>
  )
}

export default App
