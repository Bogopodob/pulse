import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TitleBar } from '../widgets/TitleBar'
import { Sidebar } from '../widgets/Sidebar'
import { Today } from '../pages/Today'
import { Schedule } from '../pages/Schedule'
import { Stats } from '../pages/Stats'
import { Settings } from '../pages/Settings'
import { Templates } from '../pages/Templates'
import { AddTaskForm } from '../features/tasks/ui/AddTaskForm'
import { useTasks } from '../entities/tasks/useTasks'
import { DEFAULT_RULES } from '../entities/rhythm/activities'
import type { Rule } from '../entities/rhythm/activities'
import { fmtClock } from '../shared/lib/date'
import { useSettings } from '../shared/hooks/useSettings'
import { useTemplates } from '../entities/templates/useTemplates'

type Page = 'today' | 'schedule' | 'stats' | 'settings' | 'templates' | 'new-task'

const pageMeta: Record<Page, { title: string; desc: string }> = {
  today: { title: 'Сегодня', desc: 'Ближайшее событие и ритм всего дня в одном месте' },
  schedule: { title: 'Расписание', desc: 'Проекты и задачи на временной шкале' },
  stats: { title: 'Статистика', desc: 'Продуктивность и прогресс за всё время' },
  settings: { title: 'Настройки', desc: 'Профиль, параметры и подключённые сервисы' },
  templates: { title: 'Шаблоны', desc: 'Графики дня для разных дней недели' },
  'new-task': { title: 'Новая задача', desc: 'Создание групповой задачи с участниками' },
}

function App() {
  const [page, setPage] = useState<Page>('today')
  const [clockStr, setClockStr] = useState('')
  const [fallbackRules, setFallbackRules] = useState<Rule[]>(DEFAULT_RULES)
  const { timezone, timeFormat, dateFormat, chainStartMin } = useSettings()
  const { templates, activeTemplate, isOverridden, selectForToday, updateTemplate } = useTemplates()
  const { tasks, addTask, projects, addProject } = useTasks()

  useEffect(() => {
    function update() {
      setClockStr(fmtClock(new Date(), { timezone, timeFormat, dateFormat }))
    }
    update()
    const id = setInterval(update, 30000)
    return () => clearInterval(id)
  }, [timezone, timeFormat, dateFormat])

  const activeRules = activeTemplate ? activeTemplate.rules : fallbackRules
  const tplChainStart =
    activeTemplate && !activeTemplate.inheritSettings && activeTemplate.chainStartMin != null
      ? activeTemplate.chainStartMin
      : null
  const chainStart = tplChainStart ?? chainStartMin

  const setActiveRules = (rs: Rule[]) => {
    if (activeTemplate) {
      updateTemplate(activeTemplate.id, { rules: rs })
    } else {
      setFallbackRules(rs)
    }
  }

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
                <Today
                  title={meta.title}
                  desc={meta.desc}
                  rules={activeRules}
                  chainStart={chainStart}
                  onRulesChange={setActiveRules}
                  clockStr={clockStr}
                  templates={templates}
                  activeTemplateId={activeTemplate?.id ?? null}
                  isOverridden={isOverridden}
                  onSelectTemplate={selectForToday}
                  onOpenTemplates={() => setPage('templates')}
                />
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
                <Schedule
                  title={meta.title}
                  desc={meta.desc}
                  clockStr={clockStr}
                  onNewTask={() => setPage('new-task')}
                />
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

{page === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="w-full"
              >
                <Settings />
              </motion.div>
            )}

            {page === 'new-task' && (
              <motion.div
                key="new-task"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="w-full max-w-[920px] mx-auto"
              >
                <AddTaskForm
                  initialDay={new Date(2026, 7, 21)}
                  tasks={tasks}
                  projects={projects}
                  onAdd={(data) => {
                    addTask(data)
                    setPage('schedule')
                  }}
                  onAddProject={addProject}
                  onBack={() => setPage('schedule')}
                />
              </motion.div>
            )}

            {page === 'templates' && (
              <motion.div
                key="templates"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="w-full"
              >
                <Templates onBack={() => setPage('today')} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

export default App