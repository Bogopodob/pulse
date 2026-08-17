import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TitleBar } from '../widgets/TitleBar'
import { Sidebar } from '../widgets/Sidebar'
import { Today } from '../pages/Today'
import { Schedule } from '../pages/Schedule'
import { Stats } from '../pages/Stats'
import { DEFAULT_RULES } from '../entities/rhythm/activities'
import type { Rule } from '../entities/rhythm/activities'

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

  return (
    <div className="h-dvh w-screen flex flex-col">
      <TitleBar />

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
                <Today title={meta.title} desc={meta.desc} rules={rules} onRulesChange={setRules} clockStr={clockStr} />
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
                <Schedule title={meta.title} desc={meta.desc} clockStr={clockStr} />
              </motion.div>
            )}

            {page === 'stats' && (
              <motion.div
                key="stats"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="mx-auto w-full max-w-[1400px]"
              >
                <Stats />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

export default App