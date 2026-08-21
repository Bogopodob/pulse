import { useState, useEffect } from 'react'
import { TitleBar } from '../widgets/TitleBar'
import { Sidebar } from '../widgets/Sidebar'
import { Today } from '../pages/Today'
import { Schedule } from '../pages/Schedule'
import { Stats } from '../pages/Stats'
import { Settings } from '../pages/Settings'
import { Templates } from '../pages/Templates'
import { DEFAULT_RULES } from '../entities/rhythm/activities'
import type { Rule } from '../entities/rhythm/activities'
import { fmtClock } from '../shared/lib/date'
import { useSettings } from '../shared/hooks/useSettings'
import { useTemplates } from '../entities/templates/useTemplates'
import { markAppWarm } from '../shared/lib/boot'

type Page = 'today' | 'schedule' | 'stats' | 'settings' | 'templates'

const PAGES: Page[] = ['today', 'schedule', 'stats', 'settings', 'templates']

const pageMeta: Record<Page, { title: string; desc: string }> = {
  today: { title: 'Сегодня', desc: 'Ближайшее событие и ритм всего дня в одном месте' },
  schedule: { title: 'Расписание', desc: 'Проекты и задачи на временной шкале' },
  stats: { title: 'Статистика', desc: 'Продуктивность и прогресс за всё время' },
  settings: { title: 'Настройки', desc: 'Профиль, параметры и подключённые сервисы' },
  templates: { title: 'Шаблоны', desc: 'Графики дня для разных дней недели' },
}

const paneClass: Record<Page, string> = {
  today: 'w-full',
  schedule: '-mx-6 sm:-mx-8 md:-mx-10 flex-1 flex flex-col min-h-0',
  stats: 'mx-auto w-full max-w-[1400px]',
  settings: 'w-full',
  templates: 'w-full',
}

function App() {
  const [page, setPage] = useState<Page>('today')
  const [visited, setVisited] = useState<Record<Page, boolean>>({ today: true, schedule: false, stats: false, settings: false, templates: false })
  const [layoutWarm, setLayoutWarm] = useState(false)
  /* Счётчик визитов: для Статистики используется как key — при каждом заходе
     страница монтируется заново и анимации графиков проигрываются снова. */
  const [visitSeq, setVisitSeq] = useState<Record<Page, number>>({ today: 0, schedule: 0, stats: 0, settings: 0, templates: 0 })
  const [clockStr, setClockStr] = useState('')
  const [fallbackRules, setFallbackRules] = useState<Rule[]>(DEFAULT_RULES)
  const { timezone, timeFormat, dateFormat, chainStartMin } = useSettings()
  const { templates, activeTemplate, isOverridden, selectForToday, updateTemplate } = useTemplates()

  const openPage = (p: Page) => {
    if (page !== p) setVisitSeq((s) => ({ ...s, [p]: s[p] + 1 }))
    setPage(p)
    if (!visited[p]) {
      /* Тяжёлую первую отрисовку страницы откладываем на следующий кадр:
         сначала мгновенно переключаем вкладку, потом монтируем контент. */
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisited((v) => (v[p] ? v : { ...v, [p]: true }))
        })
      })
    }
  }

  /* Прогрев в два этапа, пока виден сплэш:
     1) монтируем страницы по одной (тяжёлый JS-рендер размазан по кадрам);
     2) на пару кадров показываем все панели за сплэшем — браузер просчитывает
        layout, GanttTimeline замеряет ширину и центрируется на «сегодня»,
        входные анимации карточек доигрывают. В итоге первый клик по любой
        вкладке — мгновенный composite без пересчёта геометрии. */
  useEffect(() => {
    const rest = PAGES.filter((p) => p !== 'today')
    let i = 0
    let rafId = 0
    let timer = 0
    let cancelled = false
    const step = () => {
      if (cancelled) return
      if (i >= rest.length) {
        rafId = requestAnimationFrame(() => {
          if (cancelled) return
          setLayoutWarm(true)
          timer = window.setTimeout(() => {
            if (cancelled) return
            setLayoutWarm(false)
            rafId = requestAnimationFrame(() => {
              if (!cancelled) markAppWarm()
            })
          }, 150)
        })
        return
      }
      const p = rest[i++]
      setVisited((v) => (v[p] ? v : { ...v, [p]: true }))
      timer = window.setTimeout(step, 40)
    }
    rafId = requestAnimationFrame(step)
    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      window.clearTimeout(timer)
    }
  }, [])

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

  return (
    <div className="h-dvh w-screen flex flex-col">
      <TitleBar />

      <div className="flex-1 flex min-h-0">
        <Sidebar page={page} onPageChange={openPage} />

        <main className="flex-1 min-w-0 flex flex-col p-6 sm:p-8 md:p-10 overflow-y-auto gap-5">
          {PAGES.map((p) => (
            <div
              key={p}
              className={`${paneClass[p]} page-pane${page === p ? ' active' : ''}${page === p || layoutWarm ? '' : ' hidden'}`}
            >
              {visited[p] && p === 'today' && (
                <Today
                  title={pageMeta[p].title}
                  desc={pageMeta[p].desc}
                  rules={activeRules}
                  chainStart={chainStart}
                  onRulesChange={setActiveRules}
                  clockStr={clockStr}
                  templates={templates}
                  activeTemplateId={activeTemplate?.id ?? null}
                  isOverridden={isOverridden}
                  onSelectTemplate={selectForToday}
                  onOpenTemplates={() => openPage('templates')}
                />
              )}
              {visited[p] && p === 'schedule' && (
                <Schedule title={pageMeta[p].title} desc={pageMeta[p].desc} clockStr={clockStr} />
              )}
              {visited[p] && p === 'stats' && <Stats key={`stats-${visitSeq.stats}`} />}
              {visited[p] && p === 'settings' && <Settings />}
              {visited[p] && p === 'templates' && <Templates onBack={() => openPage('today')} />}
            </div>
          ))}
        </main>
      </div>
    </div>
  )
}

export default App
