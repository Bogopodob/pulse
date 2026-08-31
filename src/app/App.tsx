import { useState, useEffect, useCallback, useRef, memo } from 'react'

import { TitleBar } from '../widgets/TitleBar'
import { Sidebar } from '../widgets/Sidebar'
import { Today } from '../pages/Today'
import { Schedule } from '../pages/Schedule'
import { Stats } from '../pages/Stats'
import { Settings } from '../pages/Settings'
import { Templates } from '../pages/Templates'
import type { Rule } from '../entities/rhythm/activities'
import { fmtClock } from '../shared/lib/date'
import { useSettings } from '../shared/hooks/useSettings'
import { useTemplates, dateKeyOf } from '../entities/templates/useTemplates'
import { markAppWarm } from '../shared/lib/boot'

const CUSTOM_DAY_RULES_KEY = 'pulse-custom-day-rules'

function loadCustomDayRules(): Record<string, Rule[]> {
  try {
    const raw = localStorage.getItem(CUSTOM_DAY_RULES_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const out: Record<string, Rule[]> = {}
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(k) && Array.isArray(v)) {
          const rules = (v as unknown[]).filter(
            (r): r is Rule =>
              !!r && typeof (r as Rule).id === 'string' && typeof (r as Rule).minutes === 'number',
          )
          out[k] = rules as Rule[]
        }
      }
      return out
    }
    return {}
  } catch {
    return {}
  }
}

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
  templates: 'w-full flex-1 min-h-0',
}

/* Мемоизация страниц: при клике по вкладке ре-рендерится только обёртка панели,
   тяжёлые деревья (таймлайн, графики) не перестраиваются — переключение мгновенное. */
const MemoToday = memo(Today)
const MemoSchedule = memo(Schedule)
const MemoStats = memo(Stats)
const MemoSettings = memo(Settings)
const MemoTemplates = memo(Templates)

function App() {
  const mainRef = useRef<HTMLElement>(null)
  const [page, setPage] = useState<Page>('today')
  const [isWindowExpanded, setIsWindowExpanded] = useState(false)
  const [visited, setVisited] = useState<Record<Page, boolean>>({ today: true, schedule: false, stats: false, settings: false, templates: false })
  const [layoutWarm, setLayoutWarm] = useState(false)
  /* Счётчик визитов: для Статистики используется как key — при каждом заходе
     страница монтируется заново и анимации графиков проигрываются снова. */
  const [visitSeq, setVisitSeq] = useState<Record<Page, number>>({ today: 0, schedule: 0, stats: 0, settings: 0, templates: 0 })
  const [clockStr, setClockStr] = useState('')
  const [customDayRules, setCustomDayRules] = useState<Record<string, Rule[]>>(() => loadCustomDayRules())
  const [viewingDateKey, setViewingDateKey] = useState<string>(() => dateKeyOf(new Date()))
  const { timezone, timeFormat, dateFormat, chainStartMin } = useSettings()
  const { templates, overrides, selectForToday, assignWeekday, setDayOverride, updateTemplate, createTemplate, getTemplateForDate, isOverriddenForDate } = useTemplates()

  const pageRef = useRef(page)
  pageRef.current = page
  const visitedRef = useRef(visited)
  visitedRef.current = visited

  const openPage = useCallback((p: Page) => {
    if (pageRef.current !== p) setVisitSeq((s) => ({ ...s, [p]: s[p] + 1 }))
    setPage(p)
    if (!visitedRef.current[p]) {
      /* Тяжёлую первую отрисовку страницы откладываем на следующий кадр:
         сначала мгновенно переключаем вкладку, потом монтируем контент. */
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisited((v) => (v[p] ? v : { ...v, [p]: true }))
        })
      })
    }
  }, [])

  const openTemplates = useCallback(() => openPage('templates'), [openPage])
  const backToToday = useCallback(() => openPage('today'), [openPage])

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_DAY_RULES_KEY, JSON.stringify(customDayRules))
    } catch {
      /* ignore */
    }
  }, [customDayRules])

  const todayKey = dateKeyOf(new Date())

  const setActiveRules = useCallback(
    (rs: Rule[]) => {
      const tpl = getTemplateForDate(viewingDateKey)
      if (tpl) {
        updateTemplate(tpl.id, { rules: rs })
      } else {
        setCustomDayRules((prev) => ({ ...prev, [viewingDateKey]: rs }))
      }
    },
    [viewingDateKey, getTemplateForDate, updateTemplate],
  )

  const clearActiveDayRules = useCallback(() => {
    setCustomDayRules((prev) => {
      if (!(viewingDateKey in prev)) return prev
      const next = { ...prev }
      delete next[viewingDateKey]
      return next
    })
  }, [viewingDateKey])

  const handleCreateTemplateFromCurrent = useCallback(async () => {
    const tplForView = getTemplateForDate(viewingDateKey)
    const curRules = tplForView ? tplForView.rules : (customDayRules[viewingDateKey] ?? [])
    const tpl = await createTemplate({
      name: 'Новый шаблон',
      days: [],
      rules: curRules.map((r) => ({ ...r, id: crypto.randomUUID() })),
      inheritSettings: true,
    })
    // применяем новый шаблон на просматриваемую дату
    setDayOverride(viewingDateKey, tpl.id)
    openPage('templates')
  }, [viewingDateKey, getTemplateForDate, customDayRules, createTemplate, setDayOverride, openPage])

  // когда меняется today (полночь) — возвращаемся к сегодня, если смотрели сегодня
  useEffect(() => {
    const id = setInterval(() => {
      const nowK = dateKeyOf(new Date())
      if (nowK !== todayKey) {
        // если смотрели сегодня, переключить на новый today
        setViewingDateKey((prev) => (prev === todayKey ? nowK : prev))
      }
    }, 60_000)
    return () => clearInterval(id)
  }, [todayKey])

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

  /* Вкладки делят общий скролл-контейнер: возвращаем его наверх
     при переключении вкладки И при ресайзе окна — иначе после
     разворота из маленького окна страница остаётся «уехавшей» вверх. */
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [page])

  useEffect(() => {
    const onResize = () => mainRef.current?.scrollTo({ top: 0 })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    function update() {
      setClockStr(fmtClock(new Date(), { timezone, timeFormat, dateFormat }))
    }
    update()
    const id = setInterval(update, 30000)
    return () => clearInterval(id)
  }, [timezone, timeFormat, dateFormat])

  // --- viewing date (для календаря: выбрал 12 число → смотрим его правила) ---
  const viewingActiveTemplate = getTemplateForDate(viewingDateKey)
  const viewingIsOverridden = isOverriddenForDate(viewingDateKey)
  const viewingRules = viewingActiveTemplate ? viewingActiveTemplate.rules : (customDayRules[viewingDateKey] ?? [])
  const viewingTplChainStart =
    viewingActiveTemplate && !viewingActiveTemplate.inheritSettings && viewingActiveTemplate.chainStartMin != null
      ? viewingActiveTemplate.chainStartMin
      : null
  const viewingChainStart = viewingTplChainStart ?? chainStartMin

  // заголовок для просматриваемой даты
  const viewingTitle = (() => {
    if (viewingDateKey === todayKey) return pageMeta.today.title
    const d = new Date(viewingDateKey + 'T12:00:00')
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
  })()
  const viewingDesc = viewingDateKey === todayKey ? pageMeta.today.desc : `Правила на ${viewingDateKey.split('-').reverse().join('.')} — без шаблона для этого числа`

  const handleSelectTemplateForViewing = useCallback(
    (templateId: string | null | 'none') => {
      const val = templateId === 'none' ? null : templateId
      // если смотрим сегодня — используем selectForToday (удаляет override), иначе — setDayOverride
      if (viewingDateKey === todayKey) {
        if (val === null && templateId === null) selectForToday(null)
        else if (templateId === 'none') selectForToday('none' as const)
        else if (val) selectForToday(val)
        else selectForToday(val as string | null)
      } else {
        setDayOverride(viewingDateKey, val as string | null | undefined)
      }
    },
    [viewingDateKey, todayKey, selectForToday, setDayOverride],
  )

  const handleViewingDateChange = useCallback((k: string) => setViewingDateKey(k), [])

  // Discord-like: показываем TitleBar только после расширения окна + прячем скроллы на старте
  useEffect(() => {
    let cancelled = false
    // сразу прячем скроллы, пока окно маленькое 380×380
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    if (mainRef.current) mainRef.current.style.overflow = 'hidden'
    import('../shared/lib/boot').then(({ appWarm, dataReady }) => {
      Promise.all([appWarm, dataReady]).then(() => {
        if (!cancelled) setIsWindowExpanded(true)
      })
      // Fallback: если что-то зависло, всё равно показываем через 3с
      setTimeout(() => { if (!cancelled) setIsWindowExpanded(true) }, 3000)
    })
    // также слушаем событие от hideBootSplash
    const onExpanded = () => {
      setIsWindowExpanded(true)
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
      if (mainRef.current) mainRef.current.style.overflow = ''
    }
    window.addEventListener('pulse:window-expanded', onExpanded as EventListener)
    return () => {
      cancelled = true
      window.removeEventListener('pulse:window-expanded', onExpanded as EventListener)
    }
  }, [])

  const [showScroll, setShowScroll] = useState(false)
  useEffect(() => {
    // На время сплэша и прогрева — полностью прячем скроллы, иначе на 380×380 видны вертикальные/горизонтальные
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.body.style.background = isWindowExpanded ? '#0a0b0e' : 'transparent'
    document.documentElement.style.background = isWindowExpanded ? '#0a0b0e' : 'transparent'
    if (mainRef.current) {
      mainRef.current.style.overflowY = 'hidden'
      mainRef.current.style.overflowX = 'hidden'
    }
    // После расширения и прогрева — плавно показываем скролл
    if (isWindowExpanded && !layoutWarm) {
      const t = setTimeout(() => {
        setShowScroll(true)
        if (mainRef.current) {
          mainRef.current.style.overflowY = 'auto'
          mainRef.current.style.overflowX = 'hidden'
        }
      }, 600)
      return () => clearTimeout(t)
    } else {
      setShowScroll(false)
      if (mainRef.current) {
        mainRef.current.style.overflowY = 'hidden'
        mainRef.current.style.overflowX = 'hidden'
      }
    }
  }, [isWindowExpanded, layoutWarm])

  return (
    <div
      className="h-dvh w-screen flex flex-col overflow-hidden"
      style={{
        background: isWindowExpanded ? 'var(--bg)' : 'transparent',
        borderRadius: isWindowExpanded ? 0 : 20,
        overflow: 'hidden',
        boxShadow: isWindowExpanded ? 'none' : '0 20px 60px rgba(0,0,0,0.15)',
        // Плавное увеличение углов до стандартных при расширении (Discord-like)
        transition: 'border-radius 0.45s ease, box-shadow 0.45s ease, background 0.3s ease',
      }}
    >
      {isWindowExpanded && <TitleBar />}

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <Sidebar page={page} onPageChange={openPage} />

        <main
          ref={mainRef}
          className={`flex-1 min-w-0 flex flex-col p-6 sm:p-8 md:p-10 gap-5 ${!isWindowExpanded ? 'hidden' : ''}`}
          style={{ overflowY: (showScroll ? 'auto' : 'hidden') as React.CSSProperties['overflowY'], overflowX: 'hidden' as const, opacity: isWindowExpanded ? 1 : 0, transition: 'opacity 0.35s ease' }}
        >
          {PAGES.map((p) => (
            <div
              key={p}
              className={`${paneClass[p]} page-pane${page === p ? ' active' : ''}${page === p || layoutWarm ? '' : ' hidden'}`}
            >
              {visited[p] && p === 'today' && (
                <MemoToday
                  title={viewingTitle}
                  desc={viewingDesc}
                  viewingDateKey={viewingDateKey}
                  todayKey={todayKey}
                  onSelectViewingDate={handleViewingDateChange}
                  rules={viewingRules}
                  chainStart={viewingChainStart}
                  onRulesChange={setActiveRules}
                  onClearDayRules={clearActiveDayRules}
                  onCreateTemplateFromCurrent={handleCreateTemplateFromCurrent}
                  clockStr={clockStr}
                  templates={templates}
                  activeTemplateId={viewingActiveTemplate?.id ?? null}
                  isOverridden={viewingIsOverridden}
                  overrides={overrides}
                  onSelectTemplate={handleSelectTemplateForViewing}
                  onAssignWeekday={assignWeekday}
                  onSetDateOverride={(k, v) => {
                    setDayOverride(k, v)
                    // сразу переключаем просмотр на выбранную дату
                    setViewingDateKey(k)
                  }}
                  onOpenTemplates={openTemplates}
                />
              )}
              {visited[p] && p === 'schedule' && (
                <MemoSchedule title={pageMeta[p].title} desc={pageMeta[p].desc} clockStr={clockStr} />
              )}
              {visited[p] && p === 'stats' && <MemoStats key={`stats-${visitSeq.stats}`} />}
              {visited[p] && p === 'settings' && <MemoSettings />}
              {visited[p] && p === 'templates' && <MemoTemplates onBack={backToToday} />}
            </div>
          ))}
        </main>
      </div>
    </div>
  )
}

export default App
